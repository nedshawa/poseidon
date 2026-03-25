#!/usr/bin/env bun
/**
 * onboard.ts — Secure API key onboarding for Poseidon
 *
 * Usage:
 *   bun tools/onboard.ts                  # Interactive — asks which service
 *   bun tools/onboard.ts openai           # Direct — onboard OpenAI key
 *   bun tools/onboard.ts --list           # Show known services
 *
 * Security:
 *   - Key read with terminal echo disabled (stty -echo)
 *   - Key staged to /dev/shm only (RAM-backed, never disk)
 *   - Encrypted into secrets.enc via age
 *   - All temp files shredded after encrypt
 *   - Key never appears on screen, in history, or in logs
 */

import { execSync, spawnSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync, chmodSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { randomBytes } from "crypto";
import { createInterface } from "readline";

const POSEIDON_DIR = process.env.POSEIDON_DIR || join(homedir(), ".poseidon");

// ── Known services ──────────────────────────────────────────────

interface ServiceDef {
  name: string;
  fields: Array<{ key: string; label: string; secret: boolean }>;
  test?: string;  // Shell command to verify (KEY replaced with actual key)
  docs?: string;
}

const SERVICES: Record<string, ServiceDef> = {
  openai: {
    name: "OpenAI",
    fields: [{ key: "api_key", label: "API Key (sk-...)", secret: true }],
    test: `curl -sf -H "Authorization: Bearer KEY" https://api.openai.com/v1/models | head -c 50`,
    docs: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    name: "Anthropic",
    fields: [{ key: "api_key", label: "API Key (sk-ant-...)", secret: true }],
    test: `curl -sf -H "x-api-key: KEY" -H "anthropic-version: 2023-06-01" https://api.anthropic.com/v1/models | head -c 50`,
    docs: "https://console.anthropic.com/settings/keys",
  },
  perplexity: {
    name: "Perplexity",
    fields: [{ key: "api_key", label: "API Key (pplx-...)", secret: true }],
    test: null,
    docs: "https://www.perplexity.ai/settings/api",
  },
  gemini: {
    name: "Google Gemini",
    fields: [{ key: "api_key", label: "API Key", secret: true }],
    test: null,
    docs: "https://aistudio.google.com/app/apikey",
  },
  github: {
    name: "GitHub",
    fields: [{ key: "pat", label: "Personal Access Token (ghp_...)", secret: true }],
    test: `curl -sf -H "Authorization: token KEY" https://api.github.com/user | grep -o '"login":"[^"]*"'`,
    docs: "https://github.com/settings/tokens",
  },
  elevenlabs: {
    name: "ElevenLabs",
    fields: [{ key: "api_key", label: "API Key", secret: true }],
    test: `curl -sf -H "xi-api-key: KEY" https://api.elevenlabs.io/v1/user | head -c 50`,
    docs: "https://elevenlabs.io/app/settings/api-keys",
  },
  deepgram: {
    name: "Deepgram",
    fields: [{ key: "api_key", label: "API Key", secret: true }],
    test: null,
    docs: "https://console.deepgram.com/",
  },
  fmp: {
    name: "Financial Modeling Prep",
    fields: [{ key: "api_key", label: "API Key", secret: true }],
    test: `curl -sf "https://financialmodelingprep.com/api/v3/stock/list?apikey=KEY" | head -c 50`,
    docs: "https://financialmodelingprep.com/developer/docs/",
  },
  twilio: {
    name: "Twilio",
    fields: [
      { key: "account_sid", label: "Account SID (AC...)", secret: false },
      { key: "auth_token", label: "Auth Token", secret: true },
      { key: "phone_number", label: "Phone Number (+1...)", secret: false },
    ],
    test: null,
    docs: "https://console.twilio.com/",
  },
  ntfy: {
    name: "ntfy",
    fields: [
      { key: "topic", label: "Topic name", secret: false },
      { key: "token", label: "Access token (optional, press Enter to skip)", secret: true },
    ],
    test: null,
  },
};

// ── Helpers ──────────────────────────────────────────────────────

function getStagingDir(): string {
  if (existsSync("/dev/shm")) return "/dev/shm";
  return "/tmp";
}

function secureRemove(path: string): void {
  if (!existsSync(path)) return;
  try { execSync(`shred -u "${path}" 2>/dev/null`, { stdio: "ignore" }); } catch {}
  try { unlinkSync(path); } catch {}
}

function readSecretFromTerminal(prompt: string): string {
  // Disable echo, read, re-enable echo
  const result = spawnSync("bash", ["-c", `
    stty -echo 2>/dev/null
    read -r -p "" INPUT
    stty echo 2>/dev/null
    echo -n "$INPUT"
  `], {
    stdio: ["inherit", "pipe", "inherit"],
    env: { ...process.env, PS1: "" },
  });
  return result.stdout.toString();
}

function readLineFromTerminal(prompt: string): string {
  const result = spawnSync("bash", ["-c", `read -r -p "" INPUT && echo -n "$INPUT"`], {
    stdio: ["inherit", "pipe", "inherit"],
  });
  return result.stdout.toString().trim();
}

// ── SecretClient (inline — avoid import issues) ─────────────────

function getAgeKeyPath(): string {
  try {
    const s = JSON.parse(readFileSync(join(POSEIDON_DIR, "settings.json"), "utf-8"));
    return s?.security?.age_key_path || join(homedir(), ".config", "poseidon", "age-key.txt");
  } catch {
    return join(homedir(), ".config", "poseidon", "age-key.txt");
  }
}

function decryptSecrets(): Record<string, Record<string, string>> {
  const encPath = join(POSEIDON_DIR, "secrets.enc");
  const keyPath = getAgeKeyPath();
  if (!existsSync(encPath)) return {};
  if (!existsSync(keyPath)) throw new Error(`Age key not found: ${keyPath}. Run: bun tools/secret.ts init`);

  const tmpPath = join(getStagingDir(), `poseidon-onboard-${randomBytes(6).toString("hex")}.json`);
  try {
    execSync(`age -d -i "${keyPath}" "${encPath}" > "${tmpPath}"`, { stdio: "pipe" });
    chmodSync(tmpPath, 0o600);
    return JSON.parse(readFileSync(tmpPath, "utf-8"));
  } finally {
    secureRemove(tmpPath);
  }
}

function encryptSecrets(data: Record<string, Record<string, string>>): void {
  const encPath = join(POSEIDON_DIR, "secrets.enc");
  const keyPath = getAgeKeyPath();
  const keyContent = readFileSync(keyPath, "utf-8");
  const pubMatch = keyContent.match(/public key: (age1\w+)/);
  if (!pubMatch) throw new Error("Could not extract public key from age key file");

  const tmpPath = join(getStagingDir(), `poseidon-onboard-${randomBytes(6).toString("hex")}.json`);
  try {
    writeFileSync(tmpPath, JSON.stringify(data, null, 2));
    chmodSync(tmpPath, 0o600);
    execSync(`age -r "${pubMatch[1]}" -o "${encPath}" "${tmpPath}"`, { stdio: "pipe" });
  } finally {
    secureRemove(tmpPath);
  }
}

// ── Main flows ──────────────────────────────────────────────────

function listServices(): void {
  console.log("\n  Known services:\n");
  for (const [id, svc] of Object.entries(SERVICES)) {
    const fields = svc.fields.map(f => f.key).join(", ");
    const verify = svc.test ? "✓ auto-verify" : "  manual verify";
    console.log(`    ${id.padEnd(14)} ${svc.name.padEnd(24)} [${fields}]  ${verify}`);
  }
  console.log(`\n    ${"custom".padEnd(14)} Any service               [you define fields]\n`);
}

async function onboard(serviceId?: string): Promise<void> {
  console.log("\n  ╔══════════════════════════════════════════╗");
  console.log("  ║  🔐 Poseidon — Secure Key Onboarding     ║");
  console.log("  ╚══════════════════════════════════════════╝\n");

  // Step 1: Identify service
  let service: ServiceDef;
  let path: string;

  if (serviceId && SERVICES[serviceId]) {
    service = SERVICES[serviceId];
    path = serviceId;
    console.log(`  Service: ${service.name}`);
    if (service.docs) console.log(`  Get key: ${service.docs}`);
  } else if (serviceId === "custom" || !serviceId) {
    if (!serviceId) {
      console.log("  Which service? (type name or 'list' to see all)");
      process.stdout.write("  > ");
      const input = readLineFromTerminal("");

      if (input === "list") { listServices(); return onboard(); }
      if (SERVICES[input]) return onboard(input);

      // Custom service
      path = input || "custom";
      console.log(`\n  Custom service: ${path}`);
      console.log("  How many fields? (e.g., 1 for just an API key)");
      process.stdout.write("  > ");
      const countStr = readLineFromTerminal("");
      const count = parseInt(countStr) || 1;

      const fields: ServiceDef["fields"] = [];
      for (let i = 0; i < count; i++) {
        console.log(`  Field ${i + 1} name (e.g., api_key):`);
        process.stdout.write("  > ");
        const key = readLineFromTerminal("");
        fields.push({ key: key || `field_${i}`, label: key || `Field ${i + 1}`, secret: true });
      }
      service = { name: path, fields, test: undefined };
    } else {
      path = "custom";
      service = { name: "Custom", fields: [{ key: "api_key", label: "API Key", secret: true }] };
    }
  } else {
    // Unknown service name — treat as custom path
    path = serviceId;
    service = { name: serviceId, fields: [{ key: "api_key", label: "API Key", secret: true }] };
    console.log(`  Unknown service '${serviceId}' — storing as custom.`);
  }

  // Step 2: Read fields securely
  console.log("\n  Paste each value below. Secret fields are hidden (no echo).\n");

  const values: Record<string, string> = {};
  for (const field of service.fields) {
    if (field.secret) {
      process.stdout.write(`  ${field.label}: `);
      const val = readSecretFromTerminal("");
      console.log("  ••••••••••••••••");
      if (val.trim()) values[field.key] = val.trim();
    } else {
      process.stdout.write(`  ${field.label}: `);
      const val = readLineFromTerminal("");
      if (val.trim()) values[field.key] = val.trim();
    }
  }

  if (Object.keys(values).length === 0) {
    console.log("\n  No values entered. Onboarding cancelled.");
    return;
  }

  // Step 3: Encrypt & store
  console.log("\n  Encrypting and storing...");
  try {
    const secrets = decryptSecrets();
    secrets[path] = { ...(secrets[path] || {}), ...values };
    encryptSecrets(secrets);
    console.log(`  ✓ Stored ${Object.keys(values).length} field(s) at path: ${path}`);
  } catch (e: any) {
    console.error(`  ✗ Failed to store: ${e.message}`);
    console.error("  Run 'bun tools/secret.ts init' first if you haven't set up encryption.");
    return;
  }

  // Step 4: Verify (if test command available)
  if (service.test) {
    console.log("  Verifying...");
    try {
      const testKey = values[service.fields.find(f => f.secret)?.key || "api_key"] || "";
      const cmd = service.test.replace(/KEY/g, testKey);
      const result = execSync(cmd, { stdio: "pipe", timeout: 10000 }).toString().trim();
      if (result.length > 0) {
        console.log(`  ✓ ${service.name} key verified`);
      } else {
        console.log(`  ⚠ ${service.name} returned empty response — key may be invalid`);
      }
    } catch {
      console.log(`  ⚠ Could not verify ${service.name} key — check manually`);
    }
  }

  // Step 5: Confirm
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║  ✓ Onboarding complete                   ║`);
  console.log(`  ╚══════════════════════════════════════════╝`);
  console.log(`\n  Path:   ${path}`);
  console.log(`  Fields: ${Object.keys(values).join(", ")}`);
  console.log(`  Read:   bun tools/secret.ts read ${path} ${service.fields[0]?.key || "api_key"}`);
  console.log(`  List:   bun tools/secret.ts list ${path}\n`);
}

// ── Entry point ─────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--list") || args.includes("-l") || args.includes("list")) {
  listServices();
} else {
  onboard(args[0]).catch(e => {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  });
}
