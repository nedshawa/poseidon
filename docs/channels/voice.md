# Setting Up Voice Channel

## Prerequisites
- ElevenLabs account (paid plan recommended)
- Claude Code v2.1.80+ with channels support
- Poseidon installed (`bun tools/validate.ts` passes)
- Microphone and speakers/headphones

## Step 1: Get ElevenLabs API Key

1. Sign up at [elevenlabs.io](https://elevenlabs.io)
2. Go to **Profile Settings** (click your avatar)
3. Copy your API key

## Step 2: Choose a Voice

Browse voices at [elevenlabs.io/voice-library](https://elevenlabs.io/voice-library).
Note the voice ID from the URL or API. Default voices to consider:

| Voice | ID | Style |
|-------|----|-------|
| Rachel | 21m00Tcm4TlvDq8ikWAM | Calm, professional |
| Adam | pNInz6obpgDQGcFmaJgB | Deep, authoritative |
| Custom | (your clone ID) | Your preference |

## Step 3: Store Credentials

```bash
bun tools/secret.ts write elevenlabs <<< '{"api_key": "YOUR_API_KEY"}'
```

## Step 4: Enable in Settings

Edit `settings.json`:

```json
"channels": {
  "enabled": ["terminal", "voice"],
  "voice": {
    "provider": "elevenlabs",
    "voice_id": "21m00Tcm4TlvDq8ikWAM",
    "model": "eleven_turbo_v2_5",
    "stability": 0.5,
    "similarity_boost": 0.75,
    "speed": 1.0
  }
}
```

## Step 5: Start Poseidon

```bash
bash tools/start.sh
```

## Cost Calculator

ElevenLabs pricing is based on characters generated:

| Plan | Characters/mo | Approx Messages* | Cost |
|------|--------------|-------------------|------|
| Free | 10,000 | ~50 | $0 |
| Starter | 30,000 | ~150 | $5/mo |
| Creator | 100,000 | ~500 | $22/mo |
| Pro | 500,000 | ~2,500 | $99/mo |
| Scale | 2,000,000 | ~10,000 | $330/mo |

*Assumes ~200 characters per spoken response.

**Cost optimization tips:**
- Use `eleven_turbo_v2_5` model (faster, cheaper than v2)
- Set voice responses to summaries only, not full output
- Disable voice for tool-heavy sessions
- Monitor usage at elevenlabs.io/usage

## Voice Parameters

| Parameter | Range | Effect |
|-----------|-------|--------|
| `stability` | 0.0-1.0 | Higher = more consistent, lower = more expressive |
| `similarity_boost` | 0.0-1.0 | Higher = closer to original voice |
| `speed` | 0.5-2.0 | Playback speed multiplier |

Recommended starting values: stability 0.5, similarity 0.75, speed 1.0.
Adjust based on preference after testing.

## Troubleshooting

| Problem | Check |
|---------|-------|
| No audio output | Is your system audio working? Try `aplay /dev/urandom` |
| API errors | Is the API key valid? Check elevenlabs.io/usage |
| Wrong voice | Verify voice_id matches your chosen voice |
| High latency | Switch to `eleven_turbo_v2_5` model |
| Cost too high | Reduce verbosity or switch to text-only for debugging |
