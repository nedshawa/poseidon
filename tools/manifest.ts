#!/usr/bin/env bun
/**
 * manifest.ts — View and manage the Poseidon capability manifest
 *
 * Usage:
 *   bun tools/manifest.ts                       Show enabled capabilities summary
 *   bun tools/manifest.ts --list                 List all services with status
 *   bun tools/manifest.ts --enable <service>     Enable a service
 *   bun tools/manifest.ts --disable <service>    Disable a service
 *   bun tools/manifest.ts --backend <backend>    Switch secret backend
 *   bun tools/manifest.ts --json                 Output as JSON
 *   bun tools/manifest.ts --help                 Show help
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { parse, stringify } from "yaml";

// ── Path Resolution ─────────────────────────────────────────────

const SCRIPT_DIR = dirname(import.meta.path.replace("file://", ""));
const POSEIDON_DIR = process.env.POSEIDON_DIR || join(SCRIPT_DIR, "..");
const MANIFEST_PATH = join(POSEIDON_DIR, "poseidon-manifest.yaml");

// ── ANSI Colors ─────────────────────────────────────────────────

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[38;2;80;220;100m";
const RED = "\x1b[38;2;180;60;60m";
const CYAN = "\x1b[38;2;100;200;230m";
const GOLD = "\x1b[38;2;255;215;0m";
const GRAY = "\x1b[38;2;120;120;120m";
const WHITE = "\x1b[38;2;201;209;217m";

// ── Helpers ─────────────────────────────────────────────────────

function loadManifest(): any {
  const raw = readFileSync(MANIFEST_PATH, "utf8");
  return parse(raw);
}

function saveManifest(manifest: any): void {
  const yaml = stringify(manifest, { lineWidth: 0 });
  writeFileSync(MANIFEST_PATH, yaml, "utf8");
}

function recomputeCapabilities(manifest: any): void {
  const services = manifest.services || {};
  const enabled = Object.entries(services)
    .filter(([_, s]: [string, any]) => s.enabled)
    .map(([name, s]: [string, any]) => ({ name, ...s }));

  const research = enabled.filter(s => s.category === "research").map(s => s.name);
  const researchCount = research.length;
  const tier = researchCount >= 4 ? "extensive" : researchCount >= 2 ? "standard" : "quick";

  manifest.capabilities = {
    research_agents: research,
    research_tier_max: tier,
    voice_enabled: enabled.some(s => s.category === "voice"),
    notifications_enabled: enabled.some(s => s.category === "notifications"),
    finance_enabled: enabled.some(s => s.category === "finance"),
    design_enabled: enabled.some(s => s.category === "design"),
  };
}

// ── Commands ────────────────────────────────────────────────────

function showHelp(): void {
  console.log(`${CYAN}${BOLD}Poseidon Capability Manifest${RESET}

${WHITE}Usage:${RESET}
  bun tools/manifest.ts                       ${GRAY}Show enabled capabilities summary${RESET}
  bun tools/manifest.ts --list                 ${GRAY}List all services with status${RESET}
  bun tools/manifest.ts --enable <service>     ${GRAY}Enable a service${RESET}
  bun tools/manifest.ts --disable <service>    ${GRAY}Disable a service${RESET}
  bun tools/manifest.ts --backend <backend>    ${GRAY}Switch secret backend (age|vault|onepassword|bitwarden)${RESET}
  bun tools/manifest.ts --json                 ${GRAY}Output manifest as JSON${RESET}
  bun tools/manifest.ts --help                 ${GRAY}Show this help${RESET}`);
}

function showSummary(manifest: any): void {
  const services = manifest.services || {};
  const caps = manifest.capabilities || {};

  const enabledServices = Object.entries(services).filter(([_, s]: [string, any]) => s.enabled);
  const totalServices = Object.keys(services).length;

  console.log(`\n${GOLD}${BOLD}  ⚡ Poseidon Capabilities${RESET}\n`);
  console.log(`  ${WHITE}Secret backend:${RESET}  ${CYAN}${manifest.secrets?.backend || "none"}${RESET}`);
  console.log(`  ${WHITE}Services:${RESET}        ${GREEN}${enabledServices.length}${RESET} ${GRAY}/ ${totalServices} enabled${RESET}`);
  console.log(`  ${WHITE}Research tier:${RESET}   ${CYAN}${caps.research_tier_max || "none"}${RESET} ${GRAY}(${(caps.research_agents || []).join(", ") || "none"})${RESET}`);
  console.log(`  ${WHITE}Voice:${RESET}           ${caps.voice_enabled ? `${GREEN}active${RESET}` : `${DIM}inactive${RESET}`}`);
  console.log(`  ${WHITE}Notifications:${RESET}   ${caps.notifications_enabled ? `${GREEN}active${RESET}` : `${DIM}inactive${RESET}`}`);
  console.log(`  ${WHITE}Finance data:${RESET}    ${caps.finance_enabled ? `${GREEN}active${RESET}` : `${DIM}inactive${RESET}`}`);
  console.log(`  ${WHITE}Design tools:${RESET}    ${caps.design_enabled ? `${GREEN}active${RESET}` : `${DIM}inactive${RESET}`}`);
  console.log();
}

function listServices(manifest: any): void {
  const services = manifest.services || {};
  const categories = new Map<string, [string, any][]>();

  for (const [name, svc] of Object.entries(services) as [string, any][]) {
    const cat = svc.category || "other";
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push([name, svc]);
  }

  console.log(`\n${GOLD}${BOLD}  ⚡ All Services${RESET}\n`);

  for (const [cat, svcs] of categories) {
    console.log(`  ${CYAN}${BOLD}${cat.toUpperCase().replace("_", " ")}${RESET}`);
    for (const [name, svc] of svcs) {
      const icon = svc.enabled ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
      const label = svc.enabled ? `${WHITE}${name}${RESET}` : `${DIM}${name}${RESET}`;
      const purpose = svc.enabled ? `${GRAY}${svc.purpose}${RESET}` : `${DIM}${svc.purpose}${RESET}`;
      console.log(`    ${icon}  ${label.padEnd(svc.enabled ? 30 : 42)}  ${purpose}`);
    }
    console.log();
  }
}

function toggleService(manifest: any, name: string, enabled: boolean): void {
  const services = manifest.services || {};
  if (!services[name]) {
    console.error(`${RED}Error: Unknown service "${name}"${RESET}`);
    console.error(`${GRAY}Available: ${Object.keys(services).join(", ")}${RESET}`);
    process.exit(1);
  }

  services[name].enabled = enabled;
  recomputeCapabilities(manifest);
  saveManifest(manifest);

  const status = enabled ? `${GREEN}enabled${RESET}` : `${RED}disabled${RESET}`;
  console.log(`${WHITE}${name}${RESET} → ${status}`);

  const caps = manifest.capabilities;
  console.log(`${GRAY}Research tier: ${caps.research_tier_max} | Voice: ${caps.voice_enabled} | Notifications: ${caps.notifications_enabled}${RESET}`);
}

function switchBackend(manifest: any, backend: string): void {
  const valid = ["age", "vault", "onepassword", "bitwarden"];
  if (!valid.includes(backend)) {
    console.error(`${RED}Error: Invalid backend "${backend}"${RESET}`);
    console.error(`${GRAY}Valid backends: ${valid.join(", ")}${RESET}`);
    process.exit(1);
  }

  manifest.secrets.backend = backend;
  saveManifest(manifest);
  console.log(`${WHITE}Secret backend${RESET} → ${CYAN}${backend}${RESET}`);
}

// ── Main ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const manifest = loadManifest();

if (args.includes("--help") || args.includes("-h")) {
  showHelp();
} else if (args.includes("--json")) {
  console.log(JSON.stringify(manifest, null, 2));
} else if (args.includes("--list") || args.includes("-l")) {
  listServices(manifest);
} else if (args.includes("--enable")) {
  const idx = args.indexOf("--enable");
  const name = args[idx + 1];
  if (!name) { console.error(`${RED}Usage: --enable <service>${RESET}`); process.exit(1); }
  toggleService(manifest, name, true);
} else if (args.includes("--disable")) {
  const idx = args.indexOf("--disable");
  const name = args[idx + 1];
  if (!name) { console.error(`${RED}Usage: --disable <service>${RESET}`); process.exit(1); }
  toggleService(manifest, name, false);
} else if (args.includes("--backend")) {
  const idx = args.indexOf("--backend");
  const backend = args[idx + 1];
  if (!backend) { console.error(`${RED}Usage: --backend <age|vault|onepassword|bitwarden>${RESET}`); process.exit(1); }
  switchBackend(manifest, backend);
} else {
  showSummary(manifest);
}
