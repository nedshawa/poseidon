/**
 * hook-latency/validator.ts — Validates hooks stay within latency budget proxies.
 *
 * Since we can't measure actual runtime in a static validator, we use proxies:
 * 1. Hook file line count vs budget (lines_per_ms ratio)
 * 2. Handler import count per hook (more imports = more work = more latency)
 * 3. Hook file existence and basic structure
 *
 * Budgets (ms): session-start:200, pre-prompt:100, pre-tool:50, post-response:300, session-end:500
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { RegimeValidator, RegimeValidation, RegimeIssue } from "../lib/types";

interface HookBudget {
  file: string;
  budgetMs: number;
}

const HOOK_MAP: Record<string, string> = {
  "session-start": "session-start.ts",
  "pre-prompt": "pre-prompt.ts",
  "pre-tool": "pre-tool.ts",
  "post-response": "post-response.ts",
  "session-end": "session-end.ts",
};

const validate: RegimeValidator = (projectPath, config): RegimeValidation => {
  const issues: RegimeIssue[] = [];

  const hooksDir = join(projectPath, config.hooks_dir || "hooks");
  if (!existsSync(hooksDir)) {
    issues.push({ severity: "critical", message: "hooks/ directory not found" });
    return { compliant: false, issues, auto_fixable: false };
  }

  const budgets: Record<string, number> = config.budgets || {
    "session-start": 200,
    "pre-prompt": 100,
    "pre-tool": 50,
    "post-response": 300,
    "session-end": 500,
  };
  const maxLinesPerMs = config.max_lines_per_ms || 1.5;
  const maxHandlerImports = config.max_handler_imports || 8;

  for (const [hookName, fileName] of Object.entries(HOOK_MAP)) {
    const hookPath = join(hooksDir, fileName);
    const budgetMs = budgets[hookName];

    if (!existsSync(hookPath)) {
      issues.push({
        severity: "warning",
        message: `Hook file missing: hooks/${fileName}`,
        file: `hooks/${fileName}`,
        fix: `Create ${fileName} or remove from hook configuration`,
      });
      continue;
    }

    const content = readFileSync(hookPath, "utf-8");
    const lines = content.split("\n").length;

    // Check 1: Line count vs budget proxy
    // Heuristic: more lines = more work. If lines > budget * ratio, flag as risk.
    if (budgetMs) {
      const maxLines = Math.floor(budgetMs * maxLinesPerMs);
      if (lines > maxLines) {
        issues.push({
          severity: "warning",
          message: `hooks/${fileName} is ${lines} lines (budget proxy max: ${maxLines} for ${budgetMs}ms)`,
          file: `hooks/${fileName}`,
          fix: `Refactor to reduce complexity — extract logic to handlers or split concerns`,
        });
      }
    }

    // Check 2: Handler import count
    const importMatches = content.match(/require\(["']\.\/handlers\//g) || [];
    const staticImports = content.match(/from\s+["']\.\/handlers\//g) || [];
    const totalImports = importMatches.length + staticImports.length;

    if (totalImports > maxHandlerImports) {
      issues.push({
        severity: "info",
        message: `hooks/${fileName} imports ${totalImports} handlers (recommended max: ${maxHandlerImports})`,
        file: `hooks/${fileName}`,
        fix: `Consider consolidating handler calls or deferring non-critical handlers`,
      });
    }

    // Check 3: Detect blocking patterns (synchronous heavy operations)
    const blockingPatterns = [
      { pattern: /execSync\(/, label: "execSync" },
      { pattern: /readFileSync\(.*\)[\s\S]{0,20}JSON\.parse/g, label: "sync JSON parse" },
    ];
    let blockingCount = 0;
    for (const { pattern, label } of blockingPatterns) {
      const matches = content.match(pattern);
      if (matches) blockingCount += matches.length;
    }
    // Only flag if the hook has a tight budget and many blocking calls
    if (budgetMs && budgetMs <= 100 && blockingCount > 5) {
      issues.push({
        severity: "info",
        message: `hooks/${fileName} has ${blockingCount} blocking I/O calls with ${budgetMs}ms budget`,
        file: `hooks/${fileName}`,
        fix: `Consider async alternatives for tight-budget hooks`,
      });
    }
  }

  return {
    compliant: issues.filter((i) => i.severity === "critical").length === 0,
    issues,
    auto_fixable: false,
  };
};

export default validate;
