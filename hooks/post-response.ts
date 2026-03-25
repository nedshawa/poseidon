#!/usr/bin/env bun
// post-response.ts — Stop hook: capture ratings, detect frustration, log signals
// TRIGGER: Stop (runs after every assistant response)

import { readHookInput, type HookInput } from "./lib/hook-io";
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from "fs";
import { join } from "path";
import {
  getSettingsPath,
  poseidonPath,
  SIGNALS_DIR,
  FAILURES_DIR,
  PROJECTS_DIR,
} from "./lib/paths";

interface Signal {
  timestamp: string;
  type: "explicit" | "implicit";
  score: number;
  context: string;
  session_id: string;
}

function loadFrustrationPatterns(): string[] {
  try {
    const settings = JSON.parse(readFileSync(getSettingsPath(), "utf-8"));
    return settings?.learning?.frustration_patterns || [];
  } catch {
    return [
      "no, that's not", "you forgot", "why did you",
      "that's wrong", "I said", "I already told you",
    ];
  }
}

function getLastUserMessage(transcriptPath: string): string | null {
  try {
    if (!existsSync(transcriptPath)) return null;
    const transcript = JSON.parse(readFileSync(transcriptPath, "utf-8"));
    // Walk backward to find last user message
    for (let i = transcript.length - 1; i >= 0; i--) {
      if (transcript[i].role === "user") {
        const content = transcript[i].content;
        if (typeof content === "string") return content;
        if (Array.isArray(content)) {
          const text = content.find((c: any) => c.type === "text");
          return text?.text || null;
        }
      }
    }
  } catch {
    // transcript may not be parseable
  }
  return null;
}

function detectExplicitRating(userMessage: string): number | null {
  const trimmed = userMessage.trim();
  // Pure number 1-10
  const numMatch = trimmed.match(/^\s*(\d{1,2})\s*$/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (n >= 1 && n <= 10) return n;
  }
  // "rate: 5" or "rating: 5"
  const rateMatch = trimmed.match(/^\s*(?:rate|rating):?\s*(\d{1,2})\s*$/i);
  if (rateMatch) {
    const n = parseInt(rateMatch[1], 10);
    if (n >= 1 && n <= 10) return n;
  }
  return null;
}

function detectFrustration(userMessage: string, patterns: string[]): { detected: boolean; matched: string[] } {
  const lower = userMessage.toLowerCase();
  const matched = patterns.filter((p) => lower.includes(p.toLowerCase()));
  return { detected: matched.length > 0, matched };
}

function summarize(text: string, maxWords = 8): string {
  return text.split(/\s+/).slice(0, maxWords).join(" ");
}

function appendSignal(signal: Signal): void {
  const dir = SIGNALS_DIR();
  mkdirSync(dir, { recursive: true });
  const line = JSON.stringify(signal) + "\n";
  appendFileSync(join(dir, "ratings.jsonl"), line);
}

function createFailureDump(userMessage: string, matched: string[], sessionId: string): void {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:T]/g, "").replace(/\..+/, "").replace(/(\d{8})(\d{6})/, "$1-$2");
  const dir = join(FAILURES_DIR(), stamp);
  mkdirSync(dir, { recursive: true });

  const content = `# Failure Analysis

**Timestamp:** ${now.toISOString()}
**Session:** ${sessionId}

## What the user asked
${userMessage}

## What went wrong
Frustration detected from conversation signals.

## Patterns matched
${matched.map((m) => `- "${m}"`).join("\n")}

## Status
Pending rule candidate generation.
`;
  writeFileSync(join(dir, "ERROR_ANALYSIS.md"), content);
  console.error(`[post-response] Failure dump created: ${dir}`);
}

function updateProjectContext(summary: string): void {
  try {
    const settings = JSON.parse(readFileSync(getSettingsPath(), "utf-8"));
    const projectId = settings?.project?.active_project;
    if (!projectId) return;

    const contextPath = join(PROJECTS_DIR(), projectId, "CONTEXT.md");
    if (!existsSync(contextPath)) return;

    const date = new Date().toISOString().split("T")[0];
    const line = `\nLast session: ${date} — ${summary}\n`;
    appendFileSync(contextPath, line);
    console.error(`[post-response] Updated project context: ${projectId}`);
  } catch {
    // non-blocking
  }
}

async function main() {
  try {
    const input = await readHookInput();
    const sessionId = input.session_id || "unknown";
    const transcriptPath = input.transcript_path;
    const patterns = loadFrustrationPatterns();

    // Get last user message from transcript
    let userMessage: string | null = null;
    if (transcriptPath) {
      userMessage = getLastUserMessage(transcriptPath);
    }

    if (!userMessage) {
      console.error("[post-response] No user message found, skipping");
      return;
    }

    const now = new Date().toISOString();

    // Check for explicit rating
    const rating = detectExplicitRating(userMessage);
    if (rating !== null) {
      const signal: Signal = {
        timestamp: now,
        type: "explicit",
        score: rating,
        context: summarize(userMessage),
        session_id: sessionId,
      };
      appendSignal(signal);
      console.error(`[post-response] Explicit rating: ${rating}`);

      if (rating <= 3) {
        createFailureDump(userMessage, [`Explicit low rating: ${rating}`], sessionId);
      }
      return;
    }

    // Check for frustration signals
    const { detected, matched } = detectFrustration(userMessage, patterns);
    if (detected) {
      const signal: Signal = {
        timestamp: now,
        type: "implicit",
        score: 3,
        context: summarize(userMessage),
        session_id: sessionId,
      };
      appendSignal(signal);
      createFailureDump(userMessage, matched, sessionId);
      console.error(`[post-response] Frustration detected: ${matched.join(", ")}`);
    }

    // Update active project context
    const assistantMsg = input.last_assistant_message || "";
    if (assistantMsg) {
      updateProjectContext(summarize(assistantMsg));

      // Track thinking skill invocations
      try {
        const { detectThinkingMode, logThinkingRun } = await import("./handlers/thinking-tracker");
        const mode = detectThinkingMode(assistantMsg);
        if (mode) {
          logThinkingRun({
            timestamp: new Date().toISOString(),
            session_id: sessionId,
            mode,
            chained: false,
            prompt_summary: (userMessage || "").slice(0, 80),
          });
        }
      } catch {}
    }
  } catch (err) {
    console.error(`[post-response] Error (non-blocking): ${err}`);
  }
}

main();
