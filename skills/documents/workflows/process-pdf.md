---
name: process-pdf
description: Extract text, tables, and structure from PDF files.
---

## Steps

### 1. Detect PDF Size

```bash
# Get page count (requires poppler-utils)
pdfinfo "$FILE" 2>/dev/null | grep Pages
# Fallback: check file size
ls -lh "$FILE"
```

### 2. Small PDFs (Under 10 Pages)

Use the Read tool directly — it handles PDF files natively:

```
Read the file at /path/to/document.pdf
```

The Read tool renders PDF content including text and basic structure.

### 3. Large PDFs (10+ Pages)

Process in page ranges to avoid memory issues:

```
Read /path/to/document.pdf pages 1-10
Read /path/to/document.pdf pages 11-20
```

Combine extracted content after all ranges are processed.

### 4. Extract Tables

For PDFs with tabular data, use command-line tools:

```bash
# pdftotext with layout preservation
pdftotext -layout "$FILE" -

# For structured table extraction (requires Python + pdfplumber)
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

Structure the extracted content:
- Use `#` headings for detected sections
- Convert tables to markdown table syntax
- Preserve list structures
- Note page boundaries with `---` separators

### Scanned PDFs

If text extraction returns empty or garbled content, the PDF is likely scanned:

```bash
# Check if PDF contains images rather than text
pdffonts "$FILE"  # Empty output = scanned/image PDF
```

Suggest OCR options:
- `tesseract` + `pdf2image` for local processing
- Cloud OCR services for high-volume or complex layouts

### Tool Requirements

| Tool | Purpose | Install |
|------|---------|---------|
| poppler-utils | pdfinfo, pdftotext, pdffonts | `apt install poppler-utils` / `brew install poppler` |
| pdfplumber | Table extraction | `pip install pdfplumber` |
| Read tool | Direct PDF reading | Built-in (Claude) |
