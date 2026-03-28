#!/usr/bin/env bun
/**
 * source-memory.ts — Track and query source reliability across research sessions
 *
 * Records which URLs returned useful data for which domains.
 * Over time, builds a reliability index that research prompts can reference.
 *
 * @author Poseidon System
 * @version 1.0.0
 */

import { existsSync, readFileSync, appendFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

const POSEIDON_DIR = process.env.POSEIDON_DIR || join(dirname(import.meta.path.replace("file://", "")), "..", "..", "..");
const SIGNALS_DIR = join(POSEIDON_DIR, "memory", "learning", "signals");
const RELIABILITY_FILE = join(SIGNALS_DIR, "source-reliability.jsonl");

export interface SourceRecord {
  timestamp: string;
  url: string;
  domain_tag: string;
  verified: boolean;
  useful: boolean;
  agent_type: string;
  topic: string;
}

export interface SourceScore {
  url: string;
  domain: string;
  total_uses: number;
  verified_count: number;
  useful_count: number;
  reliability: number; // 0-1
}

/**
 * Record a source's performance after research
 */
export function recordSource(record: Omit<SourceRecord, "timestamp">): void {
  try {
    mkdirSync(SIGNALS_DIR, { recursive: true });
    const entry: SourceRecord = {
      timestamp: new Date().toISOString(),
      ...record,
    };
    appendFileSync(RELIABILITY_FILE, JSON.stringify(entry) + "\n");
  } catch {}
}

/**
 * Record multiple sources at once (after a research session)
 */
export function recordSources(
  sources: { url: string; verified: boolean; useful: boolean }[],
  domain_tag: string,
  agent_type: string,
  topic: string
): void {
  for (const s of sources) {
    recordSource({
      url: s.url,
      domain_tag,
      verified: s.verified,
      useful: s.useful,
      agent_type,
      topic,
    });
  }
}

/**
 * Get reliability scores for a specific domain
 */
export function getReliableSources(domain: string, minUses: number = 2): SourceScore[] {
  if (!existsSync(RELIABILITY_FILE)) return [];

  const lines = readFileSync(RELIABILITY_FILE, "utf-8").trim().split("\n").filter(Boolean);
  const byUrl = new Map<string, { total: number; verified: number; useful: number; domain: string }>();

  for (const line of lines) {
    try {
      const record: SourceRecord = JSON.parse(line);
      // Filter by domain if specified, or return all
      if (domain && record.domain_tag !== domain) continue;

      // Extract base domain from URL
      const baseUrl = extractBaseDomain(record.url);
      if (!byUrl.has(baseUrl)) {
        byUrl.set(baseUrl, { total: 0, verified: 0, useful: 0, domain: record.domain_tag });
      }
      const entry = byUrl.get(baseUrl)!;
      entry.total++;
      if (record.verified) entry.verified++;
      if (record.useful) entry.useful++;
    } catch {}
  }

  const scores: SourceScore[] = [];
  for (const [url, data] of byUrl) {
    if (data.total < minUses) continue;
    scores.push({
      url,
      domain: data.domain,
      total_uses: data.total,
      verified_count: data.verified,
      useful_count: data.useful,
      reliability: data.total > 0 ? (data.verified * 0.4 + data.useful * 0.6) / data.total : 0,
    });
  }

  return scores.sort((a, b) => b.reliability - a.reliability);
}

/**
 * Generate a "preferred sources" prompt injection for a given domain
 */
export function getSourceRecommendation(domain: string): string {
  const reliable = getReliableSources(domain, 2);
  if (reliable.length === 0) return "";

  const top = reliable.slice(0, 5);
  const lines = top.map(
    (s) => `- ${s.url} (reliability: ${(s.reliability * 100).toFixed(0)}%, used ${s.total_uses}x)`
  );
  return `Preferred sources for ${domain} research (based on past reliability):\n${lines.join("\n")}`;
}

function extractBaseDomain(url: string): string {
  try {
    const match = url.match(/https?:\/\/(?:www\.)?([^\/]+)/);
    return match ? match[1] : url;
  } catch {
    return url;
  }
}
