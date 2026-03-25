#!/usr/bin/env bun

/**
 * Transcript extraction for various content types.
 * Returns the text content or null with guidance on manual extraction.
 */

import { type ContentType } from "./content-detector";

export interface TranscriptResult {
  text: string | null;
  method: string;
  error?: string;
}

export async function getTranscript(url: string, type: ContentType): Promise<TranscriptResult> {
  switch (type) {
    case "youtube":
      return extractYouTube(url);
    case "article":
      return { text: null, method: "webfetch", error: `Use WebFetch to retrieve: ${url}` };
    case "pdf":
      return { text: null, method: "read", error: `Use the Read tool on: ${url}` };
    case "audio":
      return extractAudio(url);
    case "text":
      return { text: url, method: "direct" };
    default:
      return { text: null, method: "unknown", error: "Unable to detect content type" };
  }
}

async function extractYouTube(url: string): Promise<TranscriptResult> {
  try {
    const proc = Bun.spawn(["yt-dlp", "--write-sub", "--write-auto-sub", "--sub-lang", "en",
      "--skip-download", "--sub-format", "txt", "-o", "-", url], { stdout: "pipe", stderr: "pipe" });
    const text = await new Response(proc.stdout).text();
    return text.trim() ? { text, method: "yt-dlp" }
      : { text: null, method: "yt-dlp", error: "No subtitles found. Try: fabric -y " + url };
  } catch {
    return { text: null, method: "yt-dlp", error: "yt-dlp not available. Install: bun add -g yt-dlp" };
  }
}

async function extractAudio(url: string): Promise<TranscriptResult> {
  try {
    const proc = Bun.spawn(["whisper", url, "--output_format", "txt"], { stdout: "pipe", stderr: "pipe" });
    const text = await new Response(proc.stdout).text();
    return text.trim() ? { text, method: "whisper" }
      : { text: null, method: "whisper", error: "Transcription produced no output" };
  } catch {
    return { text: null, method: "whisper", error: "whisper not available. Install: pip install openai-whisper" };
  }
}
