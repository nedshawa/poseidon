---
name: extract-data
description: Extract structured data from web pages.
---

## Steps

### 1. Navigate and Inspect

```bash
playwright-cli -s=extract open https://example.com/data --persistent
playwright-cli -s=extract snapshot   # Shows element types and refs
```

### 2. Extract with JavaScript

**Tables:**
```bash
playwright-cli -s=extract eval "
  const rows = [...document.querySelectorAll('table tr')];
  JSON.stringify(rows.map(r =>
    [...r.querySelectorAll('td,th')].map(c => c.textContent.trim())
  ));
"
```

**Lists:**
```bash
playwright-cli -s=extract eval "
  JSON.stringify([...document.querySelectorAll('li')].map(i => i.textContent.trim()));
"
```

**Repeated elements (cards, items):**
```bash
playwright-cli -s=extract eval "
  JSON.stringify([...document.querySelectorAll('.card')].map(c => ({
    title: c.querySelector('h3')?.textContent?.trim(),
    description: c.querySelector('p')?.textContent?.trim(),
    link: c.querySelector('a')?.href
  })));
"
```

### 3. Format Output

As markdown table, JSON array, or CSV depending on user preference. Default to markdown.

### 4. Handle Pagination

```bash
playwright-cli -s=extract eval "[extraction script]"   # Page 1
playwright-cli -s=extract click e45                     # "Next" button
playwright-cli -s=extract eval "[extraction script]"   # Page 2
# Repeat until no more pages
```

### 5. Clean Up

```bash
playwright-cli -s=extract close
```

### Tips

- Use `snapshot` first to understand page structure before writing selectors
- Prefer `eval` with `JSON.stringify` for structured output
- For dynamic content, add a wait inside eval: `await new Promise(r => setTimeout(r, 2000))`
- If the site blocks automation, try slower interaction patterns
