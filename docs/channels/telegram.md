# Setting Up Telegram Channel

## Prerequisites
- Telegram account
- Claude Code v2.1.80+ with channels support
- Poseidon installed (`bun tools/validate.ts` passes)

## Step 1: Create a Telegram Bot

1. Open Telegram, search for **@BotFather**
2. Send `/newbot`
3. Choose a name (e.g., "My Poseidon") and username (e.g., "my_poseidon_bot")
4. Copy the bot token BotFather gives you

## Step 2: Store the Token

```bash
bun tools/secret.ts write telegram <<< '{"bot_token": "YOUR_BOT_TOKEN"}'
```

## Step 3: Enable in Settings

Edit `settings.json` and add a channels block:

```json
"channels": {
  "enabled": ["terminal", "telegram"],
  "telegram": {
    "allowed_users": ["YOUR_USER_ID"]
  }
}
```

## Step 4: Find Your User ID

Message **@userinfobot** on Telegram. It replies with your numeric user ID.
Add that ID to the `allowed_users` array above.

## Step 5: Start Poseidon

```bash
bash tools/start.sh
```

Verify the channel is active:

```bash
bun tools/channels.ts --list
```

## Troubleshooting

| Problem | Check |
|---------|-------|
| Bot not responding | Is the tmux session running? `tmux ls` |
| Messages not arriving | Is your user ID in `allowed_users`? |
| Token rejected | Re-create the bot with @BotFather |
| Channel not in --list | Did you add "telegram" to `channels.enabled`? |
