#!/usr/bin/env bun
/**
 * Research Iterator — identifies gaps in research results and generates follow-up queries.
 * Parses results for missing data, compares against original questions, detects conflicts.
 */

export interface ResearchGap {
  topic: string;
  what_missing: string;
  suggested_query: string;
  priority: "high" | "medium" | "low";
}

const EMPTY_SIGNALS = /\b(no data found|unable to find|not available|no results|could not (find|determine|locate)|n\/a|unknown|insufficient data|data unavailable)\b/gi;
const NUMBER_RE = /(\d[\d,.]*%?)\s+([\w\s]{3,30})/g;
const HEADING_RE = /^#{1,4}\s+(.+)/gm;

function extractHeadingSections(text: string): Map<string, string> {
  const sections = new Map<string, string>();
  const headings = [...text.matchAll(HEADING_RE)];
  for (let i = 0; i < headings.length; i++) {
    const name = headings[i][1].trim();
    const start = headings[i].index! + headings[i][0].length;
    const end = i + 1 < headings.length ? headings[i + 1].index! : text.length;
    sections.set(name, text.slice(start, end).trim());
  }
  return sections;
}

function findEmptyGaps(results: string[]): ResearchGap[] {
  const gaps: ResearchGap[] = [];
  for (const result of results) {
    const sections = extractHeadingSections(result);
    for (const [heading, body] of sections) {
      const empties = body.match(EMPTY_SIGNALS);
      if (empties && empties.length > 0) {
        gaps.push({
          topic: heading,
          what_missing: `Section contains ${empties.length} missing-data indicator(s): ${empties.slice(0, 3).join(", ")}`,
          suggested_query: `Find specific data for: ${heading}`,
          priority: "high",
        });
      } else if (body.split(/\s+/).length < 15) {
        gaps.push({
          topic: heading,
          what_missing: "Section has very thin coverage (under 15 words)",
          suggested_query: `Expand research on: ${heading}`,
          priority: "medium",
        });
      }
    }
  }
  return gaps;
}

function findUnansweredQuestions(results: string[], originalQuestions: string[]): ResearchGap[] {
  const gaps: ResearchGap[] = [];
  const combined = results.join("\n").toLowerCase();
  for (const q of originalQuestions) {
    const keywords = q.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const matched = keywords.filter(k => combined.includes(k));
    const coverage = keywords.length > 0 ? matched.length / keywords.length : 0;
    if (coverage < 0.3) {
      gaps.push({ topic: q, what_missing: "Question appears unanswered in results", suggested_query: q, priority: "high" });
    } else if (coverage < 0.6) {
      gaps.push({ topic: q, what_missing: `Partially answered (${(coverage * 100).toFixed(0)}% keyword coverage)`, suggested_query: `More detail on: ${q}`, priority: "medium" });
    }
  }
  return gaps;
}

function findConflicts(results: string[]): ResearchGap[] {
  const gaps: ResearchGap[] = [];
  const claimsByMetric = new Map<string, { value: string; source: number }[]>();
  for (let i = 0; i < results.length; i++) {
    for (const m of results[i].matchAll(NUMBER_RE)) {
      const metric = m[2].trim().toLowerCase();
      if (!claimsByMetric.has(metric)) claimsByMetric.set(metric, []);
      claimsByMetric.get(metric)!.push({ value: m[1], source: i });
    }
  }
  for (const [metric, claims] of claimsByMetric) {
    if (claims.length < 2) continue;
    const unique = new Set(claims.map(c => c.value));
    if (unique.size > 1) {
      const values = [...unique].join(" vs ");
      gaps.push({
        topic: metric,
        what_missing: `Conflicting data across sources: ${values}`,
        suggested_query: `Verify accurate figure for: ${metric}`,
        priority: "high",
      });
    }
  }
  return gaps;
}

export function identifyGaps(results: string[], originalQuestions: string[]): ResearchGap[] {
  const all = [
    ...findConflicts(results),
    ...findEmptyGaps(results),
    ...findUnansweredQuestions(results, originalQuestions),
  ];
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return all.sort((a, b) => order[a.priority] - order[b.priority]);
}

if (import.meta.main) {
  const input = await Bun.stdin.text();
  if (!input.trim()) { console.error("Usage: echo '{\"results\":[...],\"questions\":[...]}' | research-iterator.ts"); process.exit(1); }
  const { results, questions } = JSON.parse(input);
  console.log(JSON.stringify(identifyGaps(results, questions), null, 2));
}
