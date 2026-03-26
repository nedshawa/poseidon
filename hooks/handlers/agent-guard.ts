/** agent-guard.ts — PreToolUse guard for Task/Agent tool calls. */

const INJECTION_PATTERNS = [
  /ignore\s+previous/i,
  /disregard\s+instructions/i,
  /system\s+prompt/i,
  /forget\s+(all|your|everything)/i,
  /override\s+(your|all|system)/i,
  /you\s+are\s+now/i,
  /new\s+instructions?:/i,
  /pretend\s+you/i,
];

const VALID_SUBAGENT_TYPES = [
  "task",
  "agent",
  "research",
  "code",
  "edit",
  "bash",
];

export interface GuardDecision {
  allow: boolean;
  reason?: string;
}

/**
 * Validate a Task or Agent tool invocation.
 * Returns allow/block decision with reason.
 */
export function guardAgentExecution(
  toolName: string,
  toolInput: any,
): GuardDecision {
  const name = toolName.toLowerCase();
  if (name !== "task" && name !== "agent") {
    return { allow: true };
  }

  // Check prompt for injection patterns
  const prompt = toolInput?.prompt || toolInput?.description || "";
  if (typeof prompt === "string" && prompt.length > 0) {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(prompt)) {
        return {
          allow: false,
          reason: `Prompt injection detected: matched pattern "${pattern.source}"`,
        };
      }
    }
  }

  // Validate subagent type if specified
  const subagentType = toolInput?.subagent_type || toolInput?.type;
  if (subagentType && typeof subagentType === "string") {
    if (!VALID_SUBAGENT_TYPES.includes(subagentType.toLowerCase())) {
      return {
        allow: false,
        reason: `Invalid subagent type "${subagentType}". Valid: ${VALID_SUBAGENT_TYPES.join(", ")}`,
      };
    }
  }

  return { allow: true };
}
