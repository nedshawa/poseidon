#!/usr/bin/env bun
/**
 * Citation Verifier — checks all URLs in research output before delivery.
 * Extracts URLs, attempts HEAD requests, classifies as verified/broken/unverifiable.
 */
interface VerificationResult { verified: string[]; broken: string[]; unverifiable: string[]; summary: string }

const URL_RE = /https?:\/\/[^\s)<>\]"']+/g;
const TIMEOUT_MS = 5000;

function extractUrls(text: string): string[] {
  const matches = text.match(URL_RE) || [];
  return [...new Set(matches.map(u => u.replace(/[.,;:!?)]+$/, "")))];
}

async function checkUrl(url: string): Promise<"verified" | "broken" | "unverifiable"> {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
    const r = await fetch(url, { method: "HEAD", signal: ac.signal, redirect: "follow",
      headers: { "User-Agent": "ResearchBot/1.0 (citation-verifier)" } });
    clearTimeout(t);
    return r.status >= 200 && r.status < 400 ? "verified" : "broken";
  } catch (e: unknown) {
    return (e instanceof Error && e.message.includes("abort")) ? "unverifiable" : "broken";
  }
}

export async function verifyCitations(text: string): Promise<VerificationResult> {
  const urls = extractUrls(text);
  if (!urls.length) return { verified: [], broken: [], unverifiable: [], summary: "No URLs found." };

  const results = await Promise.allSettled(urls.map(async url => ({ url, status: await checkUrl(url) })));
  const verified: string[] = [], broken: string[] = [], unverifiable: string[] = [];

  for (const r of results) {
    if (r.status === "rejected") { unverifiable.push("unknown"); continue; }
    const { url, status } = r.value;
    (status === "verified" ? verified : status === "broken" ? broken : unverifiable).push(url);
  }

  return { verified, broken, unverifiable,
    summary: `${verified.length} verified, ${broken.length} broken, ${unverifiable.length} unverifiable of ${urls.length} total.` };
}

if (import.meta.main) {
  const input = await Bun.stdin.text();
  if (!input.trim()) { console.error("Usage: echo 'text with URLs' | citation-verifier.ts"); process.exit(1); }
  console.log(JSON.stringify(await verifyCitations(input), null, 2));
}
