#!/usr/bin/env bun
/**
 * drift-detection.ts — Detect behavioral drift during long sessions
 *
 * Checks if the AI's responses are drifting from expected patterns:
 * - Mode format compliance (MINIMAL/NATIVE/ALGORITHM headers)
 * - ISC criteria quality (compound vs atomic)
 * - Rule adherence (read-before-modify, minimal scope, etc.)
 *
 * Deterministic only — no AI inference. Pattern matching on transcript.
 *
 * @author Poseidon System
 * @version 1.0.0
 */

import { readFileSync, existsSync } from "fs";

export interface DriftSignal {
  type: "format_drift" | "quality_drift" | "rule_drift";
  detail: string;
  severity: "low" | "medium" | "high";
}

/**
 * Analyze transcript messages for behavioral drift.
 * Returns drift signals if concerning patterns are detected.
 */
export function detectDrift(assistantMessages: string[]): DriftSignal[] {
  const signals: DriftSignal[] = [];
  if (assistantMessages.length < 3) return signals; // Need enough messages to detect drift

  // Check 1: Mode format compliance — responses should start with mode header
  let formatCompliant = 0;
  let formatTotal = 0;
  for (const msg of assistantMessages) {
    formatTotal++;
    if (/═══.*🔱|════.*NATIVE|♻︎.*ALGORITHM|━━━.*\d\/7/.test(msg)) {
      formatCompliant++;
    }
  }
  const formatRate = formatTotal > 0 ? formatCompliant / formatTotal : 1;
  if (formatRate < 0.5 && formatTotal > 3) {
    signals.push({
      type: "format_drift",
      detail: `Only ${Math.round(formatRate * 100)}% of responses follow mode format (${formatCompliant}/${formatTotal})`,
      severity: formatRate < 0.3 ? "high" : "medium",
    });
  }

  // Check 2: Quality drift — later responses getting shorter/less structured
  if (assistantMessages.length >= 6) {
    const firstHalf = assistantMessages.slice(0, Math.floor(assistantMessages.length / 2));
    const secondHalf = assistantMessages.slice(Math.floor(assistantMessages.length / 2));
    const avgFirst = firstHalf.reduce((s, m) => s + m.length, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, m) => s + m.length, 0) / secondHalf.length;
    if (avgSecond < avgFirst * 0.4) {
      signals.push({
        type: "quality_drift",
        detail: `Response length dropped ${Math.round((1 - avgSecond / avgFirst) * 100)}% in second half of session`,
        severity: "medium",
      });
    }
  }

  // Check 3: Rule drift — detecting "I'll just" or "let me quickly" (scope creep indicators)
  let scopeCreepCount = 0;
  for (const msg of assistantMessages.slice(-5)) { // Check last 5 messages
    if (/\b(I'll also|while I'm at it|let me also|bonus|I noticed.*so I|might as well)\b/i.test(msg)) {
      scopeCreepCount++;
    }
  }
  if (scopeCreepCount >= 2) {
    signals.push({
      type: "rule_drift",
      detail: `${scopeCreepCount} scope-creep indicators in last 5 responses`,
      severity: "medium",
    });
  }

  return signals;
}
