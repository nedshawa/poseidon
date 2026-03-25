#!/usr/bin/env bun
/**
 * setup.ts — First-time Poseidon secret store setup
 * Run before first use: bun tools/setup.ts
 * Configures encryption, collects API keys selectively
 */

import { createInterface } from "readline";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "fs";
import { join, dirname, resolve } from "path";
import { homedir } from "os";
import { execSync, spawnSync } from "child_process";
import { randomBytes } from "crypto";

// ---------------------------------------------------------------------------
// Paths — derive from POSEIDON_DIR or default
// ---------------------------------------------------------------------------

const POSEIDON_DIR = process.env.POSEIDON_DIR || join(homedir(), ".poseidon");

function poseidonPath(...segments: string[]): string {
  return join(POSEIDON_DIR, ...segments);
}

function getSettingsPath(): string {
  return poseidonPath("settings.json");
}

function loadSettings(): Record<string, any> {
  try { return JSON.parse(readFileSync(getSettingsPath(), "utf-8")); }
  catch { return {}; }
}

function getAgeKeyPath(): string {
  const s = loadSettings();
  return s?.security?.age_key_path || join(homedir(), ".config", "poseidon", "age-key.txt");
}

// ---------------------------------------------------------------------------
// Service catalog — parsed from security/services.yaml
// ---------------------------------------------------------------------------

interface ServiceDef {
  id: string;
  name: string;
  fields: string[];
  purpose: string;
  docs: string;
}

interface ServiceCategory {
  label: string;
  key: string;
  services: ServiceDef[];
}

function loadServiceCatalog(): ServiceCategory[] {
  const yamlPath = poseidonPath("security", "services.yaml");
  if (!existsSync(yamlPath)) {
    console.error(`  services.yaml not found at ${yamlPath}`);
    process.exit(1);
  }
  const raw = readFileSync(yamlPath, "utf-8");
  const categories: ServiceCategory[] = [];
  const labels: Record<string, string> = {
    research: "Research", ai_models: "AI Models", design: "Design",
    voice: "Voice", finance: "Finance", infrastructure: "Infrastructure",
  };

  let currentCat = "";
  let currentService: Partial<ServiceDef> = {};

  for (const line of raw.split("\n")) {
    const catMatch = line.match(/^  (\w+):$/);
    if (catMatch) { currentCat = catMatch[1]; categories.push({ label: labels[currentCat] || currentCat, key: currentCat, services: [] }); continue; }
    const idMatch = line.match(/^\s+- id:\s*(\S+)/);
    if (idMatch) { currentService = { id: idMatch[1] }; continue; }
    const nameMatch = line.match(/^\s+name:\s*(.+)/);
    if (nameMatch && currentService.id) { currentService.name = nameMatch[1].trim(); continue; }
    const fieldsMatch = line.match(/^\s+fields:\s*\[(.+)\]/);
    if (fieldsMatch && currentService.id) { currentService.fields = fieldsMatch[1].split(",").map(f => f.trim()); continue; }
    const purposeMatch = line.match(/^\s+purpose:\s*(.+)/);
    if (purposeMatch && currentService.id) { currentService.purpose = purposeMatch[1].trim(); continue; }
    const docsMatch = line.match(/^\s+docs:\s*(.+)/);
    if (docsMatch && currentService.id) {
      currentService.docs = docsMatch[1].trim();
      const cat = categories[categories.length - 1];
      if (cat) cat.services.push(currentService as ServiceDef);
      currentService = {};
    }
  }
  return categories;
}

function allServices(cats: ServiceCategory[]): ServiceDef[] {
  return cats.flatMap(c => c.services);
}

// ---------------------------------------------------------------------------
// Terminal I/O — runs OUTSIDE Claude Code, so stty works
// ---------------------------------------------------------------------------

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(prompt: string): Promise<string> {
  return new Promise(res => rl.question(`  ${prompt}`, answer => res(answer.trim())));
}

function readSecret(prompt: string): string {
  process.stdout.write(`  ${prompt}: `);
  try { execSync("stty -echo < /dev/tty", { stdio: "ignore" }); } catch {}
  const result = spawnSync("bash", ["-c", 'read -r LINE < /dev/tty && echo -n "$LINE"'], {
    stdio: ["pipe", "pipe", "inherit"],
  });
  try { execSync("stty echo < /dev/tty", { stdio: "ignore" }); } catch {}
  process.stdout.write("\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\n");
  return result.stdout.toString().trim();
}

// ---------------------------------------------------------------------------
// Age encryption helpers
// ---------------------------------------------------------------------------

function checkAge(): boolean {
  try { execSync("which age", { stdio: "pipe" }); return true; } catch { return false; }
}

function ensureAgeKey(): string | null {
  const keyPath = getAgeKeyPath();
  if (existsSync(keyPath)) {
    console.log(`  Age key exists: ${keyPath}`);
    return keyPath;
  }
  console.log("  Generating age key pair...");
  const keyDir = dirname(keyPath);
  if (!existsSync(keyDir)) mkdirSync(keyDir, { recursive: true });
  try {
    execSync(`age-keygen -o "${keyPath}" 2>&1`, { stdio: "pipe" });
    execSync(`chmod 600 "${keyPath}"`, { stdio: "pipe" });
    const content = readFileSync(keyPath, "utf-8");
    const pub = content.match(/public key: (age1[a-z0-9]+)/);
    console.log(`  Key generated: ${keyPath}`);
    if (pub) console.log(`  Public key: ${pub[1]}`);
    return keyPath;
  } catch (err) {
    console.error(`  Failed to generate key: ${err}`);
    return null;
  }
}

function ensureSecretsEnc(keyPath: string): void {
  const encPath = poseidonPath("secrets.enc");
  if (existsSync(encPath)) return;
  const content = readFileSync(keyPath, "utf-8");
  const pub = content.match(/public key: (age1[a-z0-9]+)/);
  if (!pub) return;
  try {
    execSync(`echo '{}' | age -r "${pub[1]}" -o "${encPath}"`, { stdio: "pipe" });
    console.log(`  Created empty secrets.enc`);
  } catch {}
}

function storeKey(keyPath: string, service: string, field: string, value: string): boolean {
  const encPath = poseidonPath("secrets.enc");
  const shmDir = existsSync("/dev/shm") ? "/dev/shm" : "/tmp";
  const tmpFile = join(shmDir, `poseidon-setup-${randomBytes(6).toString("hex")}.json`);

  try {
    // Decrypt existing
    if (existsSync(encPath)) {
      try { execSync(`age -d -i "${keyPath}" "${encPath}" > "${tmpFile}"`, { stdio: "pipe" }); }
      catch { writeFileSync(tmpFile, "{}"); }
    } else {
      writeFileSync(tmpFile, "{}");
    }

    // Merge
    const secrets = JSON.parse(readFileSync(tmpFile, "utf-8"));
    secrets[service] = { ...(secrets[service] || {}), [field]: value };
    writeFileSync(tmpFile, JSON.stringify(secrets, null, 2));

    // Re-encrypt
    const content = readFileSync(keyPath, "utf-8");
    const pub = content.match(/public key: (age1[a-z0-9]+)/);
    if (!pub) { cleanup(tmpFile); return false; }
    execSync(`age -r "${pub[1]}" -o "${encPath}" "${tmpFile}"`, { stdio: "pipe" });
    cleanup(tmpFile);
    return true;
  } catch (err) {
    cleanup(tmpFile);
    console.error(`  Failed to store: ${err}`);
    return false;
  }
}

function cleanup(path: string): void {
  try { execSync(`shred -u "${path}" 2>/dev/null`, { stdio: "ignore" }); } catch {}
  try { require("fs").unlinkSync(path); } catch {}
}

// ---------------------------------------------------------------------------
// Registry generation
// ---------------------------------------------------------------------------

function generateRegistry(stored: Map<string, string[]>, catalog: ServiceCategory[]): void {
  const registryPath = poseidonPath("security", "secrets-registry.md");
  const now = new Date().toISOString();
  const all = allServices(catalog);

  const availRows: string[] = [];
  const missingRows: string[] = [];

  for (const svc of all) {
    const storedFields = stored.get(svc.id);
    if (storedFields && storedFields.length > 0) {
      for (const f of storedFields) {
        availRows.push(`| ${svc.name} | ${svc.id} | ${f} | \u2713 active | ${now.split("T")[0]} |`);
      }
    } else {
      missingRows.push(`| ${svc.name} | ${svc.purpose} | \`bun tools/setup.ts\` or paste key in prompt |`);
    }
  }

  const content = `# Poseidon Secret Registry

Last updated: ${now}

## Available Secrets

| Service | Path | Field | Status | Added |
|---------|------|-------|--------|-------|
${availRows.join("\n")}

## Not Configured

| Service | Purpose | How to Add |
|---------|---------|------------|
${missingRows.join("\n")}

## Access

Use SecretClient: \`await client.read("service", "field")\`
To add: paste key naturally in prompt -- auto-captured by hook.
To setup: \`bun tools/setup.ts\`
`;

  const dir = dirname(registryPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(registryPath, content);
}

// ---------------------------------------------------------------------------
// Main setup flow
// ---------------------------------------------------------------------------

async function main() {
  console.log(`
  \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  \u2551   Poseidon \u2014 Secret Store Setup              \u2551
  \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d
`);

  // Step 1: Check age
  if (!checkAge()) {
    console.log("  age encryption is not installed.");
    console.log("    macOS:  brew install age");
    console.log("    Linux:  apt install age");
    console.log("    See: https://age-encryption.org");
    rl.close();
    process.exit(1);
  }

  // Step 2: Ensure key pair
  const keyPath = ensureAgeKey();
  if (!keyPath) { rl.close(); process.exit(1); }

  // Step 3: Ensure secrets.enc
  ensureSecretsEnc(keyPath);

  // Step 4: Load service catalog
  const catalog = loadServiceCatalog();
  const all = allServices(catalog);

  // Step 5: Show menu
  console.log("\n  Available services:\n");
  let num = 1;
  const numMap = new Map<number, ServiceDef>();
  for (const cat of catalog) {
    console.log(`  ${cat.label}:`);
    for (const svc of cat.services) {
      console.log(`    ${num.toString().padStart(2)}. ${svc.name} \u2014 ${svc.purpose}`);
      numMap.set(num, svc);
      num++;
    }
    console.log("");
  }

  const selection = await ask('Select (comma-separated numbers, "all", or Enter to skip): ');
  let selected: ServiceDef[] = [];

  if (selection.toLowerCase() === "all") {
    selected = all;
  } else if (selection) {
    const nums = selection.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    for (const n of nums) {
      const svc = numMap.get(n);
      if (svc) selected.push(svc);
    }
  }

  if (selected.length === 0) {
    console.log("\n  No services selected. Generating registry with current state...");
    generateRegistry(new Map(), catalog);
    console.log(`  Registry written: ${poseidonPath("security", "secrets-registry.md")}`);
    rl.close();
    return;
  }

  // Step 6: Collect keys for each selected service
  const stored = new Map<string, string[]>();
  console.log("");

  for (const svc of selected) {
    console.log(`  \u2500\u2500 ${svc.name} (${svc.docs})`);
    for (const field of svc.fields) {
      const value = readSecret(`${svc.name} ${field}`);
      if (!value) { console.log(`    Skipped ${field}`); continue; }
      const ok = storeKey(keyPath, svc.id, field, value);
      if (ok) {
        console.log(`    \u2713 ${svc.id}/${field} stored`);
        const fields = stored.get(svc.id) || [];
        fields.push(field);
        stored.set(svc.id, fields);
      } else {
        console.log(`    \u2717 ${svc.id}/${field} failed`);
      }
    }
    console.log("");
  }

  // Step 7: Generate registry
  generateRegistry(stored, catalog);

  // Step 8: Summary
  const total = Array.from(stored.values()).reduce((s, f) => s + f.length, 0);
  console.log(`  \u2550\u2550\u2550 Setup Complete \u2550\u2550\u2550`);
  console.log(`  ${total} secret(s) stored across ${stored.size} service(s)`);
  console.log(`  Registry: ${poseidonPath("security", "secrets-registry.md")}`);
  console.log(`  Encrypted: ${poseidonPath("secrets.enc")}`);
  console.log(`  Key: ${keyPath}\n`);

  rl.close();
}

main().catch(err => { console.error(err); rl.close(); process.exit(1); });
