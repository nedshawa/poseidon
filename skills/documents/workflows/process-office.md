---
name: process-office
description: Read and extract content from DOCX, XLSX, and PPTX files.
---

## Steps

### 1. Detect Format

- `.docx` — Word document
- `.xlsx` — Excel spreadsheet
- `.pptx` — PowerPoint presentation
- `.doc`, `.xls`, `.ppt` — Legacy (convert with `libreoffice --headless --convert-to docx`)

### 2. Word Documents (.docx)

```bash
# Primary: pandoc
pandoc "$FILE" -t markdown -o output.md

# Fallback: extract raw text from XML
unzip -p "$FILE" word/document.xml | sed -e 's/<[^>]*>//g'
```

Output: headings as markdown headings, tables as markdown tables, images noted as `[Image: filename]`.

### 3. Excel Spreadsheets (.xlsx)

```bash
# Primary: ssconvert (gnumeric)
ssconvert "$FILE" output.csv

# Alternative: Python + openpyxl
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

Output: each sheet as a markdown section, data rows as markdown tables.

### 4. PowerPoint Presentations (.pptx)

```bash
# Primary: markitdown or pandoc
markitdown "$FILE"
pandoc "$FILE" -t markdown

# Fallback: extract text from slide XML
for slide in $(unzip -l "$FILE" | grep 'ppt/slides/slide' | awk '{print $4}'); do
  echo "---"
  unzip -p "$FILE" "$slide" | sed -e 's/<[^>]*>//g' | tr -s '[:space:]' '\n'
done
```

Output: each slide as a section with `---` separators, speaker notes included.

### Graceful Degradation

If a tool is missing, report what to install and try XML fallback extraction.

**Tools:** pandoc (DOCX/PPTX), openpyxl (XLSX), ssconvert (XLSX to CSV), markitdown (PPTX), libreoffice (legacy conversion).
