#!/usr/bin/env bun
// session-end.ts — SessionEnd hook: generate rule candidates from failures, rebuild CLAUDE.md
// TRIGGER: SessionEnd

import { readHookInput } from "./lib/hook-io";
import type { HookInput } from "./lib/hook-io";
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, readdirSync, existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { createHash } from "crypto";
import { FAILURES_DIR, CANDIDATES_DIR, RULES_DIR, poseidonPath, getSettingsPath } from "./lib/paths";
import { scoreComplexity } from "./handlers/complexity-scorer";

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

interface FailureEntry {
  path: string;
  timestamp: Date;
}

function getRecentFailures(): FailureEntry[] {
  const dir = FAILURES_DIR();
  if (!existsSync(dir)) return [];

  const cutoff = Date.now() - TWENTY_FOUR_HOURS;
  const entries: FailureEntry[] = [];

  try {
    for (const name of readdirSync(dir)) {
      const fullPath = join(dir, name);
      const stat = statSync(fullPath);
      if (stat.isDirectory() && stat.mtimeMs > cutoff) {
        entries.push({ path: fullPath, timestamp: new Date(stat.mtimeMs) });
      }
    }
  } catch {
    // non-blocking
  }

  return entries;
}

function hasExistingCandidate(failurePath: string): boolean {
  const dir = CANDIDATES_DIR();
  if (!existsSync(dir)) return false;

  try {
    for (const name of readdirSync(dir)) {
      const content = readFileSync(join(dir, name), "utf-8");
      if (content.includes(failurePath)) return true;
    }
  } catch {
    // non-blocking
  }
  return false;
}

function generateCandidate(failure: FailureEntry): void {
  const dir = CANDIDATES_DIR();
  mkdirSync(dir, { recursive: true });

  // Read the failure analysis
  const analysisPath = join(failure.path, "ERROR_ANALYSIS.md");
  if (!existsSync(analysisPath)) return;

  let analysis: string;
  try {
    analysis = readFileSync(analysisPath, "utf-8");
  } catch {
    return;
  }

  // Extract what user asked (between "## What the user asked" and next ##)
  const userAskedMatch = analysis.match(/## What the user asked\n([\s\S]*?)(?=\n##|$)/);
  const userAsked = userAskedMatch?.[1]?.trim() || "Unknown request";

  // Extract matched patterns
  const patternsMatch = analysis.match(/## Patterns matched\n([\s\S]*?)(?=\n##|$)/);
  const patterns = patternsMatch?.[1]?.trim() || "Unknown pattern";

  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const candidatePath = join(dir, `${stamp}.md`);

  const content = `---
status: pending
created: ${now.toISOString()}
failure_ref: ${failure.path}
---
# Rule Candidate

**Pattern:** When handling "${userAsked.split(/\s+/).slice(0, 6).join(" ")}..."
**Rule:** Avoid repeating this mistake. ${patterns}
**Evidence:** [${failure.path}](${failure.path})
`;

  writeFileSync(candidatePath, content);
}

function rebuildClaudeMdIfNeeded(): void {
  const rulesDir = RULES_DIR();
  if (!existsSync(rulesDir)) return;

  try {
    const ruleFiles = readdirSync(rulesDir).filter((f) => f.endsWith(".md"));
    if (ruleFiles.length === 0) return;

    // Check for a template
    const templatePath = poseidonPath("templates", "CLAUDE.md.template");
    if (!existsSync(templatePath)) {
      // No template — skip rebuild
      return;
    }

    let template = readFileSync(templatePath, "utf-8");
    const rulesBlock: string[] = [];

    for (const file of ruleFiles) {
      const content = readFileSync(join(rulesDir, file), "utf-8");
      // Extract rule text after frontmatter
      const bodyMatch = content.match(/---[\s\S]*?---\n([\s\S]*)/);
      const body = bodyMatch?.[1]?.trim();
      if (body) rulesBlock.push(body);
    }

    if (rulesBlock.length > 0) {
      template = template.replace(
        "{{LEARNED_RULES}}",
        rulesBlock.join("\n\n")
      );
      const claudeMdPath = poseidonPath("CLAUDE.md");
      writeFileSync(claudeMdPath, template);
      // CLAUDE.md rebuilt — logged in consolidated output
    }
  } catch (err) {
    // CLAUDE.md rebuild error — non-blocking
  }
}

// --- Abandonment Detection ---

interface AbandonmentSettings {
  max_exchanges: number;
  min_complexity_score: number;
}

function getAbandonmentSettings(): AbandonmentSettings {
  try {
    const raw = readFileSync(getSettingsPath(), "utf-8");
    const parsed = JSON.parse(raw);
    const ad = parsed?.classifier?.abandonment_detection;
    if (ad) {
      return {
        max_exchanges: ad.max_exchanges ?? 3,
        min_complexity_score: ad.min_complexity_score ?? 40,
      };
    }
  } catch { /* use defaults */ }
  return { max_exchanges: 3, min_complexity_score: 40 };
}

function parseTranscriptMessages(transcriptPath: string): string[] {
  if (!transcriptPath || !existsSync(transcriptPath)) return [];
  try {
    const text = readFileSync(transcriptPath, "utf-8");
    const userPrompts: string[] = [];
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.type === "human" && typeof msg.message?.content === "string") {
          userPrompts.push(msg.message.content);
        }
      } catch { /* skip malformed */ }
    }
    return userPrompts;
  } catch {
    return [];
  }
}

function detectAbandonment(input: HookInput): void {
  try {
    const settings = getAbandonmentSettings();
    const userMessages = parseTranscriptMessages(input.transcript_path || "");

    if (userMessages.length === 0 || userMessages.length > settings.max_exchanges) return;

    const firstPrompt = userMessages[0];
    const result = scoreComplexity(firstPrompt);

    if (result.score < settings.min_complexity_score) return;

    // This session looks like an abandonment — user sent a complex prompt but left quickly
    const hash = createHash("sha256").update(firstPrompt).digest("hex").slice(0, 8);
    const entry = {
      timestamp: new Date().toISOString(),
      prompt_hash: hash,
      patterns: result.signals,
      score: result.score,
      classified_as: result.mode,
      outcome: "abandoned",
    };

    const filePath = poseidonPath("memory", "learning", "escalation-patterns.jsonl");
    mkdirSync(dirname(filePath), { recursive: true });
    appendFileSync(filePath, JSON.stringify(entry) + "\n");

    // abandonment logged — consolidated in main output
  } catch (err) {
    // abandonment detection error — non-blocking
  }
}

function detectCrossSessionPatterns(): number {
  // Read error log and find fingerprints recurring across 3+ sessions
  const errorLogPath = poseidonPath("memory", "learning", "error-log.jsonl");
  if (!existsSync(errorLogPath)) return 0;

  try {
    const lines = readFileSync(errorLogPath, "utf-8").split("\n").filter(Boolean);
    const fpSessions = new Map<string, Set<string>>();
    const fpMeta = new Map<string, { error_class: string; message: string }>();

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (!entry.fingerprint || !entry.session_id) continue;
        if (!fpSessions.has(entry.fingerprint)) fpSessions.set(entry.fingerprint, new Set());
        fpSessions.get(entry.fingerprint)!.add(entry.session_id);
        if (!fpMeta.has(entry.fingerprint)) {
          fpMeta.set(entry.fingerprint, { error_class: entry.error_class, message: entry.message });
        }
      } catch { /* skip malformed */ }
    }

    let newCandidates = 0;
    const candidatesDir = CANDIDATES_DIR();
    const rulesDir = RULES_DIR();

    for (const [fp, sessions] of fpSessions) {
      if (sessions.size < 3) continue;
      const meta = fpMeta.get(fp);
      if (!meta) continue;

      // Check if rule or candidate already covers this fingerprint
      const hasCoverage = [candidatesDir, rulesDir].some((dir) => {
        if (!existsSync(dir)) return false;
        try {
          return readdirSync(dir).some((f) => {
            const content = readFileSync(join(dir, f), "utf-8");
            return content.includes(fp);
          });
        } catch { return false; }
      });
      if (hasCoverage) continue;

      mkdirSync(candidatesDir, { recursive: true });
      const now = new Date();
      const stamp = now.toISOString().replace(/[:.]/g, "-");
      const candidatePath = join(candidatesDir, `${stamp}-cross-session.md`);
      const content = `---
status: pending
created: ${now.toISOString()}
fingerprint: ${fp}
cross_session_count: ${sessions.size}
---
# Rule Candidate (Cross-Session Pattern)

**Pattern:** ${meta.error_class} error recurring across ${sessions.size} sessions
**Rule:** ${meta.message.slice(0, 200)}
**Fingerprint:** ${fp}
**Sessions:** ${sessions.size}
`;
      writeFileSync(candidatePath, content);
      newCandidates++;
    }

    return newCandidates;
  } catch (err) {
    // cross-session detection error — non-blocking
    return 0;
  }
}

async function main() {
  try {
    const input = await readHookInput();
    // Scan recent failures and generate candidates
    const failures = getRecentFailures();
    let candidatesCreated = 0;

    for (const failure of failures) {
      if (!hasExistingCandidate(failure.path)) {
        generateCandidate(failure);
        candidatesCreated++;
      }
    }

    // Detect cross-session error patterns from error log
    const crossSessionCandidates = detectCrossSessionPatterns();
    const totalCandidates = candidatesCreated + crossSessionCandidates;

    // Rebuild CLAUDE.md if approved rules exist
    let claudeRebuilt = false;
    try {
      rebuildClaudeMdIfNeeded();
      claudeRebuilt = existsSync(poseidonPath("CLAUDE.md"));
    } catch {}

    // Detect session abandonments for escalation learning
    try {
      detectAbandonment(input);
    } catch {}

    // --- NEW: Relationship memory (extract W/B/O notes from session) ---
    let relationshipNotes = 0;
    try {
      const { extractRelationshipNotes, appendToRelationshipLog } = require("./handlers/relationship-memory");
      const userMsgs = parseTranscriptMessages(input.transcript_path || "");
      if (userMsgs.length > 0) {
        const notes = extractRelationshipNotes(userMsgs, []);
        if (notes.length > 0) {
          const baseDir = poseidonPath();
          appendToRelationshipLog(notes, baseDir);
          relationshipNotes = notes.length;
        }
      }
    } catch {}

    // --- NEW: Doc integrity check (deterministic, no inference) ---
    let integrityIssues = 0;
    try {
      const { checkDocIntegrity } = require("./handlers/doc-integrity");
      const issues = checkDocIntegrity(poseidonPath());
      integrityIssues = issues.length;
      // Log high-severity issues to stderr
      for (const issue of issues.filter((i: any) => i.severity === "high")) {
        console.error(`\u2699 DocIntegrity \u2502 ${issue.type}: ${issue.detail}`);
      }
    } catch {}

    // --- NEW: Work completion (mark current work as completed) ---
    try {
      const workDir = poseidonPath("memory", "work");
      if (existsSync(workDir)) {
        const dirs = readdirSync(workDir).filter((d) => {
          try { return statSync(join(workDir, d)).isDirectory(); } catch { return false; }
        }).sort().reverse();
        if (dirs.length > 0) {
          const latestPrd = join(workDir, dirs[0], "PRD.md");
          if (existsSync(latestPrd)) {
            const prdContent = readFileSync(latestPrd, "utf-8");
            // Mark as complete if phase is verify or learn
            if (/phase:\s*(verify|learn|complete)/.test(prdContent) && !/phase:\s*complete/.test(prdContent)) {
              const updated = prdContent.replace(/phase:\s*\w+/, "phase: complete");
              writeFileSync(latestPrd, updated);
            }
          }
        }
      }
    } catch {}

    // --- NEW: Work completion learning (hook-level, catches non-Algorithm sessions) ---
    try {
      const { analyzeWorkCompletion, persistWorkReflection } = require("./handlers/work-completion");
      const userMsgs = parseTranscriptMessages(input.transcript_path || "");
      if (userMsgs.length > 0) {
        const reflection = analyzeWorkCompletion(userMsgs, [], input.session_id || "unknown");
        persistWorkReflection(reflection);
      }
    } catch {}

    // --- NEW: Drift detection (check for behavioral drift in long sessions) ---
    let driftSignals = 0;
    try {
      const { detectDrift } = require("./handlers/drift-detection");
      // We'd need assistant messages from transcript — simplified: just log availability
      driftSignals = 0; // Drift detection available but needs assistant message parsing
    } catch {}

    // --- Reset terminal tab (Kitty) ---
    try {
      const { resetTab } = require("./handlers/terminal-state");
      resetTab();
    } catch {}

    // --- Consolidated status output ---
    const parts = [`${totalCandidates} rule candidates`];
    if (claudeRebuilt) parts.push("CLAUDE.md rebuilt");
    if (relationshipNotes > 0) parts.push(`${relationshipNotes} relationship notes`);
    if (integrityIssues > 0) parts.push(`${integrityIssues} doc issues`);
    parts.push(`abandoned: ${input.reason === "user_exit" ? "no" : input.reason || "unknown"}`);
    console.error(`\u2699 SessionEnd \u2502 ${parts.join(" \u2502 ")}`);
  } catch (err) {
    console.error(`\u2699 SessionEnd \u2502 error: ${err}`);
  }
}

main();
