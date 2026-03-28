#!/usr/bin/env bun
/**
 * brand-icons.ts — Brand icon library for Poseidon
 *
 * Two renderers: markdown (for Claude Code output) and terminal (for hooks/banner).
 * Each brand has: name, symbol, color (RGB), description.
 *
 * @author Poseidon System
 * @version 1.0.0
 */

export interface BrandIcon {
  id: string;
  name: string;
  symbol: string;       // Unicode symbol
  color: [number, number, number]; // RGB
  description: string;
}

export const BRANDS: Record<string, BrandIcon> = {
  claude: {
    id: "claude",
    name: "Claude",
    symbol: "✦",
    color: [204, 119, 34],  // Anthropic amber/brown
    description: "scholarly synthesis",
  },
  perplexity: {
    id: "perplexity",
    name: "Perplexity",
    symbol: "◈",
    color: [32, 191, 107],  // Perplexity teal-green
    description: "real-time web data",
  },
  gemini: {
    id: "gemini",
    name: "Gemini",
    symbol: "◆",
    color: [66, 133, 244],  // Google blue
    description: "technical docs + Google ecosystem",
  },
  grok: {
    id: "grok",
    name: "Grok",
    symbol: "✕",
    color: [255, 255, 255],  // xAI white on black
    description: "contrarian perspectives",
  },
  brave: {
    id: "brave",
    name: "Brave",
    symbol: "◉",
    color: [251, 84, 43],   // Brave orange
    description: "privacy-focused web search",
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    symbol: "▲",
    color: [0, 122, 204],   // OpenAI blue
    description: "inference + embeddings",
  },
  elevenlabs: {
    id: "elevenlabs",
    name: "ElevenLabs",
    symbol: "⬡",
    color: [116, 78, 194],  // ElevenLabs purple
    description: "text-to-speech",
  },
  fmp: {
    id: "fmp",
    name: "FMP",
    symbol: "♦",
    color: [255, 69, 0],    // Financial red-orange
    description: "stock data + fundamentals",
  },
  github: {
    id: "github",
    name: "GitHub",
    symbol: "⊙",
    color: [110, 118, 129], // GitHub gray
    description: "git operations",
  },
  ntfy: {
    id: "ntfy",
    name: "ntfy",
    symbol: "⊕",
    color: [63, 185, 80],   // ntfy green
    description: "push notifications",
  },
};

// ── Markdown Renderer (for Claude Code output) ──────────────────

/**
 * Render brand icon for markdown output (Claude Code responses)
 */
export function markdownIcon(brandId: string): string {
  const brand = BRANDS[brandId];
  if (!brand) return `❓ ${brandId}`;
  return `${brand.symbol} **${brand.name}**`;
}

/**
 * Render a research launch announcement in markdown
 */
export function markdownResearchLaunch(agents: string[], mode: string): string {
  const lines: string[] = [
    `🔍 **Research Launching — ${mode} Mode**`,
    `───────────────────────────────────────`,
  ];
  for (const agentId of agents) {
    const brand = BRANDS[agentId];
    if (brand) {
      lines.push(`  ${brand.symbol} **${brand.name}** — ${brand.description}`);
    }
  }
  lines.push(`───────────────────────────────────────`);
  lines.push(`  ⏳ ${agents.length} agents running in parallel...`);
  return lines.join("\n");
}

/**
 * Render agent completion status in markdown
 */
export function markdownAgentStatus(statuses: { agent: string; done: boolean; sources?: number; time?: number }[]): string {
  const lines: string[] = [];
  for (const s of statuses) {
    const brand = BRANDS[s.agent];
    const icon = brand ? `${brand.symbol} **${brand.name}**` : s.agent;
    if (s.done) {
      lines.push(`  ${icon} ✓ returned (${s.sources || "?"} sources, ${s.time || "?"}s)`);
    } else {
      lines.push(`  ${icon} ⏳ pending...`);
    }
  }
  const done = statuses.filter((s) => s.done).length;
  const total = statuses.length;
  const pct = Math.round((done / total) * 100);
  const filled = Math.round(pct / 10);
  const bar = "█".repeat(filled) + "░".repeat(10 - filled);
  lines.push(`───────────────────────────────────────`);
  lines.push(`  📊 **${done}/${total} agents complete** ${bar} ${pct}%`);
  return lines.join("\n");
}

// ── Terminal Renderer (for hooks, banner, poseidon.ts) ──────────

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function fg(r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m`;
}

function bg(r: number, g: number, b: number): string {
  return `\x1b[48;2;${r};${g};${b}m`;
}

/**
 * Render brand badge for terminal output (ANSI colors)
 */
export function terminalBadge(brandId: string): string {
  const brand = BRANDS[brandId];
  if (!brand) return `❓ ${brandId}`;
  const [r, g, b] = brand.color;
  // White text on brand color background
  return `${bg(r, g, b)}${fg(255, 255, 255)} ${brand.symbol} ${brand.name} ${RESET}`;
}

/**
 * Render brand name with color for terminal
 */
export function terminalColored(brandId: string): string {
  const brand = BRANDS[brandId];
  if (!brand) return brandId;
  const [r, g, b] = brand.color;
  return `${BOLD}${fg(r, g, b)}${brand.symbol} ${brand.name}${RESET}`;
}

/**
 * Render research launch for terminal (hooks stderr)
 */
export function terminalResearchLaunch(agents: string[], mode: string): string {
  const DIM = "\x1b[2m";
  const lines: string[] = [
    `${BOLD}🔍 Research Launching — ${mode} Mode${RESET}`,
    `${DIM}${"─".repeat(40)}${RESET}`,
  ];
  for (const agentId of agents) {
    const brand = BRANDS[agentId];
    if (brand) {
      lines.push(`  ${terminalBadge(agentId)}  ${brand.description}`);
    }
  }
  lines.push(`${DIM}${"─".repeat(40)}${RESET}`);
  lines.push(`${DIM}⏳ ${agents.length} agents running in parallel...${RESET}`);
  return lines.join("\n");
}
