---
name: browser
description: >-
  Browser automation using Playwright CLI — screenshots, web testing, form filling,
  data extraction, and UI verification.
  USE WHEN screenshot, browser, automate, web test, verify UI, debug frontend,
  fill form, scrape page, extract data from website, browse.
---

## Instructions

Automate browser tasks using Playwright CLI tools. Prefer CLI commands over spawning agents.

### Workflow Routing

| Request                              | Workflow      |
|--------------------------------------|---------------|
| Automate interactions, fill forms    | automate      |
| Take a screenshot, visual check      | screenshot    |
| Extract data, scrape content         | extract-data  |

### Tool Priority

Use the cheapest tool that gets the job done:

| Task                          | Tool                         | Cost    |
|-------------------------------|------------------------------|---------|
| Screenshot a URL              | `bunx playwright screenshot` | Free    |
| Save page as PDF              | `bunx playwright pdf`        | Free    |
| Check if page loads           | `curl -sf <url>`             | Free    |
| Multi-step interaction        | `playwright-cli -s=<name>`   | Free    |
| Page content as text          | `playwright-cli snapshot`    | Free    |
| Dump raw HTML                 | `chromium --headless --dump-dom` | Free |

### Playwright CLI Basics

```bash
# One-shot screenshot
bunx playwright screenshot "https://example.com" /tmp/shot.png

# Named session for multi-step work
playwright-cli -s=mysession open https://example.com --persistent
playwright-cli -s=mysession snapshot          # accessibility tree
playwright-cli -s=mysession click e12         # click by ref
playwright-cli -s=mysession fill e15 "text"   # fill input by ref
playwright-cli -s=mysession screenshot --filename=/tmp/shot.png
playwright-cli -s=mysession close             # ALWAYS close sessions
```

### Rules

- Always close named sessions when done (prevents zombie processes)
- Use `snapshot` for reading page content — it returns structured text, not pixels
- Use `screenshot` for visual verification — when you need to see layout
- Default viewport is 1280x720 unless the user specifies otherwise
- If a page requires authentication, ask the user for credentials or cookies
- Headless by default — do not open visible browser windows unless asked

## Scope

NOT for:
- Heavy web scraping at scale (suggest dedicated scraping tools)
- Load testing or performance benchmarking
- Browser extension development
- Mobile app testing (Playwright supports mobile emulation, but flag limitations)
