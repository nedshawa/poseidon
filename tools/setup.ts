#!/usr/bin/env bun
/**
 * setup.ts — First-time Poseidon secret store setup
 * Run before first use: bun tools/setup.ts
 * Configures encryption, collects API keys selectively
 */
import { createInterface } from "readline";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { execSync, spawnSync } from "child_process";
import { randomBytes } from "crypto";

const POSEIDON_DIR = process.env.POSEIDON_DIR || join(homedir(), ".poseidon");
const pp = (...s: string[]) => join(POSEIDON_DIR, ...s);
const loadSettings = (): any => { try { return JSON.parse(readFileSync(pp("settings.json"), "utf-8")); } catch { return {}; } };
const ageKeyPath = () => loadSettings()?.security?.age_key_path || join(homedir(), ".config", "poseidon", "age-key.txt");

interface Svc { id: string; name: string; fields: string[]; purpose: string; docs: string; }
interface Cat { label: string; services: Svc[]; }

function loadCatalog(): Cat[] {
  const yamlPath = pp("security", "services.yaml");
  if (!existsSync(yamlPath)) { console.error(`  services.yaml not found at ${yamlPath}`); process.exit(1); }
  const raw = readFileSync(yamlPath, "utf-8");
  const cats: Cat[] = [];
  const labels: Record<string, string> = { research: "Research", ai_models: "AI Models", design: "Design", voice: "Voice", finance: "Finance", infrastructure: "Infrastructure" };
  let cur: Partial<Svc> = {};
  for (const line of raw.split("\n")) {
    const cm = line.match(/^  (\w+):$/);
    if (cm) { cats.push({ label: labels[cm[1]] || cm[1], services: [] }); continue; }
    const im = line.match(/^\s+- id:\s*(\S+)/); if (im) { cur = { id: im[1] }; continue; }
    const nm = line.match(/^\s+name:\s*(.+)/); if (nm && cur.id) { cur.name = nm[1].trim(); continue; }
    const fm = line.match(/^\s+fields:\s*\[(.+)\]/); if (fm && cur.id) { cur.fields = fm[1].split(",").map(f => f.trim()); continue; }
    const pm = line.match(/^\s+purpose:\s*(.+)/); if (pm && cur.id) { cur.purpose = pm[1].trim(); continue; }
    const dm = line.match(/^\s+docs:\s*(.+)/);
    if (dm && cur.id) { cur.docs = dm[1].trim(); cats[cats.length - 1]?.services.push(cur as Svc); cur = {}; }
  }
  return cats;
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (p: string): Promise<string> => new Promise(r => rl.question(`  ${p}`, a => r(a.trim())));

function readSecret(prompt: string): string {
  process.stdout.write(`  ${prompt}: `);
  try { execSync("stty -echo < /dev/tty", { stdio: "ignore" }); } catch {}
  const res = spawnSync("bash", ["-c", 'read -r LINE < /dev/tty && echo -n "$LINE"'], { stdio: ["pipe", "pipe", "inherit"] });
  try { execSync("stty echo < /dev/tty", { stdio: "ignore" }); } catch {}
  process.stdout.write("\u2022".repeat(16) + "\n");
  return res.stdout.toString().trim();
}

function checkAge(): boolean { try { execSync("which age", { stdio: "pipe" }); return true; } catch { return false; } }

function ensureAgeKey(): string | null {
  const kp = ageKeyPath();
  if (existsSync(kp)) { console.log(`  Age key exists: ${kp}`); return kp; }
  console.log("  Generating age key pair...");
  const kd = dirname(kp);
  if (!existsSync(kd)) mkdirSync(kd, { recursive: true });
  try {
    execSync(`age-keygen -o "${kp}" 2>&1`, { stdio: "pipe" });
    execSync(`chmod 600 "${kp}"`, { stdio: "pipe" });
    const pub = readFileSync(kp, "utf-8").match(/public key: (age1[a-z0-9]+)/);
    console.log(`  Key generated: ${kp}`); if (pub) console.log(`  Public key: ${pub[1]}`);
    return kp;
  } catch (e) { console.error(`  Failed: ${e}`); return null; }
}

function getPub(kp: string): string | null {
  const m = readFileSync(kp, "utf-8").match(/public key: (age1[a-z0-9]+)/);
  return m ? m[1] : null;
}

function ensureSecretsEnc(kp: string): void {
  const ep = pp("secrets.enc");
  if (existsSync(ep)) return;
  const pub = getPub(kp); if (!pub) return;
  try { execSync(`echo '{}' | age -r "${pub}" -o "${ep}"`, { stdio: "pipe" }); console.log("  Created empty secrets.enc"); } catch {}
}

function storeKey(kp: string, svc: string, field: string, val: string): boolean {
  const ep = pp("secrets.enc"), shm = existsSync("/dev/shm") ? "/dev/shm" : "/tmp";
  const tmp = join(shm, `poseidon-setup-${randomBytes(6).toString("hex")}.json`);
  const rm = (f: string) => { try { execSync(`shred -u "${f}" 2>/dev/null`, { stdio: "ignore" }); } catch {} try { require("fs").unlinkSync(f); } catch {} };
  try {
    if (existsSync(ep)) { try { execSync(`age -d -i "${kp}" "${ep}" > "${tmp}"`, { stdio: "pipe" }); } catch { writeFileSync(tmp, "{}"); } }
    else writeFileSync(tmp, "{}");
    const secrets = JSON.parse(readFileSync(tmp, "utf-8"));
    secrets[svc] = { ...(secrets[svc] || {}), [field]: val };
    writeFileSync(tmp, JSON.stringify(secrets, null, 2));
    const pub = getPub(kp); if (!pub) { rm(tmp); return false; }
    execSync(`age -r "${pub}" -o "${ep}" "${tmp}"`, { stdio: "pipe" });
    rm(tmp); return true;
  } catch (e) { rm(tmp); console.error(`  Failed: ${e}`); return false; }
}

function genRegistry(stored: Map<string, string[]>, cats: Cat[]): void {
  const now = new Date().toISOString(), day = now.split("T")[0];
  const avail: string[] = [], miss: string[] = [];
  for (const cat of cats) for (const s of cat.services) {
    const sf = stored.get(s.id);
    if (sf?.length) sf.forEach(f => avail.push(`| ${s.name} | ${s.id} | ${f} | \u2713 active | ${day} |`));
    else miss.push(`| ${s.name} | ${s.purpose} | \`bun tools/setup.ts\` or paste key in prompt |`);
  }
  const dir = dirname(pp("security", "secrets-registry.md"));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(pp("security", "secrets-registry.md"), `# Poseidon Secret Registry\n\nLast updated: ${now}\n\n## Available Secrets\n\n| Service | Path | Field | Status | Added |\n|---------|------|-------|--------|-------|\n${avail.join("\n")}\n\n## Not Configured\n\n| Service | Purpose | How to Add |\n|---------|---------|------------|\n${miss.join("\n")}\n\n## Access\n\nUse SecretClient: \`await client.read("service", "field")\`\nTo add: paste key naturally in prompt -- auto-captured by hook.\nTo setup: \`bun tools/setup.ts\`\n`);
}

async function main() {
  console.log("\n  \u2554" + "\u2550".repeat(46) + "\u2557\n  \u2551   Poseidon \u2014 Secret Store Setup              \u2551\n  \u255a" + "\u2550".repeat(46) + "\u255d\n");
  if (!checkAge()) { console.log("  age not installed.\n    macOS: brew install age\n    Linux: apt install age"); rl.close(); process.exit(1); }
  const kp = ensureAgeKey(); if (!kp) { rl.close(); process.exit(1); }
  ensureSecretsEnc(kp);
  const cats = loadCatalog(), all = cats.flatMap(c => c.services);

  console.log("\n  Available services:\n");
  let num = 1; const nmap = new Map<number, Svc>();
  for (const cat of cats) {
    console.log(`  ${cat.label}:`);
    for (const s of cat.services) { console.log(`    ${String(num).padStart(2)}. ${s.name} \u2014 ${s.purpose}`); nmap.set(num++, s); }
    console.log("");
  }
  const sel = await ask('Select (comma-separated numbers, "all", or Enter to skip): ');
  let picked: Svc[] = [];
  if (sel.toLowerCase() === "all") picked = all;
  else if (sel) { for (const n of sel.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n))) { const s = nmap.get(n); if (s) picked.push(s); } }

  if (!picked.length) {
    console.log("\n  No services selected. Generating registry...");
    genRegistry(new Map(), cats);
    console.log(`  Registry: ${pp("security", "secrets-registry.md")}`);
    rl.close(); return;
  }

  const stored = new Map<string, string[]>(); console.log("");
  for (const svc of picked) {
    console.log(`  \u2500\u2500 ${svc.name} (${svc.docs})`);
    for (const field of svc.fields) {
      const val = readSecret(`${svc.name} ${field}`);
      if (!val) { console.log(`    Skipped ${field}`); continue; }
      if (storeKey(kp, svc.id, field, val)) {
        console.log(`    \u2713 ${svc.id}/${field} stored`);
        stored.set(svc.id, [...(stored.get(svc.id) || []), field]);
      } else console.log(`    \u2717 ${svc.id}/${field} failed`);
    }
    console.log("");
  }
  genRegistry(stored, cats);
  const total = Array.from(stored.values()).reduce((s, f) => s + f.length, 0);
  console.log(`  \u2550\u2550\u2550 Setup Complete \u2550\u2550\u2550`);
  console.log(`  ${total} secret(s) across ${stored.size} service(s)`);
  console.log(`  Registry: ${pp("security", "secrets-registry.md")}`);
  console.log(`  Encrypted: ${pp("secrets.enc")}\n`);
  rl.close();
}

main().catch(e => { console.error(e); rl.close(); process.exit(1); });
