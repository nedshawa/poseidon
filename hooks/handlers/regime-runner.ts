/**
 * regime-runner.ts — Core enforcement engine for the Poseidon Regime system.
 *
 * Reads REGISTRY.yaml, loads matching regimes, runs validators,
 * applies enforcement, and logs audit entries.
 *
 * No hardcoded regime names — everything driven by REGISTRY.yaml.
 */

import { readFileSync, appendFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { poseidonPath, PROJECTS_DIR } from "../lib/paths";
import type {
  Registry,
  RegistryEntry,
  RegimeDefinition,
  RegimeValidator,
  RegimeValidation,
  RegimeRunResult,
  AuditEntry,
  EnforcementAction,
} from "../../regimes/lib/types";

// ── YAML Parser (minimal, no dependencies) ────────────────

function parseSimpleYaml(content: string): Record<string, any> {
  // Handles the subset of YAML used in REGIME.yaml and REGISTRY.yaml
  // For production, consider using a proper parser — this handles our specific schemas
  const result: Record<string, any> = {};
  const lines = content.split("\n");
  let currentKey = "";
  let currentArray: any[] | null = null;
  let currentArrayKey = "";

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = line.length - line.trimStart().length;

    // Array item
    if (trimmed.match(/^\s*-\s+/)) {
      const value = trimmed.replace(/^\s*-\s+/, "").trim();

      // Check if it's a key-value map item (e.g., "- name: foo")
      const kvMatch = value.match(/^(\w+):\s*(.+)/);
      if (kvMatch && currentArrayKey) {
        if (!currentArray) currentArray = [];
        // Start a new map item or extend current
        const lastItem = currentArray[currentArray.length - 1];
        if (!lastItem || typeof lastItem !== "object" || lastItem[kvMatch[1]] !== undefined) {
          const obj: Record<string, any> = {};
          obj[kvMatch[1]] = cleanYamlValue(kvMatch[2]);
          currentArray.push(obj);
        } else {
          lastItem[kvMatch[1]] = cleanYamlValue(kvMatch[2]);
        }
      } else if (currentArrayKey) {
        if (!currentArray) currentArray = [];
        currentArray.push(cleanYamlValue(value));
      }
      continue;
    }

    // Continuation of array map item (indented key under array item)
    if (indent >= 4 && currentArray && currentArray.length > 0) {
      const kvMatch = trimmed.match(/^(\w+):\s*(.+)/);
      if (kvMatch) {
        const lastItem = currentArray[currentArray.length - 1];
        if (typeof lastItem === "object") {
          lastItem[kvMatch[1]] = cleanYamlValue(kvMatch[2]);
        }
        continue;
      }
    }

    // Key-value pair
    const kvMatch = trimmed.match(/^(\w[\w_]*)\s*:\s*(.*)/);
    if (kvMatch) {
      // Flush previous array
      if (currentArray !== null && currentArrayKey) {
        setNestedValue(result, currentArrayKey, currentArray);
        currentArray = null;
        currentArrayKey = "";
      }

      const key = kvMatch[1];
      const value = kvMatch[2].trim();

      if (!value) {
        // Could be start of a nested object or array
        currentKey = key;
        currentArrayKey = key;
        currentArray = null;
      } else {
        currentKey = key;
        result[key] = cleanYamlValue(value);
        currentArrayKey = "";
        currentArray = null;
      }
    }
  }

  // Flush final array
  if (currentArray !== null && currentArrayKey) {
    setNestedValue(result, currentArrayKey, currentArray);
  }

  return result;
}

function cleanYamlValue(val: string): any {
  const trimmed = val.replace(/\s*#.*$/, "").trim(); // Remove inline comments
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  // Remove quotes
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function setNestedValue(obj: Record<string, any>, key: string, value: any): void {
  obj[key] = value;
}

// ── Registry Loading ──────────────────────────────────────

function loadRegistry(): Registry {
  const registryPath = poseidonPath("regimes", "REGISTRY.yaml");
  if (!existsSync(registryPath)) {
    return { version: "1.0", regimes: [] };
  }
  const content = readFileSync(registryPath, "utf-8");

  // Parse the YAML registry
  const regimes: RegistryEntry[] = [];
  const lines = content.split("\n");
  let currentEntry: Partial<RegistryEntry> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- name:")) {
      if (currentEntry.name) regimes.push(currentEntry as RegistryEntry);
      currentEntry = { name: trimmed.replace("- name:", "").trim() };
    } else if (trimmed.startsWith("path:") && currentEntry.name) {
      currentEntry.path = trimmed.replace("path:", "").trim();
    } else if (trimmed.startsWith("enabled:") && currentEntry.name) {
      currentEntry.enabled = trimmed.replace("enabled:", "").trim() === "true";
    } else if (trimmed.startsWith("description:") && currentEntry.name) {
      currentEntry.description = trimmed.replace("description:", "").trim().replace(/^"(.*)"$/, "$1");
    }
  }
  if (currentEntry.name) regimes.push(currentEntry as RegistryEntry);

  return { version: "1.0", regimes };
}

// ── Regime Loading ────────────────────────────────────────

function loadRegimeDefinition(regimePath: string): RegimeDefinition | null {
  const yamlPath = join(regimePath, "REGIME.yaml");
  if (!existsSync(yamlPath)) return null;

  try {
    const content = readFileSync(yamlPath, "utf-8");
    const parsed = parseSimpleYaml(content);
    return parsed as unknown as RegimeDefinition;
  } catch {
    return null;
  }
}

async function loadValidator(regimePath: string): Promise<RegimeValidator | null> {
  const validatorPath = join(regimePath, "validator.ts");
  if (!existsSync(validatorPath)) return null;

  try {
    const mod = await import(validatorPath);
    return mod.default as RegimeValidator;
  } catch (err) {
    console.error(`⚙ RegimeRunner │ validator load failed: ${validatorPath}: ${err}`);
    return null;
  }
}

// ── Project Discovery ─────────────────────────────────────

function getProjectPaths(): { id: string; path: string }[] {
  const projects: { id: string; path: string }[] = [];
  const projectsDir = PROJECTS_DIR();

  if (!existsSync(projectsDir)) return projects;

  const entries = readdirSync(projectsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const metaPath = join(projectsDir, entry.name, "META.yaml");
    if (existsSync(metaPath)) {
      // Try to read the project's actual path from META.yaml
      // Fall back to the memory directory itself
      projects.push({
        id: entry.name,
        path: join(projectsDir, entry.name),
      });
    }
  }

  // Also check the main Poseidon directory itself
  projects.push({
    id: "_poseidon",
    path: poseidonPath(),
  });

  return projects;
}

// ── Scope Matching ────────────────────────────────────────

function matchesScope(scope: string, projectId: string): boolean {
  if (scope === "all-projects") return true;
  if (scope.startsWith("project:")) return scope.slice(8) === projectId;
  // tagged: scope requires reading META.yaml tags — deferred until projects use tags
  if (scope.startsWith("tagged:")) return false;
  return true;
}

// ── Audit Logging ─────────────────────────────────────────

function logAudit(entry: AuditEntry, logPath: string): void {
  try {
    const fullPath = poseidonPath(logPath);
    const dir = dirname(fullPath);
    mkdirSync(dir, { recursive: true });
    appendFileSync(fullPath, JSON.stringify(entry) + "\n");
  } catch {
    // Non-blocking — audit failure shouldn't break enforcement
  }
}

// ── Public API ────────────────────────────────────────────

export interface RunOptions {
  trigger: string;
  regimeFilter?: string;   // Run only this regime
  projectFilter?: string;  // Run only against this project
}

/**
 * Run all matching regimes against all matching projects.
 * Returns structured results for each regime × project combination.
 */
export async function runRegimes(options: RunOptions): Promise<RegimeRunResult[]> {
  const results: RegimeRunResult[] = [];
  const registry = loadRegistry();
  const projects = getProjectPaths();
  const regimesDir = poseidonPath("regimes");

  for (const entry of registry.regimes) {
    if (!entry.enabled) continue;
    if (options.regimeFilter && entry.name !== options.regimeFilter) continue;

    const regimePath = join(regimesDir, entry.path);
    const definition = loadRegimeDefinition(regimePath);
    if (!definition) continue;

    // Check if this trigger matches
    const triggerMatch = (definition.triggers || []).some(
      (t) => t.event === options.trigger || options.trigger === "manual"
    );
    if (!triggerMatch) continue;

    // Load validator
    const validator = await loadValidator(regimePath);
    if (!validator) continue;

    // Run against each project
    for (const project of projects) {
      if (options.projectFilter && project.id !== options.projectFilter) continue;

      const scope = definition.scope || "all-projects";
      if (!matchesScope(scope, project.id)) continue;

      // Execute validation
      let validation: RegimeValidation;
      try {
        validation = validator(project.path, definition.standard || {});
      } catch (err) {
        validation = {
          compliant: false,
          issues: [{
            severity: "critical",
            message: `Validator error: ${err}`,
          }],
          auto_fixable: false,
        };
      }

      // Determine enforcement action
      const enforcementKey = `on_${options.trigger.replace("-", "_")}`;
      const enforcement: EnforcementAction =
        (definition.enforcement?.[enforcementKey] as EnforcementAction) || "report";

      // Log audit
      const auditEntry: AuditEntry = {
        timestamp: new Date().toISOString(),
        regime: entry.name,
        project: project.id,
        trigger: options.trigger,
        compliant: validation.compliant,
        issues_count: validation.issues.length,
        issues_summary: validation.issues.slice(0, 5).map((i) => `[${i.severity}] ${i.message}`),
        action_taken: validation.compliant ? "none" : enforcement,
      };
      const logPath = definition.audit?.log_path || `memory/learning/regimes/${entry.name}.jsonl`;
      logAudit(auditEntry, logPath);

      results.push({
        regime: entry.name,
        project: project.id,
        validation,
        enforcement,
        audit_logged: true,
      });
    }
  }

  return results;
}

/**
 * Get regime warnings for injection into pre-prompt.
 * Returns formatted warning strings for non-compliant regimes.
 */
export async function getRegimeWarnings(projectId?: string): Promise<string[]> {
  const results = await runRegimes({
    trigger: "manual",
    projectFilter: projectId,
  });

  const warnings: string[] = [];
  for (const r of results) {
    if (!r.validation.compliant) {
      const criticalIssues = r.validation.issues.filter((i) => i.severity === "critical");
      const warningIssues = r.validation.issues.filter((i) => i.severity === "warning");
      if (criticalIssues.length > 0) {
        warnings.push(
          `⚠️ [${r.regime}] ${r.project}: ${criticalIssues.length} critical issue(s) — ${criticalIssues[0].message}`
        );
      } else if (warningIssues.length > 0) {
        warnings.push(
          `⚠️ [${r.regime}] ${r.project}: ${warningIssues[0].message}`
        );
      }
    }
  }

  return warnings;
}
