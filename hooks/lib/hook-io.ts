/**
 * Shared hook I/O — portable stdin reader for Claude Code hooks.
 * Works with both bun and node.
 */

export interface HookInput {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  hook_event_name?: string;
  // Stop-specific
  last_assistant_message?: string;
  // UserPromptSubmit-specific
  prompt?: string;
  // PreToolUse-specific
  tool_name?: string;
  tool_input?: Record<string, any>;
  tool_use_id?: string;
  // SessionEnd-specific
  reason?: string;
  [key: string]: any;
}

/**
 * Read hook input from stdin with timeout.
 * Claude Code pipes JSON to hook stdin. If stdin doesn't close
 * within timeoutMs, resolve with whatever was read.
 */
export function readHookInput(timeoutMs = 500): Promise<HookInput> {
  return new Promise((resolve) => {
    let input = "";
    let resolved = false;

    function finish() {
      if (resolved) return;
      resolved = true;
      if (!input.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(input));
      } catch {
        resolve({});
      }
    }

    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => { input += chunk; });
    process.stdin.on("end", finish);
    process.stdin.on("error", finish);
    setTimeout(finish, timeoutMs);
  });
}

/** Output a PreToolUse decision to allow the tool call */
export function allowTool(): void {
  console.log(JSON.stringify({ continue: true }));
}

/** Output a PreToolUse decision to block the tool call (exit 2) */
export function blockTool(reason: string): never {
  console.error(`[POSEIDON SECURITY] BLOCKED: ${reason}`);
  process.exit(2);
}

/** Output a PreToolUse decision to ask the user for confirmation */
export function askUser(message: string): void {
  console.log(JSON.stringify({ decision: "ask", message }));
}
