#!/usr/bin/env bun
/**
 * poseidon-ipc -- IPC client for communicating with the Poseidon wrapper
 * Called from inside a Claude/Gemini/etc session via Bash tool
 *
 * Usage:
 *   bun tools/poseidon-ipc.ts collect_secret fmp api_key
 *   bun tools/poseidon-ipc.ts project_switch hunter-dalio
 *   bun tools/poseidon-ipc.ts ping
 */

import { createConnection } from "net";
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";

// ── Socket Resolution ───────────────────────────────────────────

const socketPath = process.env.POSEIDON_IPC_SOCK;

if (!socketPath) {
  console.error("Not running inside Poseidon wrapper. Use: bun tools/onboard.ts instead");
  process.exit(1);
}

if (!existsSync(socketPath)) {
  console.error(`IPC socket not found: ${socketPath}`);
  console.error("The Poseidon wrapper may have exited. Use: bun tools/onboard.ts instead");
  process.exit(1);
}

// ── Parse Command ───────────────────────────────────────────────

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: poseidon-ipc <command> [args...]");
  console.error("");
  console.error("Commands:");
  console.error("  collect_secret <service> [field]   Collect a secret from the terminal");
  console.error("  project_switch <project>           Switch active project");
  console.error("  ping                               Check if wrapper is alive");
  process.exit(1);
}

// ── Build Request ───────────────────────────────────────────────

interface IPCRequest {
  type: string;
  service?: string;
  field?: string;
  project?: string;
  prompt?: string;
}

function buildRequest(): IPCRequest {
  switch (command) {
    case "collect_secret":
      return {
        type: "collect_secret",
        service: args[0],
        field: args[1] || "api_key",
        prompt: args[0] ? `${args[0]} ${args[1] || "API key"}` : "API key",
      };

    case "project_switch":
      return {
        type: "project_switch",
        project: args[0],
      };

    case "ping":
      return { type: "ping" };

    default:
      return { type: command, service: args[0], field: args[1] };
  }
}

// ── Send Request ────────────────────────────────────────────────

const SCRIPT_DIR = dirname(import.meta.path.replace("file://", ""));
const POSEIDON_DIR = process.env.POSEIDON_DIR || join(SCRIPT_DIR, "..");

const request = buildRequest();

const client = createConnection(socketPath, () => {
  client.write(JSON.stringify(request));
  client.end();
});

let response = "";

client.on("data", (chunk) => {
  response += chunk;
});

client.on("end", () => {
  try {
    const result = JSON.parse(response);

    if (result.ok) {
      if (command === "collect_secret" && result.value) {
        // Attempt to store via SecretClient if available
        const secretScript = join(POSEIDON_DIR, "tools", "secret.ts");
        if (existsSync(secretScript) && args[0]) {
          try {
            // Write value to temp file in RAM, encrypt, shred
            const tmpPath = `/dev/shm/poseidon-ipc-${process.pid}.tmp`;
            require("fs").writeFileSync(tmpPath, result.value);
            require("fs").chmodSync(tmpPath, 0o600);
            execSync(
              `bun "${secretScript}" write ${args[0]} ${args[1] || "api_key"} --from-file "${tmpPath}"`,
              { stdio: "pipe", env: { ...process.env, POSEIDON_DIR } }
            );
            try { execSync(`shred -u "${tmpPath}" 2>/dev/null`, { stdio: "ignore" }); } catch {}
            try { require("fs").unlinkSync(tmpPath); } catch {}
            console.log(`\u2713 ${args[0]} ${args[1] || "key"} stored securely`);
          } catch (e: any) {
            // SecretClient store failed, but we still have the value
            console.log(`\u2713 ${args[0]} key collected (manual store required: ${e.message})`);
          }
        } else {
          console.log(`\u2713 Secret collected for ${args[0] || "service"}`);
        }
      } else if (command === "project_switch") {
        console.log(`\u2713 Switched to project: ${result.project}`);
      } else if (command === "ping") {
        console.log(`\u2713 Poseidon wrapper alive (PID: ${result.pid})`);
      } else {
        console.log(`\u2713 ${JSON.stringify(result)}`);
      }
    } else {
      console.error(`\u2717 ${result.error || "Unknown error"}`);
      process.exit(1);
    }
  } catch (e: any) {
    console.error(`\u2717 Failed to parse response: ${e.message}`);
    console.error(`  Raw response: ${response}`);
    process.exit(1);
  }
});

client.on("error", (err) => {
  console.error(`\u2717 IPC connection failed: ${err.message}`);
  console.error("  The Poseidon wrapper may have exited.");
  process.exit(1);
});

// Timeout after 30 seconds (secret collection can take a while)
setTimeout(() => {
  console.error("\u2717 IPC request timed out after 30 seconds");
  client.destroy();
  process.exit(1);
}, 30000);
