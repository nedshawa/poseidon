#!/usr/bin/env bun
// error-capture.ts — PostToolUse hook: capture errors, fingerprint, log
// TRIGGER: PostToolUse (matcher: Bash, Read, Write, Edit, WebSearch, WebFetch, Grep, Glob)
// Must complete in <50ms. Never blocks tool execution.

import { readHookInput } from "./lib/hook-io";
import { poseidonPath, LEARNING_DIR } from "./lib/paths";
import { classifyError, generateFingerprint } from "./handlers/error-fingerprint";
import { scrubSecrets } from "./handlers/output-scrubber";
import { appendFileSync, mkdirSync, existsSync } from "fs";

const SKIP_TOOLS = new Set(["Grep", "Glob"]);

function extractOutput(input: Record<string, any>): { text: string; exitCode: number | null } {
  // PostToolUse provides tool_output (string or object)
  const raw = input.tool_output ?? input.output ?? "";
  let text = typeof raw === "string" ? raw : JSON.stringify(raw);
  let exitCode: number | null = null;

  // Extract exit code from Bash output
  if (input.tool_name === "Bash") {
    const ecMatch = text.match(/Exit code[:\s]+(\d+)/i);
    if (ecMatch) exitCode = parseInt(ecMatch[1], 10);
    // Also check structured exit_code field
    if (input.tool_output?.exit_code != null) exitCode = input.tool_output.exit_code;
  }

  return { text: text.slice(0, 2000), exitCode };
}

function hasError(tool: string, text: string, exitCode: number | null): boolean {
  if (SKIP_TOOLS.has(tool)) return false;

  if (tool === "Bash") {
    if (exitCode !== null && exitCode !== 0) return true;
    if (/ENOENT|EACCES|connection refused|timed?\s?out|401|403|429|500/i.test(text)) return true;
    return false;
  }
  if (tool === "Read") {
    return /file not found|permission denied|exceeds maximum|does not exist/i.test(text);
  }
  if (tool === "Write" || tool === "Edit") {
    return /not unique|old_string.*not found|failed/i.test(text);
  }
  if (tool === "WebSearch" || tool === "WebFetch") {
    if (/error|failed/i.test(text) && text.length < 200) return true;
    return false;
  }
  return false;
}

async function main() {
  try {
    const input = await readHookInput(200);
    const tool = input.tool_name || "unknown";

    if (SKIP_TOOLS.has(tool)) return;

    const { text, exitCode } = extractOutput(input);
    if (!hasError(tool, text, exitCode)) {
      console.error(`\u2699 PostTool \u2502 ${tool} \u2502 \u2713 no error`);
      return;
    }

    // Classify the error
    const signal = classifyError(tool, text, exitCode);
    if (!signal) {
      console.error(`\u2699 PostTool \u2502 ${tool} \u2502 \u2713 no error`);
      return;
    }

    // Generate fingerprint
    const fingerprint = generateFingerprint(signal);

    // Scrub secrets before logging
    const scrubbed = scrubSecrets(signal.message);
    const inputSummary = scrubSecrets(
      JSON.stringify(input.tool_input || {}).slice(0, 200)
    );

    // Build log entry
    const entry = {
      ts: new Date().toISOString(),
      session_id: input.session_id || "unknown",
      tool,
      exit_code: exitCode,
      error_class: signal.errorClass,
      message: scrubbed.slice(0, 500),
      fingerprint,
      input_summary: inputSummary,
    };

    // Append to error log
    const logDir = LEARNING_DIR();
    if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
    const logPath = poseidonPath("memory", "learning", "error-log.jsonl");
    appendFileSync(logPath, JSON.stringify(entry) + "\n");

    const exitStr = exitCode !== null ? `exit ${exitCode}` : "error";
    console.error(`\u2699 PostTool \u2502 ${tool} \u2502 ${exitStr} \u2502 ${signal.errorClass} \u2502 fingerprint: ${fingerprint}`);
  } catch (err) {
    // Never block tool execution
    console.error(`\u2699 PostTool \u2502 error: ${err}`);
  }
}

main();
