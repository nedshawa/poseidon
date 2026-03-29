/**
 * types.ts — Core types for the Poseidon Regime system.
 *
 * A Regime is a declarative governance policy with:
 * - A standard (template/schema defining "correct")
 * - Triggers (when to check compliance)
 * - A validator (deterministic compliance checker)
 * - Enforcement levels (warn/block/auto-fix/report)
 * - An audit trail (JSONL log of every check)
 */

// ── Regime Definition (from REGIME.yaml) ──────────────────

export interface RegimeDefinition {
  name: string;
  version: string;
  description: string;
  scope: RegimeScope;
  enabled: boolean;
  triggers: RegimeTrigger[];
  standard: Record<string, any>; // Regime-specific standard config
  enforcement: Record<string, EnforcementAction>;
  audit: {
    log_path: string;
  };
}

export type RegimeScope =
  | "all-projects"
  | `tagged:${string}`
  | `project:${string}`;

export interface RegimeTrigger {
  event: "session-end" | "project-create" | "pre-prompt" | "pre-tool" | "manual";
  condition: string;
}

export type EnforcementAction = "warn" | "block" | "auto-fix" | "apply-template" | "report";

// ── Validation Results ────────────────────────────────────

export interface RegimeValidation {
  compliant: boolean;
  issues: RegimeIssue[];
  auto_fixable: boolean;
}

export interface RegimeIssue {
  severity: "info" | "warning" | "critical";
  message: string;
  file?: string;
  fix?: string;
}

// ── Validator Function Signature ──────────────────────────

/**
 * Every regime validator exports a function matching this signature.
 * @param projectPath - Absolute path to the project directory
 * @param regimeConfig - The `standard` section from REGIME.yaml
 * @returns Validation result with compliance state and issues
 */
export type RegimeValidator = (
  projectPath: string,
  regimeConfig: Record<string, any>
) => RegimeValidation;

// ── Registry Entry ────────────────────────────────────────

export interface RegistryEntry {
  name: string;
  path: string;
  enabled: boolean;
  description: string;
}

export interface Registry {
  version: string;
  regimes: RegistryEntry[];
}

// ── Audit Log Entry ───────────────────────────────────────

export interface AuditEntry {
  timestamp: string;
  regime: string;
  project: string;
  trigger: string;
  compliant: boolean;
  issues_count: number;
  issues_summary: string[];
  action_taken: EnforcementAction | "none";
}

// ── Runner Result ─────────────────────────────────────────

export interface RegimeRunResult {
  regime: string;
  project: string;
  validation: RegimeValidation;
  enforcement: EnforcementAction;
  audit_logged: boolean;
}
