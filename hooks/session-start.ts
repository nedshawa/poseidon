#!/usr/bin/env bun
// session-start.ts — Project picker, context loading, learning score, status line
// TRIGGER: SessionStart
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { getBaseDir, getSettingsPath, poseidonPath, TELOS_DIR, STEERING_RULES_PATH, PROJECTS_DIR, SKILLS_DIR, RULES_DIR, CANDIDATES_DIR, SECURITY_DIR } from "./lib/paths";
import { readHookInput } from "./lib/hook-io";

interface ProjectInfo { slug: string; name: string; lastUsed: Date; decisions: number; rules: number; stale: boolean; }

function safeRead(p: string): string | null {
  try { return existsSync(p) ? readFileSync(p, "utf-8") : null; } catch { return null; }
}
function loadSettings(): any {
  try { const r = safeRead(getSettingsPath()); return r ? JSON.parse(r) : {}; } catch { return {}; }
}
function countHeadings(dir: string, file: string): number {
  const raw = safeRead(join(dir, file));
  return raw ? (raw.match(/^## /gm) || []).length : 0;
}
function countDirs(dir: string, filter?: (n: string) => boolean): number {
  try {
    if (!existsSync(dir)) return 0;
    const e = readdirSync(dir).filter((n) => { if (n.startsWith(".")) return false; try { return statSync(join(dir, n)).isDirectory(); } catch { return false; } });
    return filter ? e.filter(filter).length : e.length;
  } catch { return 0; }
}
function parseMeta(dir: string) {
  const raw = safeRead(join(dir, "META.yaml"));
  if (!raw) return null;
  const get = (k: string) => { const m = raw.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, "m")); return m ? m[1].trim() : ""; };
  const status = get("status") || "active";
  if (status === "archived" || status === "complete") return null;
  return { name: get("name"), status, lastUsed: new Date(get("last_used") || get("created") || 0), desc: get("description") };
}
function loadProjects(): ProjectInfo[] {
  const dir = PROJECTS_DIR();
  if (!existsSync(dir)) return [];
  const out: ProjectInfo[] = [];
  try {
    for (const slug of readdirSync(dir)) {
      if (slug === ".template" || slug.startsWith(".")) continue;
      const d = join(dir, slug);
      try { if (!statSync(d).isDirectory()) continue; } catch { continue; }
      const meta = parseMeta(d);
      if (!meta) continue;
      out.push({ slug, name: meta.name || slug, lastUsed: meta.lastUsed, decisions: countHeadings(d, "DECISIONS.md"), rules: countHeadings(d, "RULES.md"), stale: (Date.now() - meta.lastUsed.getTime()) / 86_400_000 >= 14 });
    }
  } catch {}
  return out.sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
}
function timeAgo(d: Date): string {
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}
function buildPicker(projects: ProjectInfo[], active: string | null, agent: string): string {
  if (!projects.length) return "";
  const lines: string[] = [`\u26a1 ${agent} \u2014 Select Project\n`, "  Recent:"];
  let idx = 1;
  for (const p of projects.slice(0, 5)) {
    const a = p.slug === active ? " \u2190 active" : "";
    const s = p.stale ? " \u26a0 stale" : "";
    lines.push(`    ${idx}. ${p.slug} (${timeAgo(p.lastUsed)}) \u2502 ${p.decisions} decisions \u2502 ${p.rules} rules${a}${s}`);
    idx++;
  }
  if (projects.length > 5) {
    lines.push("\n  Other:");
    for (const p of projects.slice(5)) { lines.push(`    ${idx}. ${p.slug}${p.stale ? " \u26a0 stale" : ""}`); idx++; }
  }
  if (!projects.some((p) => p.slug === "_general")) lines.push(`\n    ${idx}. _general (global workspace)`);
  const name = active || projects[0]?.slug || "_general";
  lines.push(`\n  "continue" or just start working = stay on ${name}`, "  Type a number or project name to switch", '  "new" = create new project');
  return lines.join("\n");
}
function loadTelosFiles(): string {
  const dir = TELOS_DIR();
  const s: string[] = [];
  for (const f of ["MISSION.md", "GOALS.md", "PROJECTS.md"]) { const c = safeRead(join(dir, f)); if (c) s.push(`## ${f.replace(".md", "")}\n${c.trim()}`); }
  return s.length ? `# TELOS\n${s.join("\n\n")}` : "";
}
function loadProjectContext(id: string): string {
  const dir = join(PROJECTS_DIR(), id);
  const s: string[] = [];
  for (const f of ["CONTEXT.md", "RULES.md", "GOALS.md"]) { const c = safeRead(join(dir, f)); if (c) s.push(`## ${f.replace(".md", "")}\n${c.trim()}`); }
  return s.length ? `# Active Project: ${id}\n${s.join("\n\n")}` : "";
}
function loadSteeringRules(): string {
  const parts: string[] = [];
  // Tier 1: System rules (constitutional, immutable)
  const sys = safeRead(poseidonPath("rules", "system.md"));
  if (sys) parts.push(sys.trim());
  // Tier 2: User rules (personal, user-managed, MUST EXIST even if empty)
  const usr = safeRead(poseidonPath("rules", "user.md"));
  if (usr && usr.trim().length > 0) parts.push(usr.trim());
  // Tier 3: Learned rules summary (from memory/steering-rules.md, rebuilt from approved rules)
  const learned = safeRead(STEERING_RULES_PATH());
  if (learned && !learned.includes("No steering rules yet")) parts.push(learned.trim());
  return parts.length ? `# Steering Rules\n${parts.join("\n\n---\n\n")}` : "";
}
function loadLearning(): { display: string; score: number; calibrating: boolean } {
  try {
    const { computeMetrics, formatScoreDisplay } = require("./handlers/learning-metrics");
    const m = computeMetrics();
    return { display: formatScoreDisplay(m), score: m.learningScore, calibrating: m.calibrating };
  } catch { return { display: "Learning: Calibrating... (no data yet)", score: 0, calibrating: true }; }
}
function avgRating(): string {
  try {
    const raw = safeRead(poseidonPath("memory", "learning", "signals", "ratings.jsonl"));
    if (!raw) return "\u2014";
    const lines = raw.split("\n").filter(Boolean).slice(-10);
    let sum = 0, n = 0;
    for (const l of lines) { try { const r = JSON.parse(l).rating; if (typeof r === "number") { sum += r; n++; } } catch {} }
    return n > 0 ? (sum / n).toFixed(1) : "\u2014";
  } catch { return "\u2014"; }
}
function gitInfo(): { branch: string; changes: number } {
  try {
    const branch = execSync("git branch --show-current 2>/dev/null", { encoding: "utf-8" }).trim() || "none";
    const changes = parseInt(execSync("git status --porcelain 2>/dev/null | wc -l", { encoding: "utf-8" }).trim()) || 0;
    return { branch, changes };
  } catch { return { branch: "none", changes: 0 }; }
}
function contextBar(pct: number): string {
  const f = Math.round(pct / 10);
  return "\u2588".repeat(f) + "\u2591".repeat(10 - f);
}
function countTodayErrors(): number {
  try {
    const raw = safeRead(poseidonPath("memory", "learning", "error-log.jsonl"));
    if (!raw) return 0;
    const today = new Date().toISOString().split("T")[0];
    return raw.split("\n").filter((l) => l.includes(today)).length;
  } catch { return 0; }
}

function loadSecretsSummary(): string {
  try {
    const registryPath = poseidonPath("security", "secrets-registry.md");
    if (!existsSync(registryPath)) return "";
    const content = readFileSync(registryPath, "utf-8");
    const available: string[] = [];
    for (const line of content.split("\n")) {
      if (line.includes("\u2713 active")) {
        const match = line.match(/\|\s*(\S+)\s*\|\s*(\S+)\s*\|\s*(\S+)\s*\|/);
        if (match) available.push(match[2]);
      }
    }
    // Read services.yaml for all known service ids
    const missing: string[] = [];
    try {
      const yamlPath = poseidonPath("security", "services.yaml");
      if (existsSync(yamlPath)) {
        const yaml = readFileSync(yamlPath, "utf-8");
        const ids: string[] = [];
        for (const line of yaml.split("\n")) {
          const m = line.match(/^\s+- id:\s*(\S+)/);
          if (m) ids.push(m[1]);
        }
        for (const id of ids) {
          if (!available.includes(id)) missing.push(id);
        }
      }
    } catch {}
    if (available.length === 0 && missing.length === 0) return "";
    const avail = available.map(s => `\u2713 ${s}`).join("  ");
    const miss = missing.map(s => `\u2717 ${s}`).join("  ");
    return `\ud83d\udd10 Secrets: ${avail}${miss ? "  " + miss : ""}\nAccess: SecretClient.read("service", "field") | Add: paste key in prompt`;
  } catch { return ""; }
}

async function main() {
  try {
    const input = await readHookInput();
    const settings = loadSettings();
    const agent = settings.identity?.agent_name || "Poseidon";
    const active = settings.project?.active_project || null;
    const parts: string[] = [];
    // 1. Project picker
    const projects = loadProjects();
    const picker = buildPicker(projects, active, agent);
    if (picker) parts.push(picker);
    // 2. TELOS
    const telos = loadTelosFiles();
    if (telos) parts.push(telos);
    // 3. Active project context
    if (active) { const ctx = loadProjectContext(active); if (ctx) parts.push(ctx); }
    // 4. Steering rules
    const steering = loadSteeringRules();
    if (steering) parts.push(steering);
    // 5. Secret registry summary
    const secrets = loadSecretsSummary();
    if (secrets) parts.push(secrets);
    // 6. Learning score
    const learning = loadLearning();
    if (learning.display) parts.push(`# Learning Intelligence\n${learning.display}`);
    // 7. System-reminder output
    if (parts.length) console.log(`<system-reminder>\n${parts.join("\n\n---\n\n")}\n</system-reminder>`);
    // 8. Status line (stderr only)
    const skills = countDirs(SKILLS_DIR(), (n) => existsSync(join(SKILLS_DIR(), n, "SKILL.md")));
    const ruleCount = countDirs(RULES_DIR());
    const errs = countTodayErrors();
    const projCount = countDirs(PROJECTS_DIR());
    const cands = countDirs(CANDIDATES_DIR());
    const git = gitInfo();
    const rating = avgRating();
    const model = (input as any)?.model || "unknown";
    const pct = (input as any)?.context_window?.used_percentage ?? 0;
    const max = (input as any)?.context_window?.size ?? 0;
    const used = Math.round(max * pct / 100);
    const gs = git.changes > 0 ? `+${git.changes}` : "clean";
    // Count secrets available from registry
    const secretCount = (() => {
      try {
        const reg = poseidonPath("security", "secrets-registry.md");
        if (!existsSync(reg)) return 0;
        return (readFileSync(reg, "utf-8").match(/\u2713 active/g) || []).length;
      } catch { return 0; }
    })();
    console.error(`\u2699 SessionStart \u2502 telos ${telos ? "\u2713" : "\u2717"} \u2502 project: ${active || "_general"} \u2502 rules: ${ruleCount} \u2502 secrets: ${secretCount} available`);
  } catch (err) {
    console.error(`\u2699 SessionStart \u2502 error: ${err}`);
  }
}

main();
