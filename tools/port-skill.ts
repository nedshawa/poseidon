#!/usr/bin/env bun
/**
 * port-skill.ts - Import upstream PAI skill packs into Poseidon
 *
 * Converts TitleCase → lowercase-hyphen naming, adapts YAML frontmatter,
 * strips PAI-specific references, and writes to Poseidon's skills directory.
 *
 * Usage:
 *   bun tools/port-skill.ts <source-pack-dir> [options]
 *   bun tools/port-skill.ts --all <packs-dir> [options]
 *
 * Options:
 *   --all <dir>          Import all packs from directory
 *   --target <dir>       Target skills directory (default: ./skills/)
 *   --dry-run            Show what would be done without writing
 *   --force              Overwrite existing files (default: skip)
 *   --merge              Merge workflows into existing skills (default)
 *   --help               Show this help
 *
 * @author Poseidon System
 * @version 1.0.0
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, cpSync } from "fs";
import { join, basename, extname, dirname, relative } from "path";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

// --- Naming Conversion ---

function toKebabCase(name: string): string {
  return name
    // Insert hyphen before uppercase letters (camelCase/PascalCase)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    // Insert hyphen between consecutive uppercase and lowercase (e.g., OSINTTools → osint-tools)
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    // Lowercase everything
    .toLowerCase()
    // Collapse multiple hyphens
    .replace(/-+/g, "-")
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, "");
}

// --- Content Transformation ---

function transformContent(content: string, filePath: string): string {
  let result = content;

  // Replace PAI-specific voice notification patterns with Poseidon-configurable pattern
  result = result.replace(
    /curl -s -X POST http:\/\/localhost:8888\/notify[^`]*/g,
    "# Voice notification handled by Poseidon's notification system"
  );

  // Replace PAI path references
  result = result.replace(/~\/\.claude\/skills\//g, "skills/");
  result = result.replace(/~\/\.claude\/PAI\//g, "docs/");
  result = result.replace(/~\/\.claude\/MEMORY\//g, "memory/");
  result = result.replace(/~\/\.claude\//g, "");

  // Replace SkillSearch references
  result = result.replace(/SkillSearch\(['"]([^'"]+)['"]\)/g, (_, query) => {
    return `Read: ${toKebabCase(query)}.md`;
  });

  // Don't strip voice notification sections entirely — just mark them as configurable
  result = result.replace(
    /## 🚨 MANDATORY: Voice Notification.*?(?=##|\z)/s,
    "## Notifications\n\nNotifications handled by Poseidon's configurable notification system.\nSee `docs/notifications.md` for configuration.\n\n"
  );

  return result;
}

function transformYamlFrontmatter(content: string, skillName: string): string {
  // Check if file has YAML frontmatter
  if (!content.startsWith("---")) return content;

  const endIdx = content.indexOf("---", 3);
  if (endIdx === -1) return content;

  let frontmatter = content.substring(3, endIdx).trim();
  const body = content.substring(endIdx + 3);

  // Convert name to kebab-case
  frontmatter = frontmatter.replace(
    /^name:\s*.+$/m,
    `name: ${skillName}`
  );

  // Convert single-line description to multi-line if needed
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
  if (descMatch && !frontmatter.includes("description: >")) {
    const desc = descMatch[1].trim();
    frontmatter = frontmatter.replace(
      /^description:\s*.+$/m,
      `description: >-\n  ${desc}`
    );
  }

  return `---\n${frontmatter}\n---${body}`;
}

// --- File Operations ---

interface PortResult {
  source: string;
  dest: string;
  action: "created" | "skipped" | "merged" | "overwritten";
}

function portFile(
  srcPath: string,
  destPath: string,
  skillName: string,
  options: { force: boolean; dryRun: boolean; merge: boolean }
): PortResult {
  const ext = extname(srcPath).toLowerCase();
  const destDir = dirname(destPath);

  // Skip non-portable files
  if ([".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg"].includes(ext)) {
    return { source: srcPath, dest: destPath, action: "skipped" };
  }

  // Check if destination exists
  if (existsSync(destPath) && !options.force && !options.merge) {
    return { source: srcPath, dest: destPath, action: "skipped" };
  }

  if (options.dryRun) {
    return { source: srcPath, dest: destPath, action: existsSync(destPath) ? "merged" : "created" };
  }

  // Read source
  let content: string;
  try {
    content = readFileSync(srcPath, "utf-8");
  } catch {
    return { source: srcPath, dest: destPath, action: "skipped" };
  }

  // Transform based on file type
  if (ext === ".md") {
    content = transformContent(content, srcPath);
    if (basename(srcPath) === "SKILL.md") {
      content = transformYamlFrontmatter(content, skillName);
    }
  }

  // Create directory and write
  mkdirSync(destDir, { recursive: true });
  writeFileSync(destPath, content);

  return {
    source: srcPath,
    dest: destPath,
    action: existsSync(destPath) ? "overwritten" : "created",
  };
}

function convertPath(srcPath: string, srcRoot: string, destRoot: string): string {
  const rel = relative(srcRoot, srcPath);

  // Convert each path segment to kebab-case
  const parts = rel.split("/").map((part) => {
    // Keep SKILL.md as-is
    if (part === "SKILL.md") return part;
    // Keep file extensions
    const ext = extname(part);
    const name = basename(part, ext);
    return toKebabCase(name) + ext.toLowerCase();
  });

  // Flatten "src/" level — upstream PAI has Pack/src/ but Poseidon doesn't
  const filtered = parts.filter((p) => p !== "src");

  return join(destRoot, ...filtered);
}

function portPack(
  packDir: string,
  targetDir: string,
  options: { force: boolean; dryRun: boolean; merge: boolean }
): PortResult[] {
  const packName = basename(packDir);
  const skillName = toKebabCase(packName);
  const destSkillDir = join(targetDir, skillName);

  const results: PortResult[] = [];

  // Find the source directory (pack/src/ or pack/)
  const srcDir = existsSync(join(packDir, "src")) ? join(packDir, "src") : packDir;

  // Walk all files
  function walk(dir: string) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules, .git, etc.
        if (["node_modules", ".git", "Scratchpad"].includes(entry)) continue;
        walk(fullPath);
      } else {
        const destPath = convertPath(fullPath, srcDir, destSkillDir);
        const result = portFile(fullPath, destPath, skillName, options);
        results.push(result);
      }
    }
  }

  walk(srcDir);
  return results;
}

// --- Main ---

const args = process.argv.slice(2);

if (args.includes("--help") || args.length === 0) {
  console.log(`
${BOLD}port-skill${RESET} — Import upstream PAI skill packs into Poseidon

${BOLD}Usage:${RESET}
  bun tools/port-skill.ts <source-pack-dir>          Port one pack
  bun tools/port-skill.ts --all <packs-dir>           Port all packs
  bun tools/port-skill.ts --all /tmp/upstream-pai/Packs/  Example

${BOLD}Options:${RESET}
  --target <dir>   Target skills directory (default: ./skills/)
  --dry-run        Preview without writing
  --force          Overwrite existing files
  --merge          Merge into existing skills (default behavior)
  --help           Show this help

${BOLD}What it does:${RESET}
  1. Converts TitleCase → lowercase-hyphen naming
  2. Adapts YAML frontmatter for Poseidon conventions
  3. Strips PAI-specific paths and voice notifications
  4. Removes src/ nesting level
  5. Writes to Poseidon skills directory
`);
  process.exit(0);
}

const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const merge = args.includes("--merge") || !force; // merge is default
const targetIdx = args.indexOf("--target");
const targetDir = targetIdx >= 0 ? args[targetIdx + 1] : join(process.cwd(), "skills");
const allIdx = args.indexOf("--all");

let allResults: PortResult[] = [];

if (allIdx >= 0) {
  // Port all packs
  const packsDir = args[allIdx + 1];
  if (!packsDir || !existsSync(packsDir)) {
    console.error(`${RED}Packs directory not found: ${packsDir}${RESET}`);
    process.exit(1);
  }

  const packs = readdirSync(packsDir)
    .filter((p) => {
      const full = join(packsDir, p);
      return statSync(full).isDirectory();
    })
    .sort();

  console.log(`\n${BOLD}${CYAN}═══ Porting ${packs.length} PAI Packs → Poseidon ═══${RESET}`);
  if (dryRun) console.log(`${YELLOW}[DRY RUN]${RESET}\n`);

  for (const pack of packs) {
    const packDir = join(packsDir, pack);
    console.log(`\n  ${BOLD}${pack}${RESET} → ${toKebabCase(pack)}/`);

    const results = portPack(packDir, targetDir, { force, dryRun, merge });
    allResults.push(...results);

    const created = results.filter((r) => r.action === "created").length;
    const skipped = results.filter((r) => r.action === "skipped").length;
    const merged = results.filter((r) => r.action === "merged").length;
    const overwritten = results.filter((r) => r.action === "overwritten").length;

    console.log(`    ${GREEN}+${created} created${RESET}  ${YELLOW}~${merged} merged${RESET}  ${DIM}=${skipped} skipped${RESET}${overwritten > 0 ? `  ${RED}!${overwritten} overwritten${RESET}` : ""}`);
  }
} else {
  // Port single pack
  const packDir = args.find((a) => !a.startsWith("--") && args.indexOf(a) !== targetIdx + 1);
  if (!packDir || !existsSync(packDir)) {
    console.error(`${RED}Pack directory not found: ${packDir}${RESET}`);
    process.exit(1);
  }

  console.log(`\n${BOLD}${CYAN}═══ Porting ${basename(packDir)} → Poseidon ═══${RESET}`);
  if (dryRun) console.log(`${YELLOW}[DRY RUN]${RESET}`);

  allResults = portPack(packDir, targetDir, { force, dryRun, merge });
}

// Summary
const totalCreated = allResults.filter((r) => r.action === "created").length;
const totalSkipped = allResults.filter((r) => r.action === "skipped").length;
const totalMerged = allResults.filter((r) => r.action === "merged").length;
const totalOverwritten = allResults.filter((r) => r.action === "overwritten").length;

console.log(`\n${BOLD}═══ Summary ═══${RESET}`);
console.log(`  ${GREEN}Created:${RESET}     ${totalCreated}`);
console.log(`  ${YELLOW}Merged:${RESET}      ${totalMerged}`);
console.log(`  ${DIM}Skipped:${RESET}     ${totalSkipped}`);
if (totalOverwritten > 0) console.log(`  ${RED}Overwritten:${RESET} ${totalOverwritten}`);
console.log(`  ${BOLD}Total:${RESET}       ${allResults.length}\n`);

if (dryRun) {
  console.log(`${YELLOW}This was a dry run. Run without --dry-run to apply changes.${RESET}\n`);
}
