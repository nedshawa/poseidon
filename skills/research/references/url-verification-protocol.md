# URL Verification Protocol

Rules for preventing hallucinated URLs in research output.

## Core Rules

1. **Never generate URLs from memory.** Only use URLs found in search results
   from the current research session.

2. **Verify every URL before including it in output.** Use a HEAD or GET request
   to confirm the URL returns a 200-class status code.

3. **If a URL returns non-200:** Remove it from the output. Replace with
   `[source unavailable — original: domain.com]`. Do not guess an alternative URL.

4. **Prefer authoritative domains.** When multiple sources cover the same claim,
   prefer URLs from official documentation, established publications, and
   primary sources over blogs, forums, or aggregator sites.

5. **No URL construction.** Do not assemble URLs by combining a domain with
   a guessed path. If a search result provides a URL, use it exactly as returned.

## Verification Process

For each URL in the research output:

1. Extract all URLs using pattern matching
2. For each URL, attempt a HEAD request
3. Classify the result:
   - **200-299:** Verified. Include in output.
   - **301/302:** Follow redirect. Verify final destination. Use final URL.
   - **403/404/5xx:** Broken. Remove from output with `[source unavailable]` note.
   - **Timeout/unreachable:** Mark as `[unverified]`. Include but flag.
4. If no HTTP tool is available, mark all URLs as `[unverified]` and note this
   in the research output footer.

## Common Failure Patterns

- URLs that look plausible but use wrong path structures
- Documentation URLs with version numbers that have changed
- Blog posts that have been taken down or moved
- GitHub repositories that have been renamed or archived

## When Verification is Not Possible

If the research environment lacks HTTP request capabilities, include this
footer in the output:

```
Note: URLs in this report have not been independently verified.
Confirm links before citing in external documents.
```
