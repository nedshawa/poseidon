---
name: automate
description: General-purpose browser automation with Playwright CLI.
---

## Steps

### 1. Open Session and Discover Elements

```bash
playwright-cli -s=task open https://example.com --persistent
playwright-cli -s=task snapshot
# Returns: button "Login" [ref=e5], textbox "Search" [ref=e8], ...
```

### 2. Execute Interactions

Use refs from snapshot to interact reliably:
```bash
playwright-cli -s=task click e5          # Click element
playwright-cli -s=task fill e8 "query"   # Fill input
playwright-cli -s=task press Enter        # Press key
playwright-cli -s=task snapshot           # Check result
```

### 3. Capture Results

```bash
playwright-cli -s=task screenshot --filename=/tmp/result.png
playwright-cli -s=task snapshot > /tmp/content.txt
playwright-cli -s=task eval "document.title"
```

### 4. Clean Up

```bash
playwright-cli -s=task close   # ALWAYS close sessions
```

### Common Recipes

**Login flow:**
```bash
playwright-cli -s=login open https://app.example.com/login --persistent
playwright-cli -s=login snapshot
playwright-cli -s=login fill e10 "user@example.com"
playwright-cli -s=login fill e12 "password"
playwright-cli -s=login click e15
playwright-cli -s=login snapshot   # Verify dashboard loaded
playwright-cli -s=login close
```

**Form submission:**
```bash
playwright-cli -s=form open https://example.com/contact --persistent
playwright-cli -s=form snapshot
playwright-cli -s=form fill e20 "Jane Doe"
playwright-cli -s=form fill e22 "jane@example.com"
playwright-cli -s=form fill e24 "Message text here"
playwright-cli -s=form click e30   # Submit
playwright-cli -s=form snapshot    # Check confirmation
playwright-cli -s=form close
```

**Multi-page navigation:**
```bash
playwright-cli -s=nav open https://example.com --persistent
playwright-cli -s=nav click e5             # Link to page 2
playwright-cli -s=nav snapshot             # Read page 2
playwright-cli -s=nav goto https://example.com/page3
playwright-cli -s=nav snapshot             # Read page 3
playwright-cli -s=nav close
```
