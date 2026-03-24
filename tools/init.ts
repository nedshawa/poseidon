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
  printStep(1, 5, "Identity");

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
  printStep(2, 5, "Mission (TELOS)");

  const mission = await ask("In one sentence, what are you working toward?");

  console.log("    What are your top 3 goals right now?");
  const goals: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const goal = await ask(`  ${i}`);
    if (goal) goals.push(goal);
  }

  if (!mission && goals.length === 0) {
    console.log("    (You can fill in telos/ files later — skipping for now)");
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
  printStep(3, 5, "Secret Encryption");

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
  printStep(4, 5, "First Project (optional)");

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
  printStep(5, 5, "Building");

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

  // 13. Run rebuild to generate CLAUDE.md
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

  Useful commands:
    bun ${join(installDir, "tools", "rebuild.ts")}   — Regenerate CLAUDE.md after config changes
    bun ${join(installDir, "tools", "secret.ts")}    — Manage encrypted secrets (requires age)

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

  // Determine install location
  const defaultDir = join(homedir(), ".poseidon");
  const installDir = await ask("Install location", defaultDir);

  if (existsSync(join(installDir, "settings.json"))) {
    const overwrite = await askYesNo(
      "Poseidon is already installed there. Overwrite?",
      false
    );
    if (!overwrite) {
      console.log("    Cancelled. Existing installation preserved.");
      rl.close();
      return;
    }
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
