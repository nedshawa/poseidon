# Poseidon Notifications via ntfy

How Poseidon sends push notifications to your phone, watch, and desktop — and how it can proactively suggest improvements.

## What is ntfy?

[ntfy](https://ntfy.sh) is an open-source push notification service. Poseidon sends HTTP POST requests to an ntfy topic, and you receive them instantly on any device with the ntfy app installed.

**No account required** for public topics. For private topics, create a free account at ntfy.sh.

## Quick Setup (5 minutes)

### Step 1: Install ntfy app

| Platform | Install |
|----------|---------|
| Android | [Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy) |
| iOS | [App Store](https://apps.apple.com/app/ntfy/id1625396347) |
| Desktop | Open https://ntfy.sh in any browser |
| CLI | `pip install ntfy` or `brew install ntfy` |

### Step 2: Choose a topic name

Your topic is a unique identifier. Choose something private (not guessable):

```
poseidon-{your-random-string}
```

Example: `poseidon-a7f3b2c1e9d0` (use `openssl rand -hex 6` to generate)

### Step 3: Store the topic in Poseidon

**Option A: age-encrypted secrets (recommended)**
```bash
echo '{"topic": "poseidon-a7f3b2c1e9d0"}' | bun tools/secret.ts write ntfy
```

**Option B: settings.json (simpler, not encrypted)**
Add to your settings.json:
```json
{
  "notifications": {
    "ntfy_topic": "poseidon-a7f3b2c1e9d0",
    "enabled": true,
    "events": {
      "error": true,
      "security": true,
      "learning": true,
      "suggestion": true,
      "task_complete": true
    }
  }
}
```

### Step 4: Subscribe on your device

Open the ntfy app → Subscribe → Enter your topic name → Done.

### Step 5: Test it

```bash
curl -d "Poseidon is connected!" "https://ntfy.sh/poseidon-a7f3b2c1e9d0"
```

You should receive a push notification immediately.

## What Poseidon Sends

### Event Types

| Event | When | Priority | Example |
|-------|------|----------|---------|
| **error** | Tool error captured 3+ times (pattern detected) | High | "Recurring error: AUTH_FAILURE on API calls (3x today)" |
| **security** | Security violation blocked | Urgent | "Blocked: attempted rm -rf /home" |
| **learning** | New rule candidate ready for approval | Default | "New rule candidate: When using git push, verify remote exists first" |
| **suggestion** | Poseidon has an improvement idea | Low | "Suggestion: Skill 'debug' hasn't been used in 30 days — consider removing?" |
| **task_complete** | Long-running background task finished | Default | "Research complete: 9/9 agents returned" |
| **milestone** | Learning Score improved significantly | Default | "Learning Score: 73 → 81 (+8 this week)" |

### Poseidon's Proactive Suggestions

This is the key feature — Poseidon can THINK about itself and send you suggestions:

**When session-end fires, Poseidon checks:**

1. **Error patterns** — "I've seen this error 5 times. I generated a rule candidate. Approve it?"
2. **Unused skills** — "Skill X hasn't been invoked in 30+ days. Remove it to save context?"
3. **Learning Score stagnation** — "Learning Score hasn't improved in 2 weeks. 3 pending candidates need review."
4. **Rule effectiveness** — "Rule Y has been injected 10 times but errors still recur. The rule might be wrong."
5. **Project staleness** — "Project Z hasn't been touched in 14 days. Archive it?"
6. **Algorithm performance** — "Your last 5 Algorithm sessions averaged 6/10. Consider adjusting complexity thresholds."

### Message Format

Poseidon sends structured messages with categories:

```
Title: 🧠 Poseidon — Learning
Body: New rule candidate ready for approval:
  "When calling external APIs, add timeout of 30s to prevent hangs"
  Evidence: 3 TIMEOUT errors in last 7 days
  Approve: open dashboard at http://chief:3456/#learning
```

```
Title: 💡 Poseidon — Suggestion
Body: Skill 'deploy' has 0 invocations in 45 days.
  Consider removing it to reduce skill routing noise.
  Run: /skill-builder validate to check all skill health.
```

## How to Send Notifications from Hooks

### Basic send (from any hook)

```typescript
// In any Poseidon hook:
import { readFileSync } from "fs";
import { poseidonPath } from "./lib/paths";

async function sendNotification(title: string, message: string, priority: number = 3, tags: string[] = []) {
  try {
    // Read topic from settings.json
    const settings = JSON.parse(readFileSync(poseidonPath("settings.json"), "utf-8"));
    const topic = settings.notifications?.ntfy_topic;
    if (!topic || !settings.notifications?.enabled) return;

    const headers: Record<string, string> = {
      "Title": title,
      "Priority": String(priority),
    };
    if (tags.length > 0) headers["Tags"] = tags.join(",");

    await fetch(`https://ntfy.sh/${topic}`, {
      method: "POST",
      headers,
      body: message,
    });
  } catch {
    // Never block hooks for notification failures
  }
}
```

### Usage in session-end.ts

```typescript
// After detecting error patterns:
if (recurringErrors.length > 0) {
  await sendNotification(
    "🧠 Poseidon — Error Pattern",
    `${recurringErrors.length} recurring error(s) detected today.\n` +
    recurringErrors.map(e => `  • ${e.errorClass}: ${e.count}x`).join("\n") +
    `\nReview: http://chief:3456/#learning`,
    4, // high priority
    ["warning"]
  );
}

// After generating rule candidates:
if (newCandidates.length > 0) {
  await sendNotification(
    "📋 Poseidon — Rule Candidate",
    newCandidates.map(c => `"${c.rule}"`).join("\n") +
    `\nApprove at: http://chief:3456/#learning`,
    3, // default priority
    ["clipboard"]
  );
}

// Proactive suggestion:
if (unusedSkills.length > 0) {
  await sendNotification(
    "💡 Poseidon — Suggestion",
    `${unusedSkills.length} skill(s) unused for 30+ days:\n` +
    unusedSkills.map(s => `  • ${s}`).join("\n") +
    `\nConsider removing to reduce context overhead.`,
    2, // low priority
    ["bulb"]
  );
}
```

### Priority Levels

| Priority | ntfy Value | When |
|----------|-----------|------|
| Min | 1 | Informational — no action needed |
| Low | 2 | Suggestions — review when convenient |
| Default | 3 | Learning events — new candidates, milestones |
| High | 4 | Errors — recurring patterns need attention |
| Urgent | 5 | Security — blocked operations, violations |

### ntfy Tags (Emoji in Notifications)

| Tag | Emoji | Use For |
|-----|-------|---------|
| `warning` | ⚠️ | Errors, security |
| `bulb` | 💡 | Suggestions |
| `clipboard` | 📋 | Rule candidates |
| `chart_increasing` | 📈 | Learning milestones |
| `rotating_light` | 🚨 | Urgent security |
| `white_check_mark` | ✅ | Task complete |

## Actionable Notifications

ntfy supports action buttons. Poseidon can add clickable actions:

```typescript
headers["Actions"] = [
  `view, Open Dashboard, http://chief:3456/#learning`,
  `http, Approve Rule, http://chief:3456/api/candidates/${filename}/approve, method=POST`
].join("; ");
```

This adds "Open Dashboard" and "Approve Rule" buttons directly in the notification.

## Private Topics (Recommended for Production)

Public ntfy topics are readable by anyone who guesses the name. For security:

### Option 1: Use a long random topic
```
poseidon-a7f3b2c1e9d04518bf3a  (32 chars = unguessable)
```

### Option 2: Self-host ntfy
```bash
docker run -p 8080:80 binwiederhier/ntfy serve
```
Then set your ntfy URL in settings.json:
```json
{
  "notifications": {
    "ntfy_url": "https://ntfy.yourdomain.com",
    "ntfy_topic": "poseidon"
  }
}
```

### Option 3: Use ntfy access tokens
Create a token at ntfy.sh → Account → Access Tokens. Store in secrets:
```bash
echo '{"topic": "poseidon-private", "token": "tk_..."}' | bun tools/secret.ts write ntfy
```

## Communication: Poseidon → Ned

Poseidon uses ntfy as a one-way channel to reach you when you're not in a terminal session:

```
Poseidon (session-end hook)
  ├── Detects: error pattern / rule candidate / suggestion / milestone
  ├── Formats: structured message with context and action link
  └── Sends: HTTP POST to ntfy.sh/{topic}
        │
        ▼
ntfy.sh relays to ALL subscribed devices:
  ├── Phone (ntfy app — push notification)
  ├── Watch (notification mirrored)
  ├── Desktop (browser notification or ntfy desktop)
  └── Any device with ntfy subscription
```

**This is NOT two-way.** Poseidon sends TO you. To respond, open the dashboard or start a Claude Code session. For two-way communication, use Claude Code Channels (Telegram/Discord) — see docs/channels/.

## Integrating into Existing Hooks

To add ntfy to Poseidon's hooks, the `sendNotification` function should be added to `hooks/lib/notifications.ts` (create if it doesn't exist). Then import it in:

- **session-end.ts** — error patterns, rule candidates, suggestions
- **error-capture.ts** — urgent security violations (blocked operations)
- **post-response.ts** — learning milestones (score crossed threshold)

The notification library handles:
- Topic resolution (from settings.json or SecretClient)
- Priority mapping
- Tag selection
- Action button generation
- Failure silencing (never blocks hooks)
