#!/usr/bin/env bun
/**
 * terminal-state.ts — Terminal tab state management for Poseidon
 *
 * Feature-detected: uses Kitty terminal protocol if available,
 * graceful no-op if not. Zero impact on non-Kitty terminals.
 *
 * Tab color state machine:
 *   PURPLE (#5B21B6) — Processing (prompt received)
 *   ORANGE (#B35A00) — Working (task identified)
 *   TEAL   (#0D4F4F) — Waiting (question asked to user)
 *   GREEN  (#1A7F37) — Done (task completed)
 *   DEFAULT          — Session ended / no state
 *
 * @author Poseidon System
 * @version 1.0.0
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";

const POSEIDON_DIR = process.env.POSEIDON_DIR || join(dirname(import.meta.path.replace("file://", "")), "..", "..");

// ── Feature Detection ────────────────────────────────────────

const KITTY_LISTEN_ON = process.env.KITTY_LISTEN_ON || null;
const KITTY_WINDOW_ID = process.env.KITTY_WINDOW_ID || null;
const KITTY_AVAILABLE = !!(KITTY_LISTEN_ON || checkDefaultSocket());

function checkDefaultSocket(): boolean {
  try {
    const defaultSocket = `/tmp/kitty-${process.env.USER}`;
    return existsSync(defaultSocket);
  } catch {
    return false;
  }
}

function getSocket(): string | null {
  if (KITTY_LISTEN_ON) return KITTY_LISTEN_ON;
  const defaultSocket = `/tmp/kitty-${process.env.USER}`;
  return existsSync(defaultSocket) ? `unix:${defaultSocket}` : null;
}

// ── State Persistence ────────────────────────────────────────

const STATE_DIR = join(POSEIDON_DIR, "memory", "state", "terminal");

interface TabState {
  title: string;
  color: string;
  previousTitle?: string;
  sessionId?: string;
}

function saveState(sessionId: string, state: TabState): void {
  try {
    mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(join(STATE_DIR, `${sessionId}.json`), JSON.stringify(state));
  } catch {}
}

function loadState(sessionId: string): TabState | null {
  try {
    const path = join(STATE_DIR, `${sessionId}.json`);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

// ── Kitty Commands ───────────────────────────────────────────

function kittyCommand(args: string): boolean {
  if (!KITTY_AVAILABLE) return false;
  try {
    const socket = getSocket();
    if (!socket) return false;
    execSync(`kitty @ --to ${socket} ${args}`, { stdio: "ignore", timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

// ── Color Definitions ────────────────────────────────────────

export const TAB_COLORS = {
  purple: "#5B21B6",   // Processing
  orange: "#B35A00",   // Working
  teal: "#0D4F4F",     // Waiting for user
  green: "#1A7F37",    // Done
  red: "#DC2626",      // Error
  default: "",         // Reset
} as const;

type ColorName = keyof typeof TAB_COLORS;

// ── Public API ───────────────────────────────────────────────

/**
 * Check if Kitty terminal features are available.
 */
export function isKittyAvailable(): boolean {
  return KITTY_AVAILABLE;
}

/**
 * Set tab title and color. No-op if Kitty not available.
 */
export function setTabState(title: string, color: ColorName, sessionId?: string): boolean {
  if (!KITTY_AVAILABLE) return false;

  const success = kittyCommand(`set-tab-title "${title}"`);
  if (TAB_COLORS[color]) {
    kittyCommand(`set-tab-color active_bg=${TAB_COLORS[color]}`);
  }

  if (sessionId) {
    saveState(sessionId, { title, color, sessionId });
  }

  return success;
}

/**
 * Set processing state (purple) — called when prompt is received.
 */
export function setProcessing(summary: string, sessionId?: string): boolean {
  return setTabState(summary || "Processing...", "purple", sessionId);
}

/**
 * Set working state (orange) — called when task is identified.
 */
export function setWorking(title: string, sessionId?: string): boolean {
  return setTabState(title, "orange", sessionId);
}

/**
 * Set waiting state (teal) — called when asking user a question.
 */
export function setWaiting(question: string, sessionId?: string): boolean {
  if (sessionId) {
    const current = loadState(sessionId);
    if (current) {
      saveState(sessionId, { ...current, previousTitle: current.title, title: question, color: "teal" });
    }
  }
  return setTabState(question, "teal", sessionId);
}

/**
 * Set done state (green) — called when work is complete.
 * Converts gerund to past tense: "Fixing auth" → "Fixed auth"
 */
export function setDone(title: string, sessionId?: string): boolean {
  const pastTense = convertToPastTense(title);
  return setTabState(pastTense, "green", sessionId);
}

/**
 * Restore previous state (after question answered).
 */
export function restorePrevious(sessionId: string): boolean {
  const state = loadState(sessionId);
  if (state?.previousTitle) {
    return setTabState(state.previousTitle, "orange", sessionId);
  }
  return false;
}

/**
 * Reset tab to default (session end).
 */
export function resetTab(): boolean {
  if (!KITTY_AVAILABLE) return false;
  kittyCommand('set-tab-title ""');
  kittyCommand('set-tab-color active_bg=none');
  return true;
}

// ── Utilities ────────────────────────────────────────────────

function convertToPastTense(title: string): string {
  // Common gerund→past tense conversions
  const conversions: [RegExp, string][] = [
    [/^(F)ixing\b/i, "$1ixed"],
    [/^(B)uilding\b/i, "$1uilt"],
    [/^(C)reating\b/i, "$1reated"],
    [/^(D)eploying\b/i, "$1eployed"],
    [/^(T)esting\b/i, "$1ested"],
    [/^(U)pdating\b/i, "$1pdated"],
    [/^(A)dding\b/i, "$1dded"],
    [/^(R)emoving\b/i, "$1emoved"],
    [/^(R)efactoring\b/i, "$1efactored"],
    [/^(D)ebugging\b/i, "$1ebugged"],
    [/^(R)esearching\b/i, "$1esearched"],
    [/^(A)nalyzing\b/i, "$1nalyzed"],
    [/^(I)mplementing\b/i, "$1mplemented"],
    [/^(C)onfiguring\b/i, "$1onfigured"],
    [/^(I)nvestigating\b/i, "$1nvestigated"],
    [/^(W)riting\b/i, "$1rote"],
    [/^(R)unning\b/i, "$1an"],
    [/^(S)etting\b/i, "$1et"],
  ];

  for (const [pattern, replacement] of conversions) {
    if (pattern.test(title)) {
      return title.replace(pattern, replacement);
    }
  }

  // Generic: remove "ing" and add "ed" (works for most regular verbs)
  return title.replace(/^(\w+)ing\b/, "$1ed");
}
