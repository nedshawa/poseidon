#!/usr/bin/env bun
/**
 * banner.ts — Poseidon banner with gold trident logo + gradient context bar
 *
 * Displays the Poseidon startup banner with system stats, LLM info,
 * and a visual context usage gradient bar.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";

// ── Path Resolution ─────────────────────────────────────────────

const SCRIPT_DIR = dirname(import.meta.path.replace("file://", ""));
const POSEIDON_DIR = process.env.POSEIDON_DIR || join(SCRIPT_DIR, "..");

// ── ANSI Color Helpers ──────────────────────────────────────────

function fg(r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m`;
}

function bg(r: number, g: number, b: number): string {
  return `\x1b[48;2;${r};${g};${b}m`;
}

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

// ── Color Palette ───────────────────────────────────────────────

const GOLD = fg(255, 215, 0);
const BRONZE = fg(180, 140, 60);
const AMBER = fg(218, 165, 32);
const LIGHT_GRAY = fg(201, 209, 217);
const DARK_GRAY = fg(80, 80, 80);

// Gold gradient for trident (top to bottom, 6 rows)
const TRIDENT_GRADIENT: [number, number, number][] = [
  [255, 215, 0],
  [255, 193, 7],
  [218, 165, 32],
  [184, 134, 11],
  [139, 90, 43],
  [101, 67, 33],
];

// ── Context Bar Gradient ────────────────────────────────────────

function getGradientColor(position: number, total: number): [number, number, number] {
  const t = position / total;
  if (t < 0.4) {
    const p = t / 0.4;
    return [Math.round(63 + p * 127), Math.round(185 + p * 15), Math.round(80 - p * 45)];
  } else if (t < 0.7) {
    const p = (t - 0.4) / 0.3;
    return [Math.round(190 + p * 50), Math.round(195 - p * 55), Math.round(35 - p * 15)];
  } else {
    const p = (t - 0.7) / 0.3;
    return [Math.round(240 - p * 25), Math.round(140 - p * 140), Math.round(20 - p * 20)];
  }
}

function renderContextBar(pct: number): string {
  const totalChars = 20;
  const filledCount = Math.round((pct / 100) * totalChars);
  let bar = "";
  let edgeColor: [number, number, number] = [63, 185, 80]; // default green

  for (let i = 0; i < totalChars; i++) {
    if (i < filledCount) {
      const color = getGradientColor(i, totalChars);
      bar += `${bg(color[0], color[1], color[2])} ${RESET}`;
      edgeColor = color;
    } else {
      bar += `${bg(30, 30, 30)} ${RESET}`;
    }
  }

  const pctColor = fg(edgeColor[0], edgeColor[1], edgeColor[2]);
  return { bar, pctColor } as any;
}

// ── Stats Collection ────────────────────────────────────────────

function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(POSEIDON_DIR, "package.json"), "utf-8"));
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function countSkills(): number {
  try {
    const skillsDir = join(POSEIDON_DIR, "skills");
    if (!existsSync(skillsDir)) return 0;
    return readdirSync(skillsDir).filter(d => {
      const skillPath = join(skillsDir, d, "SKILL.md");
      return existsSync(skillPath);
    }).length;
  } catch {
    return 0;
  }
}

function countRules(): number {
  try {
    const rulesDir = join(POSEIDON_DIR, "memory", "learning", "rules");
    if (!existsSync(rulesDir)) return 0;
    return readdirSync(rulesDir).filter(f => f.endsWith(".md") || f.endsWith(".yaml")).length;
  } catch {
    return 0;
  }
}

function getLearningScore(): string {
  try {
    const metricsPath = join(POSEIDON_DIR, "memory", "learning", "metrics.jsonl");
    if (!existsSync(metricsPath)) return "\u2014";
    const content = readFileSync(metricsPath, "utf-8").trim();
    const lines = content.split("\n").filter(Boolean);
    if (lines.length === 0) return "\u2014";
    const last = JSON.parse(lines[lines.length - 1]);
    return String(last.score ?? last.learning_score ?? "\u2014");
  } catch {
    return "\u2014";
  }
}

function countErrorsToday(): number {
  try {
    const errorLogPath = join(POSEIDON_DIR, "memory", "learning", "error-log.jsonl");
    if (!existsSync(errorLogPath)) return 0;
    const today = new Date().toISOString().slice(0, 10);
    const lines = readFileSync(errorLogPath, "utf-8").trim().split("\n").filter(Boolean);
    return lines.filter(line => {
      try {
        const entry = JSON.parse(line);
        return (entry.timestamp || entry.date || "").startsWith(today);
      } catch {
        return false;
      }
    }).length;
  } catch {
    return 0;
  }
}

function getActiveProject(): string {
  try {
    const settings = JSON.parse(readFileSync(join(POSEIDON_DIR, "settings.json"), "utf-8"));
    return settings?.project?.active_project || "_general";
  } catch {
    return "_general";
  }
}

function countProjects(): number {
  try {
    const projDir = join(POSEIDON_DIR, "memory", "projects");
    if (!existsSync(projDir)) return 0;
    return readdirSync(projDir).filter(d => {
      if (d === ".template") return false;
      try {
        return statSync(join(projDir, d)).isDirectory();
      } catch {
        return false;
      }
    }).length;
  } catch {
    return 0;
  }
}

function countSecrets(): string {
  try {
    const encPath = join(POSEIDON_DIR, "secrets.enc");
    if (!existsSync(encPath)) return "0";

    // Find age key
    let keyPath: string;
    try {
      const settings = JSON.parse(readFileSync(join(POSEIDON_DIR, "settings.json"), "utf-8"));
      keyPath = settings?.security?.age_key_path || join(process.env.HOME || "", ".config", "poseidon", "age-key.txt");
    } catch {
      keyPath = join(process.env.HOME || "", ".config", "poseidon", "age-key.txt");
    }

    if (!existsSync(keyPath)) return "?";

    const tmpPath = `/dev/shm/poseidon-banner-${process.pid}.json`;
    try {
      execSync(`age -d -i "${keyPath}" "${encPath}" > "${tmpPath}"`, { stdio: "pipe" });
      const data = JSON.parse(readFileSync(tmpPath, "utf-8"));
      return String(Object.keys(data).length);
    } finally {
      try { execSync(`shred -u "${tmpPath}" 2>/dev/null`, { stdio: "ignore" }); } catch {}
      try { require("fs").unlinkSync(tmpPath); } catch {}
    }
  } catch {
    return "?";
  }
}

// ── Banner Display ──────────────────────────────────────────────

export interface BannerOptions {
  model?: string;
  plan?: string;
  contextPct?: number;
  contextUsed?: number;
  contextMax?: number;
}

export function displayBanner(options?: BannerOptions): void {
  const version = readVersion();
  const model = options?.model || "Claude Opus 4.6";
  const contextSize = "1M context";
  const plan = options?.plan || "Claude Max";
  const cwd = process.cwd();
  const pct = options?.contextPct ?? 0;
  const contextUsed = options?.contextUsed ?? 0;
  const contextMax = options?.contextMax ?? 1000;
  const remaining = contextMax - contextUsed;

  const skills = countSkills();
  const rules = countRules();
  const learning = getLearningScore();
  const errors = countErrorsToday();
  const project = getActiveProject();
  const projects = countProjects();
  const secrets = countSecrets();

  // ── Trident ───────────────────────────────────────────────

  const tridentLines = [
    "      \u257B \u257B \u257B",
    "     \u2501\u252B \u2503 \u2523\u2501",
    "      \u2503 \u2503 \u2503",
    "      \u2570\u2500\u253C\u2500\u256F",
    "        \u2503",
    "        \u2503",
    "        \u2579",
  ];

  const infoLines = [
    "",
    `       ${BOLD}${GOLD}Poseidon${RESET} ${BRONZE}v${version}${RESET}`,
    `       ${DARK_GRAY}\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${RESET}`,
    `       ${AMBER}LLM:${RESET} ${LIGHT_GRAY}${model}${RESET} ${DARK_GRAY}\u00b7${RESET} ${LIGHT_GRAY}${contextSize}${RESET}`,
    `       ${AMBER}Plan:${RESET} ${LIGHT_GRAY}${plan}${RESET}`,
    `       ${AMBER}Dir:${RESET} ${LIGHT_GRAY}${cwd}${RESET}`,
    "",
  ];

  // Render trident with gold gradient
  console.log("");
  for (let i = 0; i < tridentLines.length; i++) {
    const gradientIdx = Math.min(i, TRIDENT_GRADIENT.length - 1);
    const [r, g, b] = TRIDENT_GRADIENT[gradientIdx];
    const tridentPart = `${fg(r, g, b)}${tridentLines[i]}${RESET}`;
    const infoPart = i < infoLines.length ? infoLines[i] : "";
    console.log(`${tridentPart}${infoPart}`);
  }

  // ── Stats Lines ───────────────────────────────────────────

  const divider = `  ${DARK_GRAY}${"─".repeat(56)}${RESET}`;

  console.log(divider);
  console.log(
    `  ${AMBER}\uD83D\uDD31 Skills${RESET} ${LIGHT_GRAY}${skills}${RESET}  ` +
    `${DARK_GRAY}\u2502${RESET}  ${AMBER}Rules${RESET} ${LIGHT_GRAY}${rules}${RESET}  ` +
    `${DARK_GRAY}\u2502${RESET}  ${AMBER}Learning${RESET} ${LIGHT_GRAY}${learning}/100${RESET}  ` +
    `${DARK_GRAY}\u2502${RESET}  ${AMBER}Errors${RESET} ${LIGHT_GRAY}${errors}${RESET}`
  );
  console.log(
    `  ${AMBER}\uD83D\uDCC2 Project${RESET} ${LIGHT_GRAY}${project}${RESET}  ` +
    `${DARK_GRAY}\u2502${RESET}  ${AMBER}Projects${RESET} ${LIGHT_GRAY}${projects}${RESET}  ` +
    `${DARK_GRAY}\u2502${RESET}  ${AMBER}Secrets${RESET} ${LIGHT_GRAY}${secrets}${RESET}`
  );
  console.log(divider);

  // ── Context Bar ───────────────────────────────────────────

  const totalChars = 20;
  const filledCount = Math.round((pct / 100) * totalChars);
  let bar = "";
  let edgeColor: [number, number, number] = [63, 185, 80];

  for (let i = 0; i < totalChars; i++) {
    if (i < filledCount) {
      const color = getGradientColor(i, totalChars);
      bar += `${bg(color[0], color[1], color[2])} ${RESET}`;
      edgeColor = color;
    } else {
      bar += `${bg(30, 30, 30)} ${RESET}`;
    }
  }

  const pctColor = fg(edgeColor[0], edgeColor[1], edgeColor[2]);

  console.log(
    `  ${AMBER}\uD83E\uDDE0 Context${RESET} ${bar} ` +
    `${pctColor}${pct}%${RESET} ${DARK_GRAY}\u2502${RESET} ` +
    `${LIGHT_GRAY}${contextUsed}K/${contextMax}K${RESET} ${DARK_GRAY}\u2502${RESET} ` +
    `${LIGHT_GRAY}${remaining}K left${RESET}`
  );
  console.log(divider);
  console.log("");
}

// ── CLI Entry Point ─────────────────────────────────────────────

if (import.meta.main) {
  displayBanner({
    model: process.argv[2] || undefined,
    plan: process.argv[3] || undefined,
    contextPct: process.argv[4] ? parseInt(process.argv[4]) : 0,
    contextUsed: process.argv[5] ? parseInt(process.argv[5]) : 0,
    contextMax: process.argv[6] ? parseInt(process.argv[6]) : 1000,
  });
}
