#!/usr/bin/env bun
/**
 * Launch Poseidon Dashboard
 * Usage: bun tools/dashboard.ts [--port 3456]
 */
import { resolve, dirname } from "path";
import { $ } from "bun";

const port = parseInt(process.argv.find((_, i, a) => a[i - 1] === "--port") || "3456");
const serverPath = resolve(dirname(new URL(import.meta.url).pathname), "..", "dashboard", "server.ts");

console.log(`Starting Poseidon Dashboard on http://localhost:${port}`);

const proc = Bun.spawn(["bun", serverPath], {
  env: { ...process.env, PORT: String(port) },
  stdout: "inherit",
  stderr: "inherit",
});

setTimeout(async () => {
  try {
    const platform = process.platform;
    if (platform === "darwin") await $`open http://localhost:${port}`.quiet();
    else if (platform === "linux") await $`xdg-open http://localhost:${port}`.quiet();
  } catch {}
}, 1000);

process.on("SIGINT", () => { proc.kill(); process.exit(0); });
await proc.exited;
