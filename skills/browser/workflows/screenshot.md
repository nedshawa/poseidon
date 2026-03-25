---
name: screenshot
description: Capture screenshots of web pages for visual verification.
---

## Steps

### 1. One-Shot Screenshot

For a quick capture with no interaction needed:

```bash
# Default viewport (1280x720)
bunx playwright screenshot "https://example.com" /tmp/screenshot.png

# Full page (scrolls to capture everything)
bunx playwright screenshot --full-page "https://example.com" /tmp/full.png

# Custom wait (for JS-heavy pages)
bunx playwright screenshot --wait-for-timeout 3000 "https://example.com" /tmp/loaded.png
```

### 2. Screenshot After Interaction

When you need to navigate or interact before capturing:

```bash
playwright-cli -s=shot open https://example.com --persistent
# ... perform interactions ...
playwright-cli -s=shot screenshot --filename=/tmp/after-interaction.png
playwright-cli -s=shot close
```

### 3. Custom Viewport

```bash
# Set viewport before opening
PLAYWRIGHT_MCP_VIEWPORT_SIZE=1440x900 playwright-cli -s=wide open https://example.com --persistent
playwright-cli -s=wide screenshot --filename=/tmp/wide.png
playwright-cli -s=wide close

# Mobile viewport
PLAYWRIGHT_MCP_VIEWPORT_SIZE=375x812 playwright-cli -s=mobile open https://example.com --persistent
playwright-cli -s=mobile screenshot --filename=/tmp/mobile.png
playwright-cli -s=mobile close
```

### 4. View the Screenshot

Use the Read tool to view the captured image:

```
Read /tmp/screenshot.png
```

### 5. Compare Screenshots (Manual)

Capture before and after, then compare visually:

```bash
# Before change
bunx playwright screenshot "https://example.com" /tmp/before.png

# [make changes]

# After change
bunx playwright screenshot "https://example.com" /tmp/after.png
```

View both with the Read tool and note differences.

### Common Viewport Sizes

| Device      | Size      |
|-------------|-----------|
| Desktop     | 1280x720  |
| Desktop HD  | 1920x1080 |
| Laptop      | 1440x900  |
| Tablet      | 768x1024  |
| Mobile      | 375x812   |
