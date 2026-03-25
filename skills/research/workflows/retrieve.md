# Content Retrieval

Progressive escalation for retrieving content from URLs that may be blocked or restricted.

## Parameters

| Field   | Value                                      |
|---------|--------------------------------------------|
| Input   | URL to retrieve                            |
| Agents  | 1                                          |
| Time    | <30 seconds per attempt                    |

## When to Use

- A URL is needed for research but returns an error
- Content is behind a CAPTCHA, paywall, or bot-detection
- A source was cited but the content cannot be accessed directly
- Called internally by other research workflows

## Escalation Chain

Try each method in order. Stop at the first success.

### Level 1: Direct Fetch

Fetch the URL directly using WebFetch or equivalent HTTP tool.
If status 200 and content is substantive (not a block page): done.

### Level 2: Search Cache

Search for the page title or URL in a search engine. Many search engines
cache pages or provide snippets that contain the needed information.

Query: `cache:[url]` or `"[page title]" site:[domain]`

### Level 3: Archive Lookup

Check web archives for a cached copy:
- Query: `site:web.archive.org [url]`
- Query: `[page title] filetype:pdf` (for documents)

### Level 4: Alternative Source

Search for the same content published elsewhere:
- Press releases often appear on multiple sites
- Research papers have preprints on arXiv or SSRN
- Blog posts get syndicated or summarized

### Level 5: User Assistance

If all automated methods fail, ask the user:
```
Could not retrieve content from [url].
Options:
1. Paste the content directly
2. Provide an alternative URL
3. Skip this source
```

## Output

Return the retrieved content as plain text, with metadata:
```
**Source:** [url]
**Method:** [which level succeeded]
**Retrieved:** [date]
**Note:** [any caveats — e.g., "cached version from 2025-12"]
```
