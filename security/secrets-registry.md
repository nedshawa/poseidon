# Poseidon Secret Registry

Last updated: never

## Available Secrets

| Service | Path | Field | Status | Added |
|---------|------|-------|--------|-------|

## Not Configured

| Service | Purpose | How to Add |
|---------|---------|------------|
| Perplexity | Research agent | `bun tools/setup.ts` or paste key in prompt |
| Gemini | Research agent | `bun tools/setup.ts` or paste key in prompt |
| Grok/xAI | Research agent | `bun tools/setup.ts` or paste key in prompt |
| Brave | Web search | `bun tools/setup.ts` or paste key in prompt |
| OpenAI | Inference, embeddings | `bun tools/setup.ts` or paste key in prompt |
| Anthropic | Claude API | `bun tools/setup.ts` or paste key in prompt |
| Stitch | UI design SDK | `bun tools/setup.ts` or paste key in prompt |
| ElevenLabs | Text-to-speech | `bun tools/setup.ts` or paste key in prompt |
| Deepgram | Speech-to-text | `bun tools/setup.ts` or paste key in prompt |
| FMP | Stock data, fundamentals | `bun tools/setup.ts` or paste key in prompt |
| GitHub | Git operations | `bun tools/setup.ts` or paste key in prompt |
| ntfy | Push notifications | `bun tools/setup.ts` or paste key in prompt |

## Access

Use SecretClient: `await client.read("service", "field")`
To add: paste key naturally in prompt -- auto-captured by hook.
To setup: `bun tools/setup.ts`
