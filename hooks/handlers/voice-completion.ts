#!/usr/bin/env bun
/**
 * voice-completion.ts — Send TTS voice announcements via ElevenLabs
 *
 * Configurable voice endpoint. Extracts 🗣️ voice line from response
 * and sends to TTS server. Non-blocking — failure never impacts session.
 *
 * @author Poseidon System
 * @version 1.0.0
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";

const POSEIDON_DIR = process.env.POSEIDON_DIR || join(dirname(import.meta.path.replace("file://", "")), "..", "..");

interface VoiceConfig {
  enabled: boolean;
  endpoint: string;
  voice_id: string;
  timeout_ms: number;
}

function getVoiceConfig(): VoiceConfig {
  const defaults: VoiceConfig = {
    enabled: false,
    endpoint: "http://localhost:8888/notify",
    voice_id: "",
    timeout_ms: 3000,
  };

  try {
    const settingsPath = join(POSEIDON_DIR, "settings.json");
    if (!existsSync(settingsPath)) return defaults;
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    const voice = settings?.channels?.voice;
    if (!voice) return defaults;
    return {
      enabled: voice.enabled ?? false,
      endpoint: voice.endpoint ?? defaults.endpoint,
      voice_id: voice.voice_id ?? defaults.voice_id,
      timeout_ms: voice.timeout_ms ?? defaults.timeout_ms,
    };
  } catch {
    return defaults;
  }
}

/**
 * Extract the 🗣️ voice line from a response.
 * Looks for: 🗣️ Poseidon: [message] or 🗣️ [message]
 */
export function extractVoiceLine(response: string): string | null {
  const match = response.match(/🗣️\s*(?:\w+:\s*)?(.+?)(?:\n|$)/);
  return match ? match[1].trim() : null;
}

/**
 * Send a voice announcement to the TTS endpoint.
 * Fire-and-forget — never blocks, never throws.
 */
export async function sendVoiceAnnouncement(message: string): Promise<boolean> {
  const config = getVoiceConfig();
  if (!config.enabled || !message) return false;

  try {
    const body: Record<string, any> = { message };
    if (config.voice_id) body.voice_id = config.voice_id;
    body.voice_enabled = true;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeout_ms);

    const resp = await fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return resp.ok;
  } catch {
    return false; // Fire and forget — never fail
  }
}

/**
 * Process a response and send voice if 🗣️ line found.
 */
export async function processResponseForVoice(response: string): Promise<void> {
  const line = extractVoiceLine(response);
  if (line) {
    await sendVoiceAnnouncement(line);
  }
}
