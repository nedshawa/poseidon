/**
 * secrets/validator.ts — Validates secret management compliance.
 *
 * Checks:
 * 1. No hardcoded secret patterns in project source files
 * 2. secrets-registry.md exists if project uses secrets
 * 3. Registry lists all secrets the project references
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, extname, relative } from "path";
import type { RegimeValidator, RegimeValidation, RegimeIssue } from "../lib/types";

const validate: RegimeValidator = (projectPath, config): RegimeValidation => {
  const issues: RegimeIssue[] = [];

  const patterns = (config.secret_patterns || []).map((p: string) => new RegExp(p));
  const scanExts = new Set(config.scan_extensions || [".ts", ".js", ".py", ".sh", ".yaml", ".json", ".env"]);
  const ignorePaths = new Set(config.ignore_paths || ["node_modules", ".git", "secrets.enc"]);

  // Collect files to scan
  const filesToScan: string[] = [];
  collectFiles(projectPath, filesToScan, scanExts, ignorePaths, projectPath);

  // Check 1: Scan for hardcoded secrets
  let secretsFound = false;
  for (const file of filesToScan) {
    try {
      const content = readFileSync(file, "utf-8");
      const relPath = relative(projectPath, file);

      for (const pattern of patterns) {
        const matches = content.match(new RegExp(pattern.source, "g"));
        if (matches) {
          // Filter false positives: skip if it's in a comment explaining patterns
          // or in a regex definition
          for (const match of matches) {
            if (isLikelyFalsePositive(content, match)) continue;
            secretsFound = true;
            issues.push({
              severity: "critical",
              message: `Potential hardcoded secret detected: ${match.slice(0, 8)}...`,
              file: relPath,
              fix: `Move to SecretClient and reference via client.read("service", "field")`,
            });
          }
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  // Check 2: secrets-registry.md existence
  const registryFile = config.registry_file || "secrets-registry.md";
  const registryPath = join(projectPath, registryFile);
  const hasRegistry = existsSync(registryPath);

  // Only flag missing registry if project appears to use secrets
  // (has references to SecretClient, .env, or secret patterns in config)
  const usesSecrets = detectSecretUsage(filesToScan);
  if (usesSecrets && !hasRegistry) {
    issues.push({
      severity: "warning",
      message: `Project uses secrets but has no ${registryFile}`,
      file: registryFile,
      fix: `Create ${registryFile} listing all secrets this project requires`,
    });
  }

  // Check 3: If registry exists, verify it documents known secret references
  if (hasRegistry) {
    try {
      const registryContent = readFileSync(registryPath, "utf-8");
      const referencedServices = extractSecretReferences(filesToScan);
      for (const service of referencedServices) {
        if (!registryContent.toLowerCase().includes(service.toLowerCase())) {
          issues.push({
            severity: "info",
            message: `Service "${service}" referenced in code but not documented in registry`,
            file: registryFile,
            fix: `Add "${service}" entry to ${registryFile}`,
          });
        }
      }
    } catch {
      // Registry unreadable
    }
  }

  return {
    compliant: issues.filter((i) => i.severity === "critical").length === 0,
    issues,
    auto_fixable: issues.some((i) => i.fix?.includes("Create")),
  };
};

function collectFiles(
  dir: string,
  results: string[],
  exts: Set<string>,
  ignorePaths: Set<string>,
  rootPath: string
): void {
  // Check if this directory itself should be ignored before reading entries
  const dirName = dir.split("/").pop() || "";
  if (ignorePaths.has(dirName)) return;

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (ignorePaths.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        collectFiles(full, results, exts, ignorePaths, rootPath);
      } else if (exts.has(extname(entry.name))) {
        results.push(full);
      }
    }
  } catch {
    // Permission errors or broken symlinks — skip silently
  }
}

function isLikelyFalsePositive(content: string, match: string): boolean {
  const idx = content.indexOf(match);
  if (idx === -1) return false;

  // Check if match is inside a regex pattern definition or string pattern
  const lineStart = content.lastIndexOf("\n", idx) + 1;
  const line = content.slice(lineStart, content.indexOf("\n", idx));

  // Skip lines that define patterns (regex, key_patterns, etc.)
  if (/key_patterns|RegExp|new RegExp|pattern|\.match\(|\.test\(|\.replace\(/.test(line)) return true;
  // Skip comments
  if (/^\s*(\/\/|#|\*)/.test(line)) return true;
  // Skip lines that are clearly documentation
  if (/^\s*\|/.test(line)) return true; // Table rows

  return false;
}

function detectSecretUsage(files: string[]): boolean {
  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      if (/SecretClient|secret-client|\.env|process\.env\.\w+_KEY|API_KEY|api_key/.test(content)) {
        return true;
      }
    } catch {}
  }
  return false;
}

function extractSecretReferences(files: string[]): string[] {
  const services = new Set<string>();
  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      // Match client.read("service", ...) patterns
      const readMatches = content.matchAll(/\.read\(\s*["'](\w+)["']/g);
      for (const m of readMatches) services.add(m[1]);
      // Match process.env.SERVICE_ patterns
      const envMatches = content.matchAll(/process\.env\.(\w+?)_/g);
      for (const m of envMatches) services.add(m[1].toLowerCase());
    } catch {}
  }
  return [...services];
}

export default validate;
