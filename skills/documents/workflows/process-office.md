---
name: process-office
description: Read and extract content from DOCX, XLSX, and PPTX files.
---

## Steps

### 1. Detect Format

Identify the file type from extension:
- `.docx` → Word document
- `.xlsx` → Excel spreadsheet
- `.pptx` → PowerPoint presentation
- `.doc`, `.xls`, `.ppt` → Legacy formats (convert first)

### 2. Word Documents (.docx)

**Primary method — pandoc:**
```bash
pandoc "$FILE" -t markdown -o output.md
```

**Fallback — unzip and parse XML:**
```bash
# DOCX files are ZIP archives containing XML
unzip -p "$FILE" word/document.xml | sed -e 's/<[^>]*>//g'
```

**Extract with structure:**
- Headings become markdown headings
- Tables become markdown tables
- Lists preserve nesting
- Images are noted as `[Image: filename]`

### 3. Excel Spreadsheets (.xlsx)

**Primary method — command-line tools:**
```bash
# Using ssconvert (from gnumeric)
ssconvert "$FILE" output.csv

# Using Python
python3 -c "
import openpyxl
wb = openpyxl.load_workbook('$FILE', data_only=True)
for sheet in wb.sheetnames:
    ws = wb[sheet]
    print(f'## {sheet}')
    for row in ws.iter_rows(values_only=True):
        print('|'.join(str(c or '') for c in row))
"
```

**Structure the output:**
- Each sheet becomes a markdown section
- Data rows become markdown tables
- Note formula cells vs. static values
- Flag any charts or pivot tables (cannot extract directly)

### 4. PowerPoint Presentations (.pptx)

**Primary method — markitdown or pandoc:**
```bash
# markitdown (if available)
markitdown "$FILE"

# pandoc
pandoc "$FILE" -t markdown
```

**Fallback — unzip and parse:**
```bash
# Extract slide text from XML
for slide in $(unzip -l "$FILE" | grep 'ppt/slides/slide' | awk '{print $4}'); do
  echo "---"
  unzip -p "$FILE" "$slide" | sed -e 's/<[^>]*>//g' | tr -s '[:space:]' '\n'
done
```

**Structure the output:**
- Each slide becomes a section with `---` separator
- Speaker notes included when present
- Images noted as `[Image: description]`

### 5. Legacy Formats (.doc, .xls, .ppt)

Convert to modern format first:
```bash
libreoffice --headless --convert-to docx "$FILE"
libreoffice --headless --convert-to xlsx "$FILE"
libreoffice --headless --convert-to pptx "$FILE"
```

Then process the converted file with the steps above.

### Graceful Degradation

If a tool is missing, report it clearly:

```
Required tool `pandoc` is not installed.
Install: apt install pandoc / brew install pandoc

Falling back to XML extraction (reduced formatting quality).
```

Always attempt at least one fallback before failing.
