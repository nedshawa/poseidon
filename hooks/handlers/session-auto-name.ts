/** session-auto-name.ts — Auto-name sessions from first prompt. */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { poseidonPath } from "../lib/paths";

/**
 * Generate a kebab-case session name from the first prompt.
 * Format: YYYYMMDD-first-eight-words
 */
export function generateSessionName(firstPrompt: string): string {
  const now = new Date();
  const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, "");

  const words = firstPrompt
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .map((w) => w.toLowerCase());

  const slug = words.length > 0 ? words.join("-") : "unnamed";
  return `${datePrefix}-${slug}`;
}

/**
 * Write session name to memory/state/session-names.json.
 * Appends to existing map keyed by session ID.
 */
export function saveSessionName(sessionId: string, name: string): void {
  const filePath = poseidonPath("memory", "state", "session-names.json");
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  let sessions: Record<string, string> = {};
  if (existsSync(filePath)) {
    try { sessions = JSON.parse(readFileSync(filePath, "utf-8")); } catch { sessions = {}; }
  }

  sessions[sessionId] = name;
  writeFileSync(filePath, JSON.stringify(sessions, null, 2) + "\n");
}
