#!/usr/bin/env bun
/**
 * poseidon -- Personal AI CLI Wrapper
 * Launches any LLM with Poseidon infrastructure (banner, IPC, project picker, lifecycle)
 *
 * Usage:
 *   poseidon                     Launch with default LLM (Claude)
 *   poseidon --llm gemini        Launch with Gemini
 *   poseidon --project NAME      Start in specific project
 *   poseidon -r, --resume        Resume last session
 *   poseidon -l, --local         Stay in current directory
 *   poseidon onboard [service]   Secure API key intake
 *   poseidon projects            List projects
 *   poseidon status              System health
 *   poseidon update              Update Poseidon + LLM
 *   poseidon version             Show versions
 *   poseidon help                Show help
 */

import { spawn, execSync, spawnSync } from "child_process";
import { createServer, type Server } from "net";
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from "fs";
import { join, dirname } from "path";

import { displayBanner } from "./banner";
import { getLLM, listLLMs, type LLMConfig } from "./llm-registry";

// ── Path Resolution ─────────────────────────────────────────────

const SCRIPT_DIR = dirname(import.meta.path.replace("file://", ""));
const POSEIDON_DIR = process.env.POSEIDON_DIR || join(SCRIPT_DIR, "..");
const SOCKET_PATH = `/tmp/poseidon-ipc-${process.pid}.sock`;

// ── ANSI Helpers ────────────────────────────────────────────────

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const fg = (r: number, g: number, b: number) => `\x1b[38;2;${r};${g};${b}m`;

const GOLD = fg(255, 215, 0);
const AMBER = fg(218, 165, 32);
const LIGHT_GRAY = fg(201, 209, 217);
const DARK_GRAY = fg(80, 80, 80);
const GREEN = fg(63, 185, 80);
const RED = fg(215, 0, 0);

// ── Arg Parsing ─────────────────────────────────────────────────

interface ParsedArgs {
  command?: string;
  commandArgs: string[];
  llm?: string;
  project?: string;
  resume: boolean;
  local: boolean;
  extraArgs: string[];
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const result: ParsedArgs = {
    commandArgs: [],
    resume: false,
    local: false,
    extraArgs: [],
  };

  const commands = new Set(["onboard", "projects", "status", "update", "version", "help"]);
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (commands.has(arg) && !result.command) {
      result.command = arg;
      result.commandArgs = args.slice(i + 1);
      break;
    } else if (arg === "--llm" && i + 1 < args.length) {
      result.llm = args[++i];
    } else if (arg === "--project" && i + 1 < args.length) {
      result.project = args[++i];
    } else if (arg === "-r" || arg === "--resume") {
      result.resume = true;
    } else if (arg === "-l" || arg === "--local") {
      result.local = true;
    } else if (arg === "--help" || arg === "-h") {
      result.command = "help";
      break;
    } else if (arg === "--version" || arg === "-v") {
      result.command = "version";
      break;
    } else {
      result.extraArgs.push(arg);
    }
    i++;
  }

  return result;
}

// ── IPC Server ──────────────────────────────────────────────────

async function collectSecretFromTerminal(prompt: string): Promise<string> {
  process.stdout.write(`\n  \uD83D\uDD10 ${prompt}: `);
  try {
    execSync("stty -echo < /dev/tty", { stdio: "ignore" });
  } catch {}
  const result = spawnSync("bash", ["-c", 'read -r LINE < /dev/tty && echo -n "$LINE"'], {
    stdio: ["inherit", "pipe", "inherit"],
  });
  try {
    execSync("stty echo < /dev/tty", { stdio: "ignore" });
  } catch {}
  process.stdout.write("\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\n");
  return result.stdout.toString();
}

function startIPCServer(): Server {
  const server = createServer((conn) => {
    let data = "";
    conn.on("data", (chunk) => (data += chunk));
    conn.on("end", async () => {
      try {
        const req = JSON.parse(data);

        if (req.type === "collect_secret") {
          const prompt = req.prompt || `${req.service || "Service"} API key`;
          const value = await collectSecretFromTerminal(prompt);
          conn.write(JSON.stringify({ ok: true, value: value.trim() }));
        } else if (req.type === "project_switch") {
          try {
            const settingsPath = join(POSEIDON_DIR, "settings.json");
            const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
            settings.project = settings.project || {};
            settings.project.active_project = req.project || req.service;
            writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
            conn.write(JSON.stringify({ ok: true, project: settings.project.active_project }));
          } catch (e: any) {
            conn.write(JSON.stringify({ ok: false, error: e.message }));
          }
        } else if (req.type === "ping") {
          conn.write(JSON.stringify({ ok: true, pid: process.pid }));
        } else {
          conn.write(JSON.stringify({ ok: false, error: `Unknown command: ${req.type}` }));
        }
      } catch (e: any) {
        try {
          conn.write(JSON.stringify({ ok: false, error: `Parse error: ${e.message}` }));
        } catch {}
      }
      conn.end();
    });
  });

  server.on("error", (err) => {
    console.error(`  IPC server error: ${err.message}`);
  });

  server.listen(SOCKET_PATH);
  return server;
}

function cleanupSocket(): void {
  try {
    if (existsSync(SOCKET_PATH)) {
      unlinkSync(SOCKET_PATH);
    }
  } catch {}
}

// ── Commands ────────────────────────────────────────────────────

function cmdHelp(): void {
  console.log(`
  ${BOLD}${GOLD}Poseidon${RESET} ${DARK_GRAY}-- Personal AI CLI Wrapper${RESET}

  ${AMBER}Usage:${RESET}
    ${LIGHT_GRAY}poseidon${RESET}                       Launch with default LLM (Claude)
    ${LIGHT_GRAY}poseidon --llm gemini${RESET}          Launch with Gemini
    ${LIGHT_GRAY}poseidon --project NAME${RESET}        Start in specific project
    ${LIGHT_GRAY}poseidon -r, --resume${RESET}          Resume last session
    ${LIGHT_GRAY}poseidon -l, --local${RESET}           Stay in current directory

  ${AMBER}Commands:${RESET}
    ${LIGHT_GRAY}poseidon onboard [service]${RESET}     Secure API key intake
    ${LIGHT_GRAY}poseidon projects${RESET}              List projects
    ${LIGHT_GRAY}poseidon status${RESET}                System health
    ${LIGHT_GRAY}poseidon update${RESET}                Update Poseidon + LLM
    ${LIGHT_GRAY}poseidon version${RESET}               Show versions
    ${LIGHT_GRAY}poseidon help${RESET}                  Show this help

  ${AMBER}Supported LLMs:${RESET}
    ${LIGHT_GRAY}${listLLMs().join(", ")}${RESET}
`);
}

function cmdVersion(): void {
  let poseidonVersion = "?";
  try {
    const pkg = JSON.parse(readFileSync(join(POSEIDON_DIR, "package.json"), "utf-8"));
    poseidonVersion = pkg.version || "?";
  } catch {}

  let algorithmVersion = "?";
  try {
    const algoDir = join(POSEIDON_DIR, "algorithm");
    if (existsSync(algoDir)) {
      const files = readdirSync(algoDir).filter(f => f.endsWith(".md")).sort();
      if (files.length > 0) {
        const match = files[files.length - 1].match(/v?([\d.]+)/);
        if (match) algorithmVersion = match[1];
      }
    }
  } catch {}

  const llm = getLLM();
  const llmVersion = llm.getVersion();

  console.log(`
  ${AMBER}Poseidon:${RESET}   ${LIGHT_GRAY}v${poseidonVersion}${RESET}
  ${AMBER}Algorithm:${RESET}  ${LIGHT_GRAY}v${algorithmVersion}${RESET}
  ${AMBER}${llm.displayName}:${RESET}${" ".repeat(Math.max(1, 11 - llm.displayName.length))}${LIGHT_GRAY}v${llmVersion}${RESET}
`);
}

function cmdProjects(): void {
  const projDir = join(POSEIDON_DIR, "memory", "projects");
  if (!existsSync(projDir)) {
    console.log(`\n  ${AMBER}No projects found.${RESET}\n`);
    return;
  }

  let activeProject = "main";
  try {
    const settings = JSON.parse(readFileSync(join(POSEIDON_DIR, "settings.json"), "utf-8"));
    activeProject = settings?.project?.active_project || "main";
  } catch {}

  const dirs = readdirSync(projDir).filter(d => {
    if (d === ".template") return false;
    try { return statSync(join(projDir, d)).isDirectory(); } catch { return false; }
  }).sort();

  console.log(`\n  ${AMBER}Projects:${RESET}\n`);
  for (const dir of dirs) {
    const isActive = dir === activeProject;
    const marker = isActive ? `${GREEN}*${RESET}` : " ";
    const nameColor = isActive ? GREEN : LIGHT_GRAY;

    let fileCount = 0;
    try { fileCount = readdirSync(join(projDir, dir)).length; } catch {}

    console.log(`  ${marker} ${nameColor}${dir}${RESET}  ${DARK_GRAY}(${fileCount} files)${RESET}`);
  }
  console.log("");
}

function cmdStatus(): void {
  let learningScore = "\u2014";
  try {
    const metricsPath = join(POSEIDON_DIR, "memory", "learning", "metrics.jsonl");
    if (existsSync(metricsPath)) {
      const lines = readFileSync(metricsPath, "utf-8").trim().split("\n").filter(Boolean);
      if (lines.length > 0) {
        const last = JSON.parse(lines[lines.length - 1]);
        learningScore = String(last.score ?? last.learning_score ?? "\u2014");
      }
    }
  } catch {}

  let errorCount = 0;
  try {
    const errorLogPath = join(POSEIDON_DIR, "memory", "learning", "error-log.jsonl");
    if (existsSync(errorLogPath)) {
      const today = new Date().toISOString().slice(0, 10);
      const lines = readFileSync(errorLogPath, "utf-8").trim().split("\n").filter(Boolean);
      errorCount = lines.filter(line => {
        try { return (JSON.parse(line).timestamp || "").startsWith(today); } catch { return false; }
      }).length;
    }
  } catch {}

  let ruleCount = 0;
  try {
    const rulesDir = join(POSEIDON_DIR, "memory", "learning", "rules");
    if (existsSync(rulesDir)) {
      ruleCount = readdirSync(rulesDir).filter(f => f.endsWith(".md") || f.endsWith(".yaml")).length;
    }
  } catch {}

  let skillCount = 0;
  try {
    const skillsDir = join(POSEIDON_DIR, "skills");
    if (existsSync(skillsDir)) {
      skillCount = readdirSync(skillsDir).filter(d => existsSync(join(skillsDir, d, "SKILL.md"))).length;
    }
  } catch {}

  const errColor = errorCount === 0 ? GREEN : RED;

  console.log(`
  ${BOLD}${GOLD}Poseidon System Health${RESET}
  ${DARK_GRAY}${"─".repeat(40)}${RESET}
  ${AMBER}Learning Score:${RESET}  ${LIGHT_GRAY}${learningScore}/100${RESET}
  ${AMBER}Errors Today:${RESET}   ${errColor}${errorCount}${RESET}
  ${AMBER}Active Rules:${RESET}   ${LIGHT_GRAY}${ruleCount}${RESET}
  ${AMBER}Skills:${RESET}         ${LIGHT_GRAY}${skillCount}${RESET}
  ${DARK_GRAY}${"─".repeat(40)}${RESET}
`);
}

function cmdUpdate(): void {
  console.log(`\n  ${AMBER}Updating Poseidon...${RESET}`);
  try {
    execSync(`cd "${POSEIDON_DIR}" && git pull`, { stdio: "inherit" });
    console.log(`  ${GREEN}Poseidon updated.${RESET}`);
  } catch {
    console.log(`  ${RED}Failed to update Poseidon (git pull failed).${RESET}`);
  }

  const llm = getLLM();
  console.log(`\n  ${AMBER}Checking ${llm.displayName} updates...${RESET}`);
  if (llm.name === "claude") {
    try {
      execSync("claude update", { stdio: "inherit" });
    } catch {
      console.log(`  ${DARK_GRAY}No update command available for ${llm.displayName}.${RESET}`);
    }
  } else {
    console.log(`  ${DARK_GRAY}Manual update required for ${llm.displayName}.${RESET}`);
  }
  console.log("");
}

function cmdOnboard(args: string[]): void {
  const onboardScript = join(POSEIDON_DIR, "tools", "onboard.ts");
  if (!existsSync(onboardScript)) {
    console.error(`  ${RED}onboard.ts not found at: ${onboardScript}${RESET}`);
    process.exit(1);
  }
  try {
    execSync(`bun "${onboardScript}" ${args.map(a => `"${a}"`).join(" ")}`, {
      stdio: "inherit",
      env: { ...process.env, POSEIDON_DIR },
    });
  } catch (e: any) {
    process.exit(e.status || 1);
  }
}

// ── Project Picker (displayed before LLM spawn) ────────────────

function displayProjectPicker(overrideProject?: string): void {
  const settingsPath = join(POSEIDON_DIR, "settings.json");
  let active = "main";
  try {
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    active = overrideProject || settings?.project?.active_project || "main";
  } catch {}

  // Ensure main project exists
  const projectsDir = join(POSEIDON_DIR, "memory", "projects");
  const mainDir = join(projectsDir, "main");
  if (!existsSync(mainDir)) {
    try {
      const { mkdirSync: mk, writeFileSync: wf } = require("fs");
      mk(join(mainDir, "knowledge"), { recursive: true });
      for (const f of ["CONTEXT.md", "GOALS.md", "DECISIONS.md", "RULES.md"]) {
        wf(join(mainDir, f), `# ${f.replace(".md", "")}\n`);
      }
      wf(join(mainDir, "META.yaml"), `name: "Main"\nstatus: active\ncreated: "${new Date().toISOString()}"\ndescription: "Default project"\ntags: [default]\nlast_used: "${new Date().toISOString()}"\n`);
    } catch {}
  }

  // Load projects
  interface ProjInfo { slug: string; lastUsed: Date; decisions: number; }
  const projects: ProjInfo[] = [];
  try {
    for (const slug of readdirSync(projectsDir)) {
      if (slug.startsWith(".")) continue;
      const d = join(projectsDir, slug);
      try { if (!statSync(d).isDirectory()) continue; } catch { continue; }
      const meta = (() => {
        try {
          const raw = readFileSync(join(d, "META.yaml"), "utf-8");
          const status = raw.match(/^status:\s*(\S+)/m)?.[1] || "active";
          if (status === "archived" || status === "complete") return null;
          const lu = raw.match(/^last_used:\s*"?([^"\n]*)"?/m)?.[1];
          return { lastUsed: new Date(lu || 0) };
        } catch { return { lastUsed: new Date(0) }; }
      })();
      if (!meta) continue;
      const decisions = (() => {
        try {
          const raw = readFileSync(join(d, "DECISIONS.md"), "utf-8");
          return (raw.match(/^## /gm) || []).length;
        } catch { return 0; }
      })();
      projects.push({ slug, lastUsed: meta.lastUsed, decisions });
    }
  } catch {}
  projects.sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());

  const timeAgo = (d: Date): string => {
    const m = Math.floor((Date.now() - d.getTime()) / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
  };

  const activeProj = projects.find(p => p.slug === active);
  const others = projects.filter(p => p.slug !== active);

  console.log("");
  console.log(`  ${BOLD}${GOLD}Project Selection${RESET}`);
  console.log(`  ${DARK_GRAY}${"─".repeat(50)}${RESET}`);

  // Option A
  if (activeProj) {
    console.log(`  ${GREEN}▶ A:${RESET} Continue with ${BOLD}${active}${RESET} ${DARK_GRAY}(${timeAgo(activeProj.lastUsed)} │ ${activeProj.decisions} decisions)${RESET}`);
  } else {
    console.log(`  ${GREEN}▶ A:${RESET} Use ${BOLD}main${RESET} project ${DARK_GRAY}(default workspace)${RESET}`);
  }

  // Option B
  if (others.length > 0) {
    console.log(`  ${fg(88, 166, 255)}▶ B:${RESET} Switch to:`);
    let idx = 1;
    for (const p of others.slice(0, 6)) {
      console.log(`       ${idx}. ${BOLD}${p.slug}${RESET} ${DARK_GRAY}(${timeAgo(p.lastUsed)})${RESET}`);
      idx++;
    }
    if (others.length > 6) console.log(`       ${DARK_GRAY}... and ${others.length - 6} more${RESET}`);
  } else {
    console.log(`  ${fg(88, 166, 255)}▶ B:${RESET} Switch to: ${DARK_GRAY}(no other projects yet)${RESET}`);
  }

  // Option C
  console.log(`  ${AMBER}▶ C:${RESET} Create new project ${DARK_GRAY}(say "new project [name]")${RESET}`);
  console.log(`  ${DARK_GRAY}${"─".repeat(50)}${RESET}`);
  console.log("");
}

// ── Main Launch ─────────────────────────────────────────────────

async function launch(parsed: ParsedArgs): Promise<void> {
  const llm = getLLM(parsed.llm);

  // Display banner
  displayBanner({
    model: `${llm.displayName} ${llm.getVersion()}`,
    plan: llm.defaultPlan,
    contextPct: 0,
    contextUsed: 0,
    contextMax: parseInt(llm.defaultContextSize) || 1000,
  });

  // Display project picker (before spawning LLM so user sees it)
  displayProjectPicker(parsed.project);

  // Update active project if specified
  if (parsed.project) {
    try {
      const settingsPath = join(POSEIDON_DIR, "settings.json");
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
      settings.project = settings.project || {};
      settings.project.active_project = parsed.project;
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    } catch {}
  }

  // Start IPC server
  const ipcServer = startIPCServer();

  // Build env
  const env = {
    ...process.env,
    POSEIDON_DIR,
    POSEIDON_IPC_SOCK: SOCKET_PATH,
  };

  // Build LLM args
  const llmArgs: string[] = [...llm.args];

  if (parsed.resume && llm.supportsResume) {
    llmArgs.push("--resume");
  }

  // Pass through extra args
  llmArgs.push(...parsed.extraArgs);

  // Cleanup on exit
  const cleanup = () => {
    cleanupSocket();
    try { ipcServer.close(); } catch {}
  };

  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });

  process.on("SIGTERM", () => {
    cleanup();
    process.exit(143);
  });

  process.on("exit", cleanup);

  // Spawn LLM
  const child = spawn(llm.command, llmArgs, {
    stdio: ["inherit", "inherit", "inherit"],
    env,
  });

  child.on("error", (err) => {
    console.error(`\n  ${RED}Failed to start ${llm.displayName}: ${err.message}${RESET}`);
    if (err.message.includes("ENOENT")) {
      console.error(`  ${DARK_GRAY}Is '${llm.command}' installed and in your PATH?${RESET}`);
    }
    cleanup();
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    cleanup();

    if (signal) {
      process.exit(128 + (signal === "SIGINT" ? 2 : signal === "SIGTERM" ? 15 : 1));
    }

    process.exit(code ?? 0);
  });
}

// ── Entry Point ─────────────────────────────────────────────────

const parsed = parseArgs(process.argv);

if (parsed.command) {
  switch (parsed.command) {
    case "help":
      cmdHelp();
      break;
    case "version":
      cmdVersion();
      break;
    case "projects":
      cmdProjects();
      break;
    case "status":
      cmdStatus();
      break;
    case "update":
      cmdUpdate();
      break;
    case "onboard":
      cmdOnboard(parsed.commandArgs);
      break;
    default:
      console.error(`  Unknown command: ${parsed.command}`);
      cmdHelp();
      process.exit(1);
  }
} else {
  launch(parsed).catch((err) => {
    console.error(`  ${RED}Fatal: ${err.message}${RESET}`);
    cleanupSocket();
    process.exit(1);
  });
}
