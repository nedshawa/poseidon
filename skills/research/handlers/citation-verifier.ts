#!/usr/bin/env bun

/**
 * Citation Verifier — checks all URLs in research output before delivery.
 *
 * Extracts URLs from text, attempts HEAD requests, and classifies each
 * as verified, broken, or unverifiable. Runs at research completion.
 */

interface VerificationResult {
  verified: string[];
  broken: string[];
  unverifiable: string[];
  summary: string;
}

const URL_PATTERN = /https?:\/\/[^\s)<>\]"']+/g;
const TIMEOUT_MS = 5000;

function extractUrls(text: string): string[] {
  const matches = text.match(URL_PATTERN) || [];
  // Deduplicate and strip trailing punctuation
  const cleaned = matches.map((url) => url.replace(/[.,;:!?)]+$/, ""));
  return [...new Set(cleaned)];
}

async function checkUrl(url: string): Promise<"verified" | "broken" | "unverifiable"> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "ResearchBot/1.0 (citation-verifier)" },
    });

    clearTimeout(timeout);

    if (response.status >= 200 && response.status < 400) return "verified";
    return "broken";
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("abort")) return "unverifiable";
    return "broken";
  }
}

export async function verifyCitations(text: string): Promise<VerificationResult> {
  const urls = extractUrls(text);

  if (urls.length === 0) {
    return { verified: [], broken: [], unverifiable: [], summary: "No URLs found in text." };
  }

  const results = await Promise.allSettled(
    urls.map(async (url) => ({ url, status: await checkUrl(url) }))
  );

  const verified: string[] = [];
  const broken: string[] = [];
  const unverifiable: string[] = [];

  for (const result of results) {
    if (result.status === "rejected") {
      unverifiable.push("unknown");
      continue;
    }
    const { url, status } = result.value;
    if (status === "verified") verified.push(url);
    else if (status === "broken") broken.push(url);
    else unverifiable.push(url);
  }

  const summary =
    `${verified.length} verified, ${broken.length} broken, ${unverifiable.length} unverifiable ` +
    `out of ${urls.length} total URLs.`;

  return { verified, broken, unverifiable, summary };
}

// CLI entry point: reads text from stdin
if (import.meta.main) {
  const input = await Bun.stdin.text();
  if (!input.trim()) {
    console.error("Usage: echo 'text with URLs' | citation-verifier.ts");
    process.exit(1);
  }
  const result = await verifyCitations(input);
  console.log(JSON.stringify(result, null, 2));
}
