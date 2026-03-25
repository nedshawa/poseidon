---
name: automate
description: General-purpose browser automation with Playwright CLI.
---

## Steps

### 1. Identify Target

Determine the URL and what interactions are needed:
- What page to visit
- What actions to perform (click, type, scroll, submit)
- What result to capture (screenshot, text, download)

### 2. Plan Interactions

Map the sequence of actions. Use `snapshot` to discover element refs:

```bash
playwright-cli -s=task open https://example.com --persistent
playwright-cli -s=task snapshot
# Returns: button "Login" [ref=e5], textbox "Search" [ref=e8], ...
```

### 3. Execute

Use refs from snapshot to interact reliably:

```bash
playwright-cli -s=task click e5          # Click element
playwright-cli -s=task fill e8 "query"   # Fill input
playwright-cli -s=task press Enter        # Press key
playwright-cli -s=task snapshot           # Check result
```

### 4. Capture Results

```bash
# Screenshot
playwright-cli -s=task screenshot --filename=/tmp/result.png

# Page content as structured text
playwright-cli -s=task snapshot > /tmp/page-content.txt

# Run JavaScript to extract specific data
playwright-cli -s=task eval "document.title"
```

### 5. Clean Up

```bash
playwright-cli -s=task close
```

### Common Recipes

**Login flow:**
```bash
playwright-cli -s=login open https://app.example.com/login --persistent
playwright-cli -s=login snapshot
# Find email [ref=e10], password [ref=e12], submit [ref=e15]
playwright-cli -s=login fill e10 "user@example.com"
playwright-cli -s=login fill e12 "password"
playwright-cli -s=login click e15
playwright-cli -s=login snapshot  # Verify dashboard loaded
playwright-cli -s=login close
```

**Form submission:**
```bash
playwright-cli -s=form open https://example.com/contact --persistent
playwright-cli -s=form snapshot
playwright-cli -s=form fill e20 "Jane Doe"
playwright-cli -s=form fill e22 "jane@example.com"
playwright-cli -s=form fill e24 "Hello, I have a question about..."
playwright-cli -s=form click e30  # Submit button
playwright-cli -s=form snapshot   # Check confirmation message
playwright-cli -s=form close
```

**Multi-page navigation:**
```bash
playwright-cli -s=nav open https://example.com --persistent
playwright-cli -s=nav click e5          # Navigate to page 2
playwright-cli -s=nav snapshot          # Read page 2
playwright-cli -s=nav goto https://example.com/page3
playwright-cli -s=nav snapshot          # Read page 3
playwright-cli -s=nav close
```
