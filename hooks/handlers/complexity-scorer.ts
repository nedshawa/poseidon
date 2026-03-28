#!/usr/bin/env bun
/**
 * complexity-scorer.ts — Multi-signal mode classifier for Poseidon.
 * Scores prompt complexity on 0-100+ scale. Determines MINIMAL/NATIVE/ALGORITHM.
 * Learns from session abandonments to improve over time.
 */
import { readFileSync, existsSync } from "fs";
import { poseidonPath, getSettingsPath } from "../lib/paths";

export interface ComplexityResult {
  mode: "MINIMAL" | "NATIVE" | "ALGORITHM";
  score: number;
  signals: string[];
  escalated: boolean;
}

export interface LearnedPattern {
  timestamp: string;
  prompt_hash: string;
  patterns: string[];
  score: number;
  classified_as: string;
  outcome: string;
}

interface ClassifierSettings {
  algorithm_threshold: number;
  native_ceiling: number;
  learned_boost_cap: number;
  pattern_decay_days: number;
}

const DEFAULTS: ClassifierSettings = {
  algorithm_threshold: 56, native_ceiling: 55,
  learned_boost_cap: 20, pattern_decay_days: 90,
};

const MINIMAL_PATTERNS = [
  /^\s*(hi|hello|hey|thanks|thank you|ok|okay|yes|no|sure|got it|nice|cool|great|good|yep|nope|ack|ty|thx|np|k)\s*[.!?]?\s*$/i,
  /^\s*\d{1,2}\s*$/,
  /^\s*(rate|rating):?\s*\d{1,2}\s*$/i,
];

type SigFn = (p: string, l: string) => boolean;
const SIGNALS: [string, number, SigFn][] = [
  ["thinking_question",      25, (_, l) => /how should|what's the best way|why does|what approach|how do we/.test(l)],
  ["investigation_question", 20, (_, l) => /look at why|find out|what'?s wrong|investigate|figure out why/.test(l)],
  ["word_count_30",          15, (p)    => p.trim().split(/\s+/).length > 30],
  ["enumeration",            15, (p, l) => /^\s*\d+[.)]\s/m.test(p) || /^\s*[-*]\s/m.test(p) || (l.match(/\band\b/g) || []).length >= 3 || /\bplus\b/.test(l)],
  ["word_count_60",          10, (p)    => p.trim().split(/\s+/).length > 60],
  ["scope_words",            10, (_, l) => /\b(all|every|entire|comprehensive|full|complete)\b/.test(l)],
  ["file_references",        10, (p)    => /\.(ts|js|py|yaml|json|md|go|rs|sh)\b/.test(p) || /```/.test(p)],
  ["multi_sentence",         10, (p)    => p.split(/[.!?]+/).filter((s) => s.trim().length > 0).length >= 3],
  ["active_project",          5, ()     => false], // set via options
  ["uncertainty",             5, (_, l) => /\b(maybe|not sure|could be|might|possibly)\b/.test(l)],
];

// --- Learned patterns cache (1 min TTL) ---
let _cache: { patterns: LearnedPattern[]; at: number } | null = null;

function loadLearnedPatterns(decayDays: number): LearnedPattern[] {
  const now = Date.now();
  if (_cache && now - _cache.at < 60_000) return _cache.patterns;

  const fp = poseidonPath("memory", "learning", "escalation-patterns.jsonl");
  if (!existsSync(fp)) { _cache = { patterns: [], at: now }; return []; }

  try {
    const cutoff = now - decayDays * 86_400_000;
    const patterns: LearnedPattern[] = [];
    for (const line of readFileSync(fp, "utf-8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const e = JSON.parse(line) as LearnedPattern;
        if (new Date(e.timestamp).getTime() > cutoff) patterns.push(e);
      } catch { /* skip */ }
    }
    _cache = { patterns, at: now };
    return patterns;
  } catch {
    _cache = { patterns: [], at: now };
    return [];
  }
}

function loadSettings(): ClassifierSettings {
  try {
    const c = JSON.parse(readFileSync(getSettingsPath(), "utf-8"))?.classifier;
    if (!c) return DEFAULTS;
    return {
      algorithm_threshold: c.algorithm_threshold ?? DEFAULTS.algorithm_threshold,
      native_ceiling: c.native_ceiling ?? DEFAULTS.native_ceiling,
      learned_boost_cap: c.learned_boost_cap ?? DEFAULTS.learned_boost_cap,
      pattern_decay_days: c.pattern_decay_days ?? DEFAULTS.pattern_decay_days,
    };
  } catch { return DEFAULTS; }
}

export function scoreComplexity(prompt: string, options?: {
  activeProject?: string;
  learnedPatterns?: LearnedPattern[];
  settings?: ClassifierSettings;
}): ComplexityResult {
  const trimmed = prompt.trim();

  // Flag overrides
  if (/^--native\s/.test(trimmed))
    return { mode: "NATIVE", score: 0, signals: ["flag_native"], escalated: false };
  if (/^--algorithm\s/.test(trimmed))
    return { mode: "ALGORITHM", score: 100, signals: ["flag_algorithm"], escalated: false };

  // MINIMAL check
  if (MINIMAL_PATTERNS.some((p) => p.test(trimmed)))
    return { mode: "MINIMAL", score: 0, signals: ["minimal_pattern"], escalated: false };
  if (trimmed.split(/\s+/).length <= 2 && trimmed.length < 20)
    return { mode: "MINIMAL", score: 0, signals: ["minimal_short"], escalated: false };

  const settings = options?.settings ?? loadSettings();
  const lower = trimmed.toLowerCase();
  let score = 0;
  const signals: string[] = [];

  for (const [name, weight, test] of SIGNALS) {
    if (name === "active_project") {
      if (options?.activeProject) { score += weight; signals.push(name); }
      continue;
    }
    if (test(trimmed, lower)) { score += weight; signals.push(name); }
  }

  // Learned patterns boost
  const learned = options?.learnedPatterns ?? loadLearnedPatterns(settings.pattern_decay_days);
  if (learned.length > 0) {
    const words = new Set(lower.split(/\s+/));
    if (learned.some((e) => e.patterns.some((p) => words.has(p) || lower.includes(p)))) {
      score += Math.min(20, settings.learned_boost_cap);
      signals.push("learned_pattern");
    }
  }

  // Strong signal fast-track: thinking and investigation questions are ALWAYS algorithm-level
  // A single strong signal with a real question (>3 words) should escalate regardless of total score
  const hasStrongSignal = signals.includes("thinking_question") || signals.includes("investigation_question");
  const isRealQuestion = trimmed.split(/\s+/).length > 3;
  if (hasStrongSignal && isRealQuestion && score < settings.algorithm_threshold) {
    score = settings.algorithm_threshold; // Boost to threshold
    signals.push("strong_signal_escalation");
  }

  const mode = score >= settings.algorithm_threshold ? "ALGORITHM" as const : "NATIVE" as const;
  return { mode, score, signals, escalated: mode === "ALGORITHM" };
}

/** Strip mode flags from prompt if present. */
export function stripModeFlag(prompt: string): string {
  return prompt.replace(/^--(native|algorithm)\s+/, "");
}
