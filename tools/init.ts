#!/usr/bin/env bun
/**
 * init.ts — Interactive Poseidon installer wizard.
 * Run: bun tools/init.ts
 *
 * Creates a fresh Poseidon installation from the source repo.
 * Zero external dependencies — uses only Node/Bun built-ins.
 */

import { createInterface } from "readline";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  copyFileSync,
  existsSync,
  readdirSync,
  statSync,
  symlinkSync,
} from "fs";
import { join, dirname, resolve } from "path";
import { homedir } from "os";
import { execSync } from "child_process";

// ---------------------------------------------------------------------------
// Readline helpers
// ---------------------------------------------------------------------------

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string, defaultVal?: string): Promise<string> {
  const suffix = defaultVal ? ` [${defaultVal}]` : "";
  return new Promise((resolve) => {
    rl.question(`    ${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultVal || "");
    });
  });
}

function askYesNo(question: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? "(Y/n)" : "(y/N)";
  return new Promise((resolve) => {
    rl.question(`    ${question} ${hint}: `, (answer) => {
      const a = answer.trim().toLowerCase();
      if (a === "") resolve(defaultYes);
      else resolve(a === "y" || a === "yes");
    });
  });
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

/** Source repo root — the directory containing this script's parent (tools/) */
const SOURCE_DIR = resolve(dirname(new URL(import.meta.url).pathname), "..");

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/** Recursively copy a directory tree, preserving structure. */
function copyDirRecursive(src: string, dest: string): void {
  ensureDir(dest);
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/** Slugify a project name for use as directory name. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Prerequisite checks & auto-install
// ---------------------------------------------------------------------------

interface PrereqResult {
  name: string;
  installed: boolean;
  version?: string;
  required: boolean;
}

function which(cmd: string): string | null {
  try {
    return execSync(`which ${cmd} 2>/dev/null`, { stdio: "pipe" }).toString().trim();
  } catch {
    return null;
  }
}

function getVersion(cmd: string, flag = "--version"): string | null {
  try {
    const out = execSync(`${cmd} ${flag} 2>&1`, { stdio: "pipe" }).toString().trim();
    const match = out.match(/(\d+\.\d+[\.\d]*)/);
    return match ? match[1] : out.slice(0, 40);
  } catch {
    return null;
  }
}

function detectOS(): "macos" | "debian" | "fedora" | "arch" | "unknown" {
  try {
    const uname = execSync("uname -s", { stdio: "pipe" }).toString().trim();
    if (uname === "Darwin") return "macos";
    if (existsSync("/etc/debian_version")) return "debian";
    if (existsSync("/etc/fedora-release") || existsSync("/etc/redhat-release")) return "fedora";
    if (existsSync("/etc/arch-release")) return "arch";
  } catch {}
  return "unknown";
}

function installCmd(pkg: string, os: ReturnType<typeof detectOS>): string | null {
  const cmds: Record<string, Record<string, string>> = {
    bun: {
      macos: "curl -fsSL https://bun.sh/install | bash",
      debian: "curl -fsSL https://bun.sh/install | bash",
      fedora: "curl -fsSL https://bun.sh/install | bash",
      arch: "curl -fsSL https://bun.sh/install | bash",
      unknown: "curl -fsSL https://bun.sh/install | bash",
    },
    age: {
      macos: "brew install age",
      debian: "sudo apt-get install -y age",
      fedora: "sudo dnf install -y age",
      arch: "sudo pacman -S --noconfirm age",
      unknown: "",
    },
    "claude-code": {
      macos: "npm install -g @anthropic-ai/claude-code",
      debian: "npm install -g @anthropic-ai/claude-code",
      fedora: "npm install -g @anthropic-ai/claude-code",
      arch: "npm install -g @anthropic-ai/claude-code",
      unknown: "npm install -g @anthropic-ai/claude-code",
    },
    git: {
      macos: "brew install git",
      debian: "sudo apt-get install -y git",
      fedora: "sudo dnf install -y git",
      arch: "sudo pacman -S --noconfirm git",
      unknown: "",
    },
  };
  return cmds[pkg]?.[os] || null;
}

async function checkAndInstallPrereqs(): Promise<boolean> {
  console.log("\n  Checking prerequisites...\n");

  const os = detectOS();
  const prereqs: PrereqResult[] = [];

  // bun — required (but if we're running, it's already installed)
  const bunPath = which("bun");
  prereqs.push({
    name: "bun",
    installed: !!bunPath,
    version: bunPath ? getVersion("bun") || undefined : undefined,
    required: true,
  });

  // git — required
  const gitPath = which("git");
  prereqs.push({
    name: "git",
    installed: !!gitPath,
    version: gitPath ? getVersion("git") || undefined : undefined,
    required: true,
  });

  // claude code — required
  const claudePath = which("claude");
  prereqs.push({
    name: "claude-code",
    installed: !!claudePath,
    version: claudePath ? getVersion("claude", "--version") || undefined : undefined,
    required: true,
  });

  // age — optional but recommended
  const agePath = which("age");
  prereqs.push({
    name: "age",
    installed: !!agePath,
    version: agePath ? getVersion("age") || undefined : undefined,
    required: false,
  });

  // Display status
  for (const p of prereqs) {
    const status = p.installed
      ? `✓ ${p.name} ${p.version ? `(${p.version})` : ""}`
      : `✗ ${p.name} ${p.required ? "(required)" : "(optional — recommended)"}`;
    console.log(`    ${status}`);
  }

  const missing = prereqs.filter((p) => !p.installed);
  if (missing.length === 0) {
    console.log("\n    All prerequisites satisfied.\n");
    return true;
  }

  const missingRequired = missing.filter((p) => p.required);
  const missingOptional = missing.filter((p) => !p.required);

  // Auto-install missing
  console.log("");
  for (const p of missing) {
    const cmd = installCmd(p.name, os);
    if (!cmd) {
      if (p.required) {
        console.log(`    Cannot auto-install ${p.name} on this OS. Please install it manually.`);
      } else {
        console.log(`    Skipping optional ${p.name} — install manually if needed.`);
      }
      continue;
    }

    const label = p.required ? "Required" : "Recommended";
    const shouldInstall = await askYesNo(`${label}: Install ${p.name}? (${cmd})`);

    if (shouldInstall) {
      console.log(`    Installing ${p.name}...`);
      try {
        execSync(cmd, { stdio: "inherit" });
        p.installed = true;
        console.log(`    ✓ ${p.name} installed successfully.`);
      } catch (err) {
        console.error(`    ✗ Failed to install ${p.name}. Please install manually.`);
        if (p.required) {
          console.error(`    Install command: ${cmd}`);
        }
      }
    } else if (p.required) {
      console.log(`    WARNING: ${p.name} is required. Poseidon may not work correctly without it.`);
    }
  }

  // Check if all required are now installed
  const stillMissing = prereqs.filter((p) => p.required && !p.installed);
  if (stillMissing.length > 0) {
    console.log(`\n    Missing required prerequisites: ${stillMissing.map((p) => p.name).join(", ")}`);
    const proceed = await askYesNo("Continue anyway?", false);
    return proceed;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

function printBanner(): void {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║   Poseidon — Personal AI Infrastructure         ║
  ║   Interactive Setup Wizard                       ║
  ╚══════════════════════════════════════════════════╝
`);
}

function printStep(step: number, total: number, title: string): void {
  console.log(`\n  Step ${step}/${total}: ${title}`);
  console.log(`  ${"─".repeat(40)}`);
}

// ---------------------------------------------------------------------------
// Step 1: Identity
// ---------------------------------------------------------------------------

interface Identity {
  agent_name: string;
  user_name: string;
  communication_style: string;
}

async function stepIdentity(): Promise<Identity> {
  printStep(1, 6, "Identity");

  const agent_name = await ask("What should your AI be called?", "Poseidon");
  const user_name = await ask("What's your name?");

  if (!user_name) {
    console.log("    (You can set your name later in settings.json)");
  }

  let communication_style = "";
  while (!["direct", "friendly", "formal", "casual"].includes(communication_style)) {
    communication_style = await ask(
      "Communication style (direct/friendly/formal/casual)",
      "direct"
    );
    if (!["direct", "friendly", "formal", "casual"].includes(communication_style)) {
      console.log("    Please choose: direct, friendly, formal, or casual");
    }
  }

  return { agent_name, user_name, communication_style };
}

// ---------------------------------------------------------------------------
// Step 2: TELOS (Mission)
// ---------------------------------------------------------------------------

interface Telos {
  mission: string;
  goals: string[];
}

async function stepTelos(): Promise<Telos> {
  printStep(2, 6, "Mission (TELOS)");

  const setupTelos = await askYesNo("Set up your mission and goals now?", false);
  if (!setupTelos) {
    console.log("    Skipping — edit telos/ files later when ready.");
    return { mission: "", goals: [] };
  }

  const mission = await ask("In one sentence, what are you working toward?");

  console.log("    What are your top 3 goals right now?");
  const goals: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const goal = await ask(`  ${i}`);
    if (goal) goals.push(goal);
  }

  return { mission, goals };
}

// ---------------------------------------------------------------------------
// Step 3: Secrets (age encryption)
// ---------------------------------------------------------------------------

interface SecretsResult {
  ageInstalled: boolean;
  keyPath: string | null;
}

async function stepSecrets(installDir: string): Promise<SecretsResult> {
  printStep(3, 6, "Secret Encryption");

  let ageInstalled = false;
  try {
    execSync("which age", { stdio: "pipe" });
    ageInstalled = true;
  } catch {
    // age not found
  }

  if (!ageInstalled) {
    console.log(`
    age encryption is not installed. Poseidon uses age for zero-infrastructure
    secret management. You can install it later:

      macOS:   brew install age
      Linux:   apt install age  (or see https://age-encryption.org)
      Windows: scoop install age

    Skipping secret setup — you can run this step later.
`);
    return { ageInstalled: false, keyPath: null };
  }

  console.log("    age detected. Setting up encryption keys...");

  const keyDir = join(homedir(), ".config", "poseidon");
  const keyPath = join(keyDir, "age-key.txt");

  if (existsSync(keyPath)) {
    console.log(`    Key already exists at ${keyPath} — reusing.`);
    return { ageInstalled: true, keyPath };
  }

  const setupKeys = await askYesNo("Generate an age key pair for secret encryption?");
  if (!setupKeys) {
    console.log("    Skipping key generation. You can run this later.");
    return { ageInstalled: true, keyPath: null };
  }

  try {
    ensureDir(keyDir);
    execSync(`age-keygen -o "${keyPath}" 2>&1`, { stdio: "pipe" });
    // Restrict permissions on the key file
    execSync(`chmod 600 "${keyPath}"`, { stdio: "pipe" });

    // Read the public key from the generated file
    const keyContent = readFileSync(keyPath, "utf-8");
    const pubKeyMatch = keyContent.match(/public key: (age1[a-z0-9]+)/);
    const pubKey = pubKeyMatch ? pubKeyMatch[1] : "(see key file)";

    console.log(`    Key generated at: ${keyPath}`);
    console.log(`    Public key: ${pubKey}`);

    // Create empty encrypted secrets file
    const secretsPath = join(installDir, "secrets.enc");
    if (!existsSync(secretsPath) && pubKey !== "(see key file)") {
      try {
        execSync(
          `echo '{}' | age -r "${pubKey}" -o "${secretsPath}"`,
          { stdio: "pipe" }
        );
        console.log(`    Empty secrets file created at: ${secretsPath}`);
      } catch {
        console.log("    Could not create initial secrets file — you can create it later.");
      }
    }

    return { ageInstalled: true, keyPath };
  } catch (err) {
    console.log("    Failed to generate key. You can run age-keygen manually later.");
    return { ageInstalled: true, keyPath: null };
  }
}

// ---------------------------------------------------------------------------
// Step 4: First Project (optional)
// ---------------------------------------------------------------------------

interface ProjectSetup {
  name: string;
  slug: string;
  description: string;
}

async function stepProject(): Promise<ProjectSetup | null> {
  printStep(4, 6, "First Project (optional)");

  const hasProject = await askYesNo("Do you have a project to set up?", false);
  if (!hasProject) {
    console.log("    No problem — you can create projects later.");
    return null;
  }

  const name = await ask("Project name");
  if (!name) return null;

  const description = await ask("One-line description");
  const slug = slugify(name);

  return { name, slug, description };
}

// ---------------------------------------------------------------------------
// Step 5: Build
// ---------------------------------------------------------------------------

async function stepBuild(
  installDir: string,
  identity: Identity,
  telos: Telos,
  project: ProjectSetup | null
): Promise<void> {
  printStep(5, 6, "Building");

  // 1. Create directory structure
  const dirs = [
    "algorithm",
    "hooks/handlers",
    "hooks/lib",
    "skills",
    "telos",
    "memory/projects/.template",
    "memory/work",
    "memory/learning/failures",
    "memory/learning/rules",
    "memory/learning/candidates",
    "memory/learning/signals",
    "tools",
    "security",
    "logs",
    "docs",
  ];

  for (const dir of dirs) {
    ensureDir(join(installDir, dir));
  }
  console.log("    [ok] Created directory structure");

  // 2. Build settings.json with user's answers
  const settingsSource = join(SOURCE_DIR, "settings.json");
  const settings = JSON.parse(readFileSync(settingsSource, "utf-8"));

  settings.identity.agent_name = identity.agent_name;
  settings.identity.user_name = identity.user_name;
  settings.identity.communication_style = identity.communication_style;
  settings.env.POSEIDON_DIR = installDir;

  if (project) {
    settings.project.active_project = project.slug;
  }

  writeFileSync(
    join(installDir, "settings.json"),
    JSON.stringify(settings, null, 2) + "\n"
  );
  console.log("    [ok] Generated settings.json");

  // 3. Copy CLAUDE.md.template
  copyFileSync(
    join(SOURCE_DIR, "CLAUDE.md.template"),
    join(installDir, "CLAUDE.md.template")
  );
  console.log("    [ok] Copied CLAUDE.md.template");

  // 4. Copy algorithm/
  copyDirRecursive(
    join(SOURCE_DIR, "algorithm"),
    join(installDir, "algorithm")
  );
  // Create LATEST symlink
  const algorithmDir = join(installDir, "algorithm");
  const latestLink = join(algorithmDir, "LATEST");
  if (!existsSync(latestLink)) {
    try {
      symlinkSync("v1.0.md", latestLink);
    } catch {
      // Fallback: write a redirect file if symlinks aren't supported
      writeFileSync(latestLink, "v1.0.md\n");
    }
  }
  console.log("    [ok] Installed algorithm v1.0");

  // 5. Copy skills/
  const skillsSource = join(SOURCE_DIR, "skills");
  if (existsSync(skillsSource)) {
    copyDirRecursive(skillsSource, join(installDir, "skills"));
    const skillCount = readdirSync(skillsSource).filter((e) =>
      statSync(join(skillsSource, e)).isDirectory()
    ).length;
    console.log(`    [ok] Installed ${skillCount} starter skill(s)`);
  }

  // 6. Copy hooks/
  const hooksSource = join(SOURCE_DIR, "hooks");
  if (existsSync(hooksSource)) {
    copyDirRecursive(hooksSource, join(installDir, "hooks"));
    console.log("    [ok] Installed hooks");
  }

  // 7. Copy security/patterns.yaml
  const securitySource = join(SOURCE_DIR, "security");
  if (existsSync(securitySource)) {
    copyDirRecursive(securitySource, join(installDir, "security"));
    console.log("    [ok] Configured security patterns");
  }

  // 8. Copy project templates
  const templateSource = join(SOURCE_DIR, "memory", "projects", ".template");
  if (existsSync(templateSource)) {
    copyDirRecursive(
      templateSource,
      join(installDir, "memory", "projects", ".template")
    );
  }

  // 9. Copy tsconfig.json
  const tsconfigSource = join(SOURCE_DIR, "tsconfig.json");
  if (existsSync(tsconfigSource)) {
    copyFileSync(tsconfigSource, join(installDir, "tsconfig.json"));
  }

  // 10. Write TELOS files
  const missionContent = telos.mission
    ? `# Mission\n\n${telos.mission}\n`
    : `# Mission\n\n*Define your mission here — what are you working toward?*\n`;

  writeFileSync(join(installDir, "telos", "MISSION.md"), missionContent);

  let goalsContent = "# Goals\n\n";
  if (telos.goals.length > 0) {
    for (const goal of telos.goals) {
      goalsContent += `- [ ] ${goal}\n`;
    }
  } else {
    goalsContent += "*Add your current goals here.*\n";
  }
  writeFileSync(join(installDir, "telos", "GOALS.md"), goalsContent);

  writeFileSync(
    join(installDir, "telos", "PROJECTS.md"),
    "# Projects\n\n*Active projects and their status.*\n"
  );
  console.log("    [ok] Created TELOS files");

  // 11. Create initial steering rules and ratings
  writeFileSync(
    join(installDir, "memory", "steering-rules.md"),
    "*No steering rules yet. They will be generated as you use the system.*\n"
  );
  writeFileSync(join(installDir, "memory", "learning", "signals", "ratings.jsonl"), "");

  // 12. Set up project if provided
  if (project) {
    const projectDir = join(installDir, "memory", "projects", project.slug);
    ensureDir(join(projectDir, "knowledge"));
    ensureDir(join(projectDir, "sessions"));

    // Copy templates and fill in META
    const templateDir = join(installDir, "memory", "projects", ".template");
    for (const file of ["CONTEXT.md", "GOALS.md", "DECISIONS.md", "RULES.md"]) {
      const src = join(templateDir, file);
      if (existsSync(src)) {
        copyFileSync(src, join(projectDir, file));
      }
    }

    const meta = [
      `name: "${project.name}"`,
      `status: active`,
      `created: "${new Date().toISOString().split("T")[0]}"`,
      `description: "${project.description}"`,
      `tags: []`,
    ].join("\n");
    writeFileSync(join(projectDir, "META.yaml"), meta + "\n");

    console.log(`    [ok] Created project: ${project.name} (${project.slug})`);
  }

  // 12b. Create _general project (global workspace)
  const generalDir = join(installDir, "memory", "projects", "_general");
  if (!existsSync(generalDir)) {
    ensureDir(join(generalDir, "knowledge"));
    ensureDir(join(generalDir, "sessions"));
    const templateDir = join(installDir, "memory", "projects", ".template");
    for (const file of ["CONTEXT.md", "GOALS.md", "DECISIONS.md", "RULES.md"]) {
      const src = join(templateDir, file);
      if (existsSync(src)) copyFileSync(src, join(generalDir, file));
    }
    const generalMeta = `name: "_general"\nstatus: active\ncreated: "${new Date().toISOString().split("T")[0]}"\ndescription: "Global workspace for non-project tasks"\nlast_used: "${new Date().toISOString()}"\ntags: []\n`;
    writeFileSync(join(generalDir, "META.yaml"), generalMeta);
    console.log("    [ok] Created _general project (global workspace)");
  }

  // 12c. Default active_project to _general if no project was created
  if (!project) {
    settings.project.active_project = "_general";
    writeFileSync(
      join(installDir, "settings.json"),
      JSON.stringify(settings, null, 2) + "\n"
    );
  }

  // 13. Copy dashboard
  const dashboardSource = join(SOURCE_DIR, "dashboard");
  if (existsSync(dashboardSource)) {
    copyDirRecursive(dashboardSource, join(installDir, "dashboard"));
    console.log("    [ok] Installed dashboard web app");
  }

  // 14. API Key Setup (runs tools/setup.ts for key collection)
  const setupScript = join(installDir, "tools", "setup.ts");
  if (existsSync(setupScript)) {
    const setupKeys = await askYesNo("Set up API keys now? (Perplexity, OpenAI, FMP, etc.)");
    if (setupKeys) {
      try {
        execSync(`POSEIDON_DIR="${installDir}" bun "${setupScript}"`, {
          stdio: "inherit",
          cwd: installDir,
        });
        console.log("    [ok] API keys configured");
      } catch {
        console.log("    [warn] Key setup interrupted — run 'bun tools/setup.ts' later");
      }
    } else {
      console.log("    Skipping key setup — run 'bun tools/setup.ts' anytime to add keys");
    }
  }

  // 15. Run rebuild to generate CLAUDE.md
  try {
    const rebuildScript = join(installDir, "tools", "rebuild.ts");
    if (existsSync(rebuildScript)) {
      execSync(`POSEIDON_DIR="${installDir}" bun "${rebuildScript}"`, {
        stdio: "pipe",
        cwd: installDir,
      });
      console.log("    [ok] Generated CLAUDE.md from template");
    }
  } catch (err) {
    console.log("    [warn] Could not auto-generate CLAUDE.md — run 'bun tools/rebuild.ts' manually");
  }

  // 15. Install dashboard as systemd service
  const systemdDir = join(homedir(), ".config", "systemd", "user");
  const serviceName = "poseidon-dashboard";
  const bunPath = (() => { try { return execSync("which bun", { stdio: "pipe" }).toString().trim(); } catch { return "bun"; } })();
  const bunDir = dirname(bunPath);

  try {
    ensureDir(systemdDir);
    const serviceContent = `[Unit]
Description=Poseidon Dashboard
After=network.target

[Service]
Type=simple
ExecStart=${bunPath} ${join(installDir, "dashboard", "server.ts")}
WorkingDirectory=${installDir}
Restart=always
RestartSec=5
Environment=POSEIDON_DIR=${installDir}
Environment=PORT=3456
Environment=PATH=${bunDir}:/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=default.target
`;
    writeFileSync(join(systemdDir, `${serviceName}.service`), serviceContent);

    // Enable and start the service
    try {
      execSync(`systemctl --user daemon-reload`, { stdio: "pipe" });
      execSync(`systemctl --user enable ${serviceName}`, { stdio: "pipe" });
      execSync(`systemctl --user start ${serviceName}`, { stdio: "pipe" });
      // Enable lingering so user services survive logout
      try { execSync(`loginctl enable-linger $(whoami)`, { stdio: "pipe" }); } catch {}
      console.log("    [ok] Dashboard service installed and started (port 3456)");
      console.log("         Survives restarts. Access at http://localhost:3456");
    } catch {
      console.log("    [warn] Could not start systemd service (systemctl may not be available)");
      console.log("         Start manually: bun " + join(installDir, "tools", "dashboard.ts"));
    }
  } catch {
    console.log("    [warn] Could not install systemd service");
    console.log("         Start manually: bun " + join(installDir, "tools", "dashboard.ts"));
  }

  // Success message
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║   Setup complete!                                ║
  ╚══════════════════════════════════════════════════╝

  Poseidon is installed at: ${installDir}

  Next steps:
    1. Open Claude Code in any project directory
    2. ${identity.agent_name} loads automatically via settings.json
    3. Your AI learns from your corrections over time

  Dashboard:
    http://localhost:3456 (running as background service)
    Status:  systemctl --user status poseidon-dashboard
    Restart: systemctl --user restart poseidon-dashboard
    Logs:    journalctl --user -u poseidon-dashboard -f

  Useful commands:
    bun ${join(installDir, "tools", "rebuild.ts")}   — Regenerate CLAUDE.md
    bun ${join(installDir, "tools", "secret.ts")}    — Manage encrypted secrets
    bun ${join(installDir, "tools", "dashboard.ts")} — Start dashboard manually

  Edit settings:    ${join(installDir, "settings.json")}
  Edit personality:  ${join(installDir, "CLAUDE.md.template")}
  Edit mission:     ${join(installDir, "telos", "MISSION.md")}
`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  printBanner();

  // Step 0: Prerequisites
  const prereqOk = await checkAndInstallPrereqs();
  if (!prereqOk) {
    console.log("    Setup cancelled due to missing prerequisites.");
    rl.close();
    return;
  }

  // Determine install location
  const defaultDir = join(homedir(), ".poseidon");
  const installDir = await ask("Install location", defaultDir);

  if (existsSync(join(installDir, "settings.json"))) {
    console.log("    Poseidon is already installed there.\n");
    console.log("    Options:");
    console.log("      1. Full reinstall (overwrite everything)");
    console.log("      2. Add/update API keys only");
    console.log("      3. Cancel\n");
    const choice = await ask("Choose (1/2/3)", "2");

    if (choice === "3" || choice === "cancel") {
      console.log("    Cancelled.");
      rl.close();
      return;
    }

    if (choice === "2") {
      // Just run API key setup on existing install
      const setupScript = join(installDir, "tools", "setup.ts");
      if (existsSync(setupScript)) {
        try {
          rl.close(); // Close readline so setup.ts can use terminal
          execSync(`POSEIDON_DIR="${installDir}" bun "${setupScript}"`, {
            stdio: "inherit",
            cwd: installDir,
          });
        } catch {
          console.log("    Key setup interrupted.");
        }
      } else {
        console.log("    setup.ts not found. Run a full reinstall first.");
      }
      return;
    }

    // choice === "1" — full reinstall, continue below
  }

  try {
    const identity = await stepIdentity();
    const telos = await stepTelos();
    await stepSecrets(installDir);
    const project = await stepProject();
    await stepBuild(installDir, identity, telos, project);
  } catch (err) {
    if (err instanceof Error && err.message.includes("readline was closed")) {
      console.log("\n    Setup cancelled.");
    } else {
      console.error("\n    Error during setup:", err);
    }
  } finally {
    rl.close();
  }
}

main();
