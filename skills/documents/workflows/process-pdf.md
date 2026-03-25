---
name: process-pdf
description: Extract text, tables, and structure from PDF files.
---

## Steps

### 1. Detect PDF Size

```bash
pdfinfo "$FILE" 2>/dev/null | grep Pages   # requires poppler-utils
ls -lh "$FILE"                              # fallback: check file size
```

### 2. Small PDFs (Under 10 Pages)

Use the Read tool directly — it handles PDF files natively:
```
Read /path/to/document.pdf
```

### 3. Large PDFs (10+ Pages)

Process in page ranges to avoid memory issues:
```
Read /path/to/document.pdf pages 1-10
Read /path/to/document.pdf pages 11-20
```
Combine extracted content after all ranges are processed.

### 4. Extract Tables

```bash
# Layout-preserved text
pdftotext -layout "$FILE" -

# Structured table extraction (requires pdfplumber)
python3 -c "
import pdfplumber
with pdfplumber.open('$FILE') as pdf:
    for page in pdf.pages:
        for table in page.extract_tables():
            for row in table:
                print('|'.join(str(c or '') for c in row))
"
```

### 5. Format as Markdown

- Use `#` headings for detected sections
- Convert tables to markdown table syntax
- Preserve list structures
- Note page boundaries with `---` separators

### Scanned PDFs

If text extraction returns empty or garbled content:
```bash
pdffonts "$FILE"   # Empty output = scanned/image PDF
```

Suggest: `tesseract` + `pdf2image` for local OCR, or cloud OCR for complex layouts.

### Tool Requirements

| Tool          | Purpose            | Install                                |
|---------------|--------------------|----------------------------------------|
| poppler-utils | pdfinfo, pdftotext | `apt install poppler-utils` / `brew install poppler` |
| pdfplumber    | Table extraction   | `pip install pdfplumber`               |
| Read tool     | Direct PDF reading | Built-in (Claude)                      |
