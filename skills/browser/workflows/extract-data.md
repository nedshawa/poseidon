---
name: extract-data
description: Extract structured data from web pages.
---

## Steps

### 1. Navigate to Target

```bash
playwright-cli -s=extract open https://example.com/data --persistent
```

### 2. Identify Data Elements

Use `snapshot` to get the page structure:

```bash
playwright-cli -s=extract snapshot
```

The snapshot shows an accessibility tree with element types (table, list, heading, link) and their refs.

### 3. Extract with JavaScript

Use `eval` to run extraction scripts on the page:

**Tables:**
```bash
playwright-cli -s=extract eval "
  const table = document.querySelector('table');
  const rows = [...table.querySelectorAll('tr')];
  const data = rows.map(row =>
    [...row.querySelectorAll('td,th')].map(cell => cell.textContent.trim())
  );
  JSON.stringify(data);
"
```

**Lists:**
```bash
playwright-cli -s=extract eval "
  const items = [...document.querySelectorAll('li')];
  JSON.stringify(items.map(i => i.textContent.trim()));
"
```

**Cards or repeated elements:**
```bash
playwright-cli -s=extract eval "
  const cards = [...document.querySelectorAll('.card')];
  JSON.stringify(cards.map(c => ({
    title: c.querySelector('h3')?.textContent?.trim(),
    description: c.querySelector('p')?.textContent?.trim(),
    link: c.querySelector('a')?.href
  })));
"
```

### 4. Format Output

**As Markdown table:**
```
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| value    | value    | value    |
```

**As JSON:**
```json
[
  {"field": "value", "field2": "value2"},
  {"field": "value", "field2": "value2"}
]
```

**As CSV:**
```
field,field2
value,value2
value,value2
```

### 5. Handle Pagination

If data spans multiple pages:

```bash
# Extract page 1
playwright-cli -s=extract eval "[extraction script]"

# Navigate to next page
playwright-cli -s=extract click e45  # "Next" button ref
playwright-cli -s=extract eval "[extraction script]"

# Repeat until no more pages
```

### 6. Clean Up

```bash
playwright-cli -s=extract close
```

### Tips

- Use `snapshot` first to understand page structure before writing selectors
- Prefer `eval` with `JSON.stringify` for structured output
- For dynamic content, add a short wait: `playwright-cli -s=extract eval "await new Promise(r => setTimeout(r, 2000)); ..."`
- If the site blocks automation, try adding a user-agent header or using slower interaction patterns
