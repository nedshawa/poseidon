# Setting Up Discord Channel

## Prerequisites
- Discord account with a server you manage
- Claude Code v2.1.80+ with channels support
- Poseidon installed (`bun tools/validate.ts` passes)

## Step 1: Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**, give it a name
3. Go to **Bot** tab, click **Add Bot**
4. Under Token, click **Copy** to get your bot token
5. Enable **Message Content Intent** under Privileged Gateway Intents

## Step 2: Invite the Bot to Your Server

1. Go to **OAuth2 > URL Generator**
2. Select scopes: `bot`, `applications.commands`
3. Select permissions: `Send Messages`, `Read Message History`, `Read Messages/View Channels`
4. Copy the generated URL and open it in your browser
5. Select your server and authorize

## Step 3: Store the Token

```bash
bun tools/secret.ts write discord <<< '{"bot_token": "YOUR_BOT_TOKEN"}'
```

## Step 4: Enable in Settings

Edit `settings.json` and add Discord to channels:

```json
"channels": {
  "enabled": ["terminal", "discord"],
  "discord": {
    "allowed_servers": ["YOUR_SERVER_ID"],
    "allowed_channels": ["YOUR_CHANNEL_ID"]
  }
}
```

To find IDs: Enable Developer Mode in Discord settings, then right-click server/channel and Copy ID.

## Step 5: Start Poseidon

```bash
bash tools/start.sh
```

Verify:

```bash
bun tools/channels.ts --list
```

## Troubleshooting

| Problem | Check |
|---------|-------|
| Bot offline | Is the tmux session running? `tmux ls` |
| No response in channel | Is the channel ID in `allowed_channels`? |
| Missing permissions | Re-invite with correct OAuth2 scopes |
| Token invalid | Regenerate in Developer Portal > Bot |
