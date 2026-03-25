/**
 * Centralized path constants for Poseidon hooks.
 * All paths derived from POSEIDON_DIR env var or auto-detected.
 * NEVER hardcode user-specific paths.
 */

import { join } from "path";
import { homedir } from "os";

/** Root Poseidon directory — configurable via POSEIDON_DIR env var */
export function getBaseDir(): string {
  return process.env.POSEIDON_DIR || join(homedir(), ".poseidon");
}

/** Settings file path */
export function getSettingsPath(): string {
  return join(getBaseDir(), "settings.json");
}

/** Build a path relative to Poseidon root */
export function poseidonPath(...segments: string[]): string {
  return join(getBaseDir(), ...segments);
}

// Derived paths
export const TELOS_DIR = () => poseidonPath("telos");
export const MEMORY_DIR = () => poseidonPath("memory");
export const PROJECTS_DIR = () => poseidonPath("memory", "projects");
export const WORK_DIR = () => poseidonPath("memory", "work");
export const LEARNING_DIR = () => poseidonPath("memory", "learning");
export const FAILURES_DIR = () => poseidonPath("memory", "learning", "failures");
export const RULES_DIR = () => poseidonPath("memory", "learning", "rules");
export const CANDIDATES_DIR = () => poseidonPath("memory", "learning", "candidates");
export const SIGNALS_DIR = () => poseidonPath("memory", "learning", "signals");
export const STEERING_RULES_PATH = () => poseidonPath("memory", "steering-rules.md");
export const SYSTEM_RULES_PATH = () => poseidonPath("rules", "system.md");
export const USER_RULES_PATH = () => poseidonPath("rules", "user.md");
export const ALGORITHM_DIR = () => poseidonPath("algorithm");
export const SECURITY_DIR = () => poseidonPath("security");
export const LOGS_DIR = () => poseidonPath("logs");
export const SKILLS_DIR = () => poseidonPath("skills");
export const HOOKS_DIR = () => poseidonPath("hooks");
