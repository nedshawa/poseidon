#!/usr/bin/env bun
/**
 * work-completion.ts — Capture structured reflections from completed work
 *
 * Hook-level learning capture that runs at SessionEnd. Catches sessions
 * that skip the Algorithm LEARN phase (native mode work, interrupted sessions).
 *
 * @author Poseidon System
 * @version 1.0.0
 */

import { readFileSync, appendFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";

const POSEIDON_DIR = process.env.POSEIDON_DIR || join(dirname(import.meta.path.replace("file://", "")), "..", "..");

interface WorkReflection {
  timestamp: string;
  session_id: string;
  effort_estimate: "quick" | "medium" | "complex";
  tools_used: string[];
  files_changed: number;
  errors_detected: number;
  sentiment: "positive" | "negative" | "neutral";
}

/**
 * Analyze transcript for work completion signals.
 */
export function analyzeWorkCompletion(
  userMessages: string[],
  assistantMessages: string[],
  sessionId: string
): WorkReflection {
  const now = new Date().toISOString();

  // Estimate effort from message count and length
  const totalLength = [...userMessages, ...assistantMessages].reduce((s, m) => s + m.length, 0);
  const effort: "quick" | "medium" | "complex" =
    totalLength > 50000 ? "complex" : totalLength > 10000 ? "medium" : "quick";

  // Detect tools used from assistant messages
  const toolPatterns: Record<string, RegExp> = {
    "Bash": /Bash\(|```bash/,
    "Read": /Read\(|read.*file/i,
    "Write": /Write\(|wrote.*file|created.*file/i,
    "Edit": /Edit\(|edited.*file/i,
    "Agent": /Agent\(|background.*agent|parallel.*agent/i,
    "Research": /Research.*Launching|🔍.*Research|research.*agent/i,
    "Thinking": /💭.*Thinking|first.principles|council|red.team/i,
  };
  const tools_used: string[] = [];
  const allAssistant = assistantMessages.join("\n");
  for (const [tool, pattern] of Object.entries(toolPatterns)) {
    if (pattern.test(allAssistant)) tools_used.push(tool);
  }

  // Count file changes mentioned
  const fileChangePattern = /(?:created|wrote|edited|modified|updated)\s+\d+\s+file/gi;
  const fileMatches = allAssistant.match(fileChangePattern) || [];
  let files_changed = 0;
  for (const m of fileMatches) {
    const num = m.match(/\d+/);
    if (num) files_changed += parseInt(num[0]);
  }

  // Detect errors
  const errorPatterns = /error|failed|FAIL|✗|✘|exception|crashed|broke/gi;
  const errors_detected = (allAssistant.match(errorPatterns) || []).length;

  // Sentiment from user messages
  const lastUserMsg = userMessages[userMessages.length - 1] || "";
  let sentiment: "positive" | "negative" | "neutral" = "neutral";
  if (/great|perfect|awesome|excellent|good job|nice|love it|works/i.test(lastUserMsg)) sentiment = "positive";
  if (/wrong|bad|no|fail|broken|terrible|frustrated/i.test(lastUserMsg)) sentiment = "negative";

  return {
    timestamp: now,
    session_id: sessionId,
    effort_estimate: effort,
    tools_used,
    files_changed,
    errors_detected: Math.min(errors_detected, 20), // Cap to avoid noise
    sentiment,
  };
}

/**
 * Persist work completion reflection to JSONL.
 */
export function persistWorkReflection(reflection: WorkReflection): void {
  try {
    const signalsDir = join(POSEIDON_DIR, "memory", "learning", "signals");
    mkdirSync(signalsDir, { recursive: true });
    const filePath = join(signalsDir, "work-completions.jsonl");
    appendFileSync(filePath, JSON.stringify(reflection) + "\n");
  } catch {}
}
