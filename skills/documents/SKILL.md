---
name: documents
description: >-
  Processes and creates documents — PDF extraction, DOCX/XLSX/PPTX reading,
  format conversion, and structured document generation.
  USE WHEN PDF, document, Word, Excel, spreadsheet, PowerPoint, extract text,
  convert format, create document, fill form, large PDF, merge.
---

## Instructions

Route document tasks to the appropriate workflow based on the file type and operation.

### Workflow Routing

| Request                              | Workflow            |
|--------------------------------------|---------------------|
| Extract text from PDF, read PDF      | process-pdf         |
| Read DOCX, XLSX, PPTX, Office files | process-office      |
| Create a report, generate document   | create-document     |

### Supported Formats

| Format | Read | Create | Convert |
|--------|------|--------|---------|
| PDF    | Yes  | Via HTML + Playwright | To markdown |
| DOCX   | Yes (pandoc) | Yes (docx libs) | To markdown, PDF |
| XLSX   | Yes (xlsx tools) | Yes (openpyxl/exceljs) | To CSV, markdown |
| PPTX   | Yes (markitdown) | Limited | To markdown |

### General Approach

1. Detect the file format from extension or user description
2. Route to the matching workflow
3. Default output is structured markdown unless the user specifies otherwise
4. If a required tool is missing, report what to install and offer alternatives

### Rules

- Always preserve source data integrity when extracting
- For large files, process in chunks rather than loading everything at once
- Output markdown by default — it is the most portable format
- If extraction quality is poor (e.g., scanned PDF), say so and suggest OCR
- Never silently drop content — flag when sections are skipped

## Scope

NOT for:
- Running OCR directly (suggest tesseract or cloud OCR services)
- Editing existing documents in-place (suggest dedicated editors)
- Batch processing hundreds of files (suggest a script instead)
- Email or calendar file formats (.eml, .ics)
