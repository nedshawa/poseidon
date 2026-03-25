#!/usr/bin/env bun

/**
 * Content type detection from URLs, file paths, or raw text.
 * Returns the detected type and the cleaned URL if applicable.
 */

export type ContentType = "youtube" | "article" | "pdf" | "audio" | "text" | "unknown";

export interface DetectionResult {
  type: ContentType;
  url?: string;
}

const YOUTUBE_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=[\w-]+/,
  /(?:https?:\/\/)?youtu\.be\/[\w-]+/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/[\w-]+/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/[\w-]+/,
];

const PDF_PATTERN = /\.pdf(?:\?.*)?$/i;
const AUDIO_PATTERN = /\.(mp3|wav|m4a|ogg|flac|aac)(?:\?.*)?$/i;
const URL_PATTERN = /^https?:\/\//i;

export function detectContentType(input: string): DetectionResult {
  const trimmed = input.trim();

  for (const pattern of YOUTUBE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return { type: "youtube", url: match[0] };
  }

  if (PDF_PATTERN.test(trimmed)) {
    return { type: "pdf", url: URL_PATTERN.test(trimmed) ? trimmed : undefined };
  }

  if (AUDIO_PATTERN.test(trimmed)) {
    return { type: "audio", url: URL_PATTERN.test(trimmed) ? trimmed : undefined };
  }

  if (URL_PATTERN.test(trimmed)) {
    return { type: "article", url: trimmed };
  }

  if (trimmed.length === 0) {
    return { type: "unknown" };
  }

  return { type: "text" };
}
