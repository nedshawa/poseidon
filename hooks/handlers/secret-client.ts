/**
 * SecretClient — Pluggable secret management for Poseidon.
 * Default backend: age-encrypted file with /dev/shm staging.
 *
 * Usage:
 *   const client = new SecretClient();
 *   const apiKey = await client.read("openai", "api_key");
 *   await client.write("github", { pat: "ghp_..." });
 *   const keys = await client.list("openai");
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync, chmodSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { randomBytes } from "crypto";
import { poseidonPath, getSettingsPath } from "../lib/paths";

export interface SecretBackend {
  read(path: string, field: string): Promise<string>;
  write(path: string, data: Record<string, string>): Promise<void>;
  list(path: string): Promise<string[]>;
}

/** Determine staging directory — prefer /dev/shm, fall back to /tmp */
function getStagingDir(): string {
  if (existsSync("/dev/shm")) return "/dev/shm";
  console.error("[SecretClient] WARNING: /dev/shm not available, falling back to /tmp (less secure)");
  return "/tmp";
}

function stagingFile(): string {
  return join(getStagingDir(), `poseidon-secrets-${randomBytes(8).toString("hex")}.json`);
}

/** Securely remove a file — shred if available, otherwise rm */
function secureRemove(filePath: string): void {
  if (!existsSync(filePath)) return;
  try {
    execSync(`shred -u "${filePath}"`, { stdio: "ignore" });
  } catch {
    try { unlinkSync(filePath); } catch { /* best effort */ }
  }
}

function loadSettings(): Record<string, any> {
  try { return JSON.parse(readFileSync(getSettingsPath(), "utf8")); }
  catch { return {}; }
}

// ── EncryptedFileBackend ───────────────────────────────

export class EncryptedFileBackend implements SecretBackend {
  private encryptedFilePath: string;
  private ageKeyPath: string;

  constructor(encryptedFilePath?: string, ageKeyPath?: string) {
    const settings = loadSettings();
    this.ageKeyPath = ageKeyPath
      || settings?.security?.age_key_path
      || join(homedir(), ".config", "poseidon", "age-key.txt");
    this.encryptedFilePath = encryptedFilePath || poseidonPath("secrets.enc");
  }

  private decryptToStaging(): Record<string, Record<string, string>> {
    const tmp = stagingFile();
    try {
      if (!existsSync(this.encryptedFilePath)) return {};
      execSync(
        `age --decrypt -i "${this.ageKeyPath}" -o "${tmp}" "${this.encryptedFilePath}"`,
        { stdio: "pipe" }
      );
      chmodSync(tmp, 0o600);
      return JSON.parse(readFileSync(tmp, "utf8"));
    } catch (err: any) {
      if (err.message?.includes("age")) {
        throw new Error(`age decryption failed: ${err.message}. Is age installed? (brew install age / apt install age)`);
      }
      throw err;
    } finally {
      secureRemove(tmp);
    }
  }

  private encryptFromStaging(data: Record<string, Record<string, string>>): void {
    const tmp = stagingFile();
    try {
      writeFileSync(tmp, JSON.stringify(data, null, 2));
      chmodSync(tmp, 0o600);
      const keyContent = readFileSync(this.ageKeyPath, "utf8");
      const pubKeyMatch = keyContent.match(/public key: (age1[a-z0-9]+)/);
      if (!pubKeyMatch) throw new Error("Could not extract public key from age key file");
      const encDir = join(this.encryptedFilePath, "..");
      if (!existsSync(encDir)) mkdirSync(encDir, { recursive: true });
      execSync(
        `age --encrypt -r "${pubKeyMatch[1]}" -o "${this.encryptedFilePath}" "${tmp}"`,
        { stdio: "pipe" }
      );
    } finally {
      secureRemove(tmp);
    }
  }

  async read(path: string, field: string): Promise<string> {
    const data = this.decryptToStaging();
    const section = data[path];
    if (!section || !(field in section)) throw new Error(`Secret not found: ${path}/${field}`);
    return section[field];
  }

  async write(path: string, newData: Record<string, string>): Promise<void> {
    const data = this.decryptToStaging();
    data[path] = { ...(data[path] || {}), ...newData };
    this.encryptFromStaging(data);
  }

  async list(path: string): Promise<string[]> {
    const data = this.decryptToStaging();
    if (!path) return Object.keys(data);
    return data[path] ? Object.keys(data[path]) : [];
  }
}

// ── EnvFileBackend ─────────────────────────────────────

export class EnvFileBackend implements SecretBackend {
  private envPath: string;

  constructor(envPath?: string) {
    this.envPath = envPath || poseidonPath(".env");
  }

  private parseEnv(): Record<string, string> {
    if (!existsSync(this.envPath)) return {};
    const result: Record<string, string> = {};
    for (const line of readFileSync(this.envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[key] = val;
    }
    return result;
  }

  private writeEnv(data: Record<string, string>): void {
    const dir = join(this.envPath, "..");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const lines = Object.entries(data).map(([k, v]) => `${k}=${v}`);
    writeFileSync(this.envPath, lines.join("\n") + "\n", { mode: 0o600 });
  }

  private envKey(path: string, field: string): string {
    return `${path.toUpperCase()}_${field.toUpperCase()}`;
  }

  async read(path: string, field: string): Promise<string> {
    const env = this.parseEnv();
    const key = this.envKey(path, field);
    if (!(key in env)) throw new Error(`Secret not found in .env: ${key}`);
    return env[key];
  }

  async write(path: string, data: Record<string, string>): Promise<void> {
    const env = this.parseEnv();
    for (const [field, value] of Object.entries(data)) {
      env[this.envKey(path, field)] = value;
    }
    this.writeEnv(env);
  }

  async list(path: string): Promise<string[]> {
    const env = this.parseEnv();
    const prefix = path ? `${path.toUpperCase()}_` : "";
    return Object.keys(env)
      .filter((k) => !prefix || k.startsWith(prefix))
      .map((k) => (prefix ? k.slice(prefix.length).toLowerCase() : k));
  }
}

// ── SecretClient (auto-detecting facade) ───────────────

export class SecretClient {
  private backend: SecretBackend;

  constructor(backendOverride?: SecretBackend) {
    if (backendOverride) { this.backend = backendOverride; return; }
    const settings = loadSettings();
    const configured = settings?.security?.secret_backend;
    if (configured === "env_file") {
      this.backend = new EnvFileBackend();
    } else if (configured === "encrypted_file") {
      this.backend = new EncryptedFileBackend();
    } else {
      const keyPath = settings?.security?.age_key_path
        || join(homedir(), ".config", "poseidon", "age-key.txt");
      this.backend = existsSync(keyPath) ? new EncryptedFileBackend() : new EnvFileBackend();
    }
  }

  async read(path: string, field: string): Promise<string> {
    return this.backend.read(path, field);
  }

  async write(path: string, data: Record<string, string>): Promise<void> {
    return this.backend.write(path, data);
  }

  async list(path: string): Promise<string[]> {
    return this.backend.list(path);
  }

  get backendType(): string {
    if (this.backend instanceof EncryptedFileBackend) return "encrypted_file";
    if (this.backend instanceof EnvFileBackend) return "env_file";
    return "custom";
  }
}
