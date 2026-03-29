#!/usr/bin/env bun
/**
 * data-source-router.ts — Route data requests to the best available source
 *
 * Reads data-sources.yaml + poseidon-manifest.yaml → resolves the
 * highest-quality ENABLED source for a given domain.
 *
 * Fallback chain: premium (if enabled) → standard (if enabled) → free → null
 *
 * @author Poseidon System
 * @version 1.0.0
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { isServiceEnabled } from "./manifest-loader";

const POSEIDON_DIR = process.env.POSEIDON_DIR || join(dirname(import.meta.path.replace("file://", "")), "..", "..");
const DATA_SOURCES_PATH = join(POSEIDON_DIR, "data-sources.yaml");

// ── Types ────────────────────────────────────────────────────

export interface DataSource {
  id: string;
  name: string;
  domain: string;
  type: string;         // api | scraping | built-in | local
  quality: string;      // premium | standard | free
  requires_key: boolean;
  manifest_service: string | null;
  fallback: string | null;
  url: string | null;
  used_by: string[];
  provides: string[];
  enabled: boolean;     // computed from manifest
}

export interface RouteResult {
  source: DataSource;
  reason: string;        // "premium (enabled)" | "fallback from fmp (disabled)"
  alternatives: DataSource[];
  unavailable: DataSource[];
}

// ── Cache ────────────────────────────────────────────────────

let _cache: { sources: DataSource[]; at: number } | null = null;

// ── YAML Parser ──────────────────────────────────────────────

function loadDataSources(): DataSource[] {
  const now = Date.now();
  if (_cache && now - _cache.at < 60_000) return _cache.sources;

  if (!existsSync(DATA_SOURCES_PATH)) {
    _cache = { sources: [], at: now };
    return [];
  }

  try {
    const content = readFileSync(DATA_SOURCES_PATH, "utf-8");
    const sources: DataSource[] = [];
    let current: Partial<DataSource> = {};

    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || !trimmed) continue;

      if (trimmed.startsWith("- id:")) {
        if (current.id) {
          // Compute enabled from manifest
          current.enabled = current.manifest_service ? isServiceEnabled(current.manifest_service) : !current.requires_key;
          sources.push(current as DataSource);
        }
        current = { id: trimmed.replace("- id:", "").trim(), provides: [], used_by: [] };
      } else if (current.id) {
        const match = trimmed.match(/^(\w[\w_]*):\s*(.+)$/);
        if (match) {
          const [, key, val] = match;
          const v = val.trim();
          if (key === "name") current.name = v.replace(/^"|"$/g, "");
          else if (key === "domain") current.domain = v;
          else if (key === "type") current.type = v;
          else if (key === "quality") current.quality = v;
          else if (key === "requires_key") current.requires_key = v === "true";
          else if (key === "manifest_service") current.manifest_service = v === "null" ? null : v;
          else if (key === "fallback") current.fallback = v === "null" ? null : v;
          else if (key === "url") current.url = v === "null" ? null : v.replace(/^"|"$/g, "");
          else if (key === "used_by") current.used_by = v.replace(/[\[\]]/g, "").split(",").map(s => s.trim()).filter(Boolean);
          else if (key === "provides") current.provides = v.replace(/[\[\]]/g, "").split(",").map(s => s.trim()).filter(Boolean);
        }
      }
    }
    if (current.id) {
      current.enabled = current.manifest_service ? isServiceEnabled(current.manifest_service) : !current.requires_key;
      sources.push(current as DataSource);
    }

    _cache = { sources, at: now };
    return sources;
  } catch {
    _cache = { sources: [], at: now };
    return [];
  }
}

// ── Quality Ordering ─────────────────────────────────────────

const QUALITY_ORDER: Record<string, number> = { premium: 3, standard: 2, free: 1 };

function qualityScore(q: string): number {
  return QUALITY_ORDER[q] || 0;
}

// ── Public API ───────────────────────────────────────────────

/**
 * Get ALL data sources for a domain, sorted by quality.
 */
export function getSourcesForDomain(domain: string): DataSource[] {
  return loadDataSources()
    .filter(s => s.domain === domain)
    .sort((a, b) => qualityScore(b.quality) - qualityScore(a.quality));
}

/**
 * Route to the best available source for a domain.
 * Follows the fallback chain if premium isn't available.
 */
export function routeToSource(domain: string): RouteResult | null {
  const sources = getSourcesForDomain(domain);
  if (sources.length === 0) return null;

  const enabled = sources.filter(s => s.enabled);
  const disabled = sources.filter(s => !s.enabled);

  if (enabled.length === 0) {
    // Try fallback chain from the highest-quality disabled source
    const best = sources[0];
    let fallback = best;
    while (fallback && !fallback.enabled && fallback.fallback) {
      const next = loadDataSources().find(s => s.id === fallback!.fallback);
      if (next) fallback = next;
      else break;
    }

    if (fallback?.enabled) {
      return {
        source: fallback,
        reason: `fallback from ${best.name} (disabled) → ${fallback.name}`,
        alternatives: [],
        unavailable: disabled,
      };
    }

    return null; // No sources available at all
  }

  // Use the highest-quality enabled source
  const best = enabled[0];
  return {
    source: best,
    reason: `${best.quality} (enabled)`,
    alternatives: enabled.slice(1),
    unavailable: disabled,
  };
}

/**
 * Get all sources used by a specific skill.
 */
export function getSourcesForSkill(skillName: string): DataSource[] {
  return loadDataSources().filter(s => s.used_by.includes(skillName));
}

/**
 * Get all sources that provide a specific capability.
 */
export function getSourcesByCapability(capability: string): DataSource[] {
  return loadDataSources()
    .filter(s => s.provides.includes(capability))
    .sort((a, b) => qualityScore(b.quality) - qualityScore(a.quality));
}

/**
 * Format data source routing for system-reminder injection.
 */
export function formatDataSourcesForInjection(): string {
  const sources = loadDataSources();
  if (sources.length === 0) return "";

  const domains = [...new Set(sources.map(s => s.domain))].sort();
  const lines: string[] = ["## Available Data Sources", ""];

  for (const domain of domains) {
    const domainSources = sources.filter(s => s.domain === domain);
    const enabled = domainSources.filter(s => s.enabled);
    const disabled = domainSources.filter(s => !s.enabled);

    if (enabled.length > 0) {
      lines.push(`**${domain}:** ${enabled.map(s => `${s.name} (${s.quality})`).join(", ")}`);
    }
    if (disabled.length > 0 && enabled.length === 0) {
      lines.push(`**${domain}:** none enabled (available: ${disabled.map(s => s.name).join(", ")})`);
    }
  }

  return lines.join("\n");
}
