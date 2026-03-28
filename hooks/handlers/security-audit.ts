#!/usr/bin/env bun
/**
 * Security Audit Logging Handler
 *
 * Logs security-relevant events (tool usage, violations, alerts) as JSONL
 * to memory/security/audit.jsonl for post-hoc analysis and compliance.
 */

import { existsSync, appendFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SecurityEvent {
  /** Category: preToolUse, violation, alert, etc. */
  type: string;
  /** Which tool triggered the event */
  tool: string;
  /** Human-readable description of what happened */
  detail: string;
  /** Outcome of the security check */
  action: "blocked" | "confirmed" | "allowed" | "alert";
  /** ISO-8601 timestamp — auto-populated if omitted */
  timestamp?: string;
}

interface AuditRecord {
  timestamp: string;
  type: string;
  tool: string;
  detail: string;
  action: "blocked" | "confirmed" | "allowed" | "alert";
}

// ---------------------------------------------------------------------------
// Resolve base directory
// ---------------------------------------------------------------------------

function resolveBaseDir(): string {
  if (process.env.POSEIDON_DIR) {
    return process.env.POSEIDON_DIR;
  }
  // Fallback: derive from this file's location (hooks/handlers/ → ../..)
  const selfPath = import.meta.path.replace("file://", "");
  return join(dirname(selfPath), "..", "..");
}

// ---------------------------------------------------------------------------
// Ensure the security directory exists
// ---------------------------------------------------------------------------

function ensureSecurityDir(baseDir: string): string {
  const securityDir = join(baseDir, "memory", "security");
  if (!existsSync(securityDir)) {
    try {
      mkdirSync(securityDir, { recursive: true });
    } catch {
      // Directory may have been created by another process — ignore
    }
  }
  return securityDir;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Append a security event to the audit log.
 *
 * Failures are silently swallowed so security logging never disrupts
 * the primary tool pipeline.
 */
export function logSecurityEvent(event: SecurityEvent): void {
  try {
    const baseDir = resolveBaseDir();
    const securityDir = ensureSecurityDir(baseDir);
    const auditPath = join(securityDir, "audit.jsonl");

    const record: AuditRecord = {
      timestamp: event.timestamp ?? new Date().toISOString(),
      type: event.type,
      tool: event.tool,
      detail: event.detail,
      action: event.action,
    };

    appendFileSync(auditPath, JSON.stringify(record) + "\n", "utf-8");
  } catch {
    // Never throw — audit logging must not break callers
  }
}
