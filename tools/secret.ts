#!/usr/bin/env bun
/**
 * CLI tool for managing Poseidon secrets.
 *
 * Usage: bun tools/secret.ts <command> [args]
 *
 * Commands:
 *   init                    Generate age key pair
 *   read <path> <field>     Read a secret
 *   write <path>            Write secrets (reads JSON from stdin)
 *   list [path]             List secret paths or fields
 *   test                    Verify encryption/decryption roundtrip
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { SecretClient, EncryptedFileBackend } from "../hooks/handlers/secret-client";
import { poseidonPath, getSettingsPath } from "../hooks/lib/paths";

function loadSettings(): Record<string, any> {
  try { return JSON.parse(readFileSync(getSettingsPath(), "utf8")); }
  catch { return {}; }
}

function getAgeKeyPath(): string {
  const settings = loadSettings();
  return settings?.security?.age_key_path
    || join(homedir(), ".config", "poseidon", "age-key.txt");
}

function checkAge(): boolean {
  try {
    execSync("which age", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function printUsage(): void {
  console.log(`Poseidon Secret Manager
Usage: bun tools/secret.ts <command> [args]
Commands:
  init                    Generate age key pair at ${getAgeKeyPath()}
  read <path> <field>     Read a secret (e.g., read openai api_key)
  write <path>            Write secrets (pipe JSON via stdin)
  list [path]             List secret paths or fields
  test                    Verify encryption/decryption roundtrip`);
}

// ── Commands ───────────────────────────────────────────

async function cmdInit(): Promise<void> {
  if (!checkAge()) {
    console.error("ERROR: 'age' is not installed.");
    console.error("  macOS:  brew install age");
    console.error("  Linux:  apt install age  OR  pacman -S age");
    console.error("  Other:  https://github.com/FiloSottile/age#installation");
    process.exit(1);
  }

  const keyPath = getAgeKeyPath();

  if (existsSync(keyPath)) {
    console.log(`Age key already exists at: ${keyPath}`);
    const content = readFileSync(keyPath, "utf8");
    const pubMatch = content.match(/public key: (age1[a-z0-9]+)/);
    if (pubMatch) console.log(`Public key: ${pubMatch[1]}`);
    return;
  }

  // Create directory
  const keyDir = dirname(keyPath);
  if (!existsSync(keyDir)) mkdirSync(keyDir, { recursive: true });

  // Generate key
  console.log(`Generating age key pair at ${keyPath}...`);
  const output = execSync(`age-keygen -o "${keyPath}" 2>&1`, { encoding: "utf8" });
  chmodSync(keyPath, 0o600);

  // Print public key
  const content = readFileSync(keyPath, "utf8");
  const pubMatch = content.match(/public key: (age1[a-z0-9]+)/);
  if (pubMatch) {
    console.log(`Public key: ${pubMatch[1]}`);
  } else {
    console.log(output.trim());
  }

  // Create empty encrypted secrets file
  const encPath = poseidonPath("secrets.enc");
  if (!existsSync(encPath)) {
    const pubKey = pubMatch?.[1];
    if (pubKey) {
      execSync(`echo '{}' | age --encrypt -r "${pubKey}" -o "${encPath}"`, {
        shell: "/bin/bash",
        stdio: "pipe",
      });
      console.log(`Created empty secrets file: ${encPath}`);
    }
  }

  console.log("\nSecret management initialized successfully.");
}

async function cmdRead(path: string, field: string): Promise<void> {
  if (!path || !field) {
    console.error("Usage: bun tools/secret.ts read <path> <field>");
    process.exit(1);
  }
  const client = new SecretClient();
  try {
    const value = await client.read(path, field);
    // Output raw value (for piping)
    process.stdout.write(value);
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

async function cmdWrite(path: string): Promise<void> {
  if (!path) {
    console.error("Usage: echo '{\"key\":\"value\"}' | bun tools/secret.ts write <path>");
    process.exit(1);
  }

  // Read JSON from stdin
  let stdinData = "";
  const reader = Bun.stdin.stream().getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    stdinData += decoder.decode(value, { stream: true });
  }
  stdinData += decoder.decode();

  if (!stdinData.trim()) {
    console.error("Error: No JSON data received on stdin.");
    console.error('Usage: echo \'{"key":"value"}\' | bun tools/secret.ts write <path>');
    process.exit(1);
  }

  let data: Record<string, string>;
  try {
    data = JSON.parse(stdinData.trim());
  } catch {
    console.error("Error: Invalid JSON on stdin.");
    process.exit(1);
  }

  const client = new SecretClient();
  try {
    await client.write(path, data);
    console.log(`Wrote ${Object.keys(data).length} field(s) to "${path}".`);
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

async function cmdList(path?: string): Promise<void> {
  const client = new SecretClient();
  try {
    const items = await client.list(path || "");
    if (items.length === 0) {
      console.log(path ? `No fields found under "${path}".` : "No secrets stored.");
    } else {
      for (const item of items) console.log(item);
    }
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

async function cmdTest(): Promise<void> {
  console.log("Running encryption roundtrip test...\n");

  if (!checkAge()) {
    console.error("ERROR: 'age' is not installed. Cannot test encrypted backend.");
    console.error("Testing env_file backend instead.\n");
  }

  const client = new SecretClient();
  const testPath = "__poseidon_test__";
  const testField = "roundtrip";
  const testValue = `test-${Date.now()}`;

  try {
    // Write
    console.log(`[1/3] Writing test secret: ${testPath}/${testField}`);
    await client.write(testPath, { [testField]: testValue });
    console.log("      OK");

    // Read
    console.log(`[2/3] Reading back test secret...`);
    const readBack = await client.read(testPath, testField);
    if (readBack !== testValue) {
      throw new Error(`Mismatch: wrote "${testValue}", read "${readBack}"`);
    }
    console.log("      OK — values match");

    // Cleanup: overwrite with empty (can't truly delete in simple KV)
    console.log(`[3/3] Cleaning up test secret...`);
    await client.write(testPath, { [testField]: "" });
    console.log("      OK");

    console.log(`\nRoundtrip test PASSED (backend: ${client.backendType})`);
  } catch (err: any) {
    console.error(`\nRoundtrip test FAILED: ${err.message}`);
    process.exit(1);
  }
}

// ── Main ───────────────────────────────────────────────

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "init":
    await cmdInit();
    break;
  case "read":
    await cmdRead(args[0], args[1]);
    break;
  case "write":
    await cmdWrite(args[0]);
    break;
  case "list":
    await cmdList(args[0]);
    break;
  case "test":
    await cmdTest();
    break;
  default:
    printUsage();
    if (command) {
      console.error(`\nUnknown command: ${command}`);
      process.exit(1);
    }
}
