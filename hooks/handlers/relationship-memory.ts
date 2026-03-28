/** relationship-memory.ts — Extract relationship context from sessions.
 * Builds a growing understanding of the user across sessions.
 */
import { mkdirSync, appendFileSync, existsSync } from "fs";
import { join } from "path";

export interface RelationshipNote {
  type: "W" | "B" | "O";
  content: string;
  confidence?: number;
}

interface ExtractionPattern {
  regex: RegExp;
  type: "W" | "B" | "O";
  confidence?: number;
}

const USER_PATTERNS: ExtractionPattern[] = [
  // World facts
  { regex: /\bI work(?:ed)? at\s+(.{3,60})/i, type: "W" },
  { regex: /\bmy team\s+(.{3,60})/i, type: "W" },
  { regex: /\bI'm based in\s+(.{3,60})/i, type: "W" },
  { regex: /\bI live in\s+(.{3,60})/i, type: "W" },
  { regex: /\bmy (?:name|role|title) is\s+(.{3,60})/i, type: "W" },
  // Opinions / preferences
  { regex: /\bI (?:prefer|like)\s+(.{3,80})/i, type: "O", confidence: 0.7 },
  { regex: /\bdon'?t do that\b(.{0,80})/i, type: "O", confidence: 0.7 },
  { regex: /\balways use\s+(.{3,80})/i, type: "O", confidence: 0.7 },
  { regex: /\bnever\s+(.{3,80})/i, type: "O", confidence: 0.7 },
  // Corrections (high confidence)
  { regex: /\bno,?\s+that'?s wrong\b(.{0,80})/i, type: "O", confidence: 0.9 },
  { regex: /\bI said\s+(.{3,80})/i, type: "O", confidence: 0.9 },
  { regex: /\byou forgot\s+(.{3,80})/i, type: "O", confidence: 0.9 },
];

const ASSISTANT_PATTERNS: ExtractionPattern[] = [
  { regex: /\b(?:created|built)\s+(.{3,100})/i, type: "B" },
  { regex: /\b(?:fixed|resolved)\s+(.{3,100})/i, type: "B" },
  { regex: /\bdeployed\s+(.{3,100})/i, type: "B" },
  { regex: /\brefactored\s+(.{3,100})/i, type: "B" },
];

const MAX_NOTES = 5;

/** Extract relationship-relevant notes from a session's messages. */
export function extractRelationshipNotes(
  userMessages: string[],
  assistantMessages: string[]
): RelationshipNote[] {
  const notes: RelationshipNote[] = [];

  for (const msg of userMessages) {
    for (const pat of USER_PATTERNS) {
      const match = msg.match(pat.regex);
      if (!match) continue;
      const content = (match[1] || match[0]).trim().replace(/[.!?,;]+$/, "");
      if (content.length < 4) continue;
      const note: RelationshipNote = { type: pat.type, content };
      if (pat.confidence !== undefined) note.confidence = pat.confidence;
      notes.push(note);
    }
  }

  for (const msg of assistantMessages) {
    for (const pat of ASSISTANT_PATTERNS) {
      const match = msg.match(pat.regex);
      if (!match) continue;
      const content = (match[1] || match[0]).trim().replace(/[.!?,;]+$/, "");
      if (content.length < 4) continue;
      notes.push({ type: "B", content });
    }
  }

  // Deduplicate by content similarity
  const seen = new Set<string>();
  const unique = notes.filter((n) => {
    const key = n.content.toLowerCase().slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.slice(0, MAX_NOTES);
}

/** Format a single note as a log line. */
function formatNote(note: RelationshipNote): string {
  if (note.type === "O" && note.confidence !== undefined) {
    return `- O(c=${note.confidence.toFixed(2)}): ${note.content}`;
  }
  return `- ${note.type}: ${note.content}`;
}

/** Append extracted notes to the daily relationship log. */
export function appendToRelationshipLog(
  notes: RelationshipNote[],
  baseDir: string
): void {
  if (notes.length === 0) return;

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  const dir = join(baseDir, "memory", "learning", "relationship", `${yyyy}-${mm}`);
  const file = join(dir, `${yyyy}-${mm}-${dd}.md`);

  mkdirSync(dir, { recursive: true });

  const header = `\n## Session ${hh}:${min}\n`;
  const lines = notes.map(formatNote).join("\n");
  appendFileSync(file, header + lines + "\n", "utf-8");
}
