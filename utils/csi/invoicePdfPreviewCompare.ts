import { expect } from '@playwright/test';

// pdf-parse v2: class-based API (see package README).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse') as {
  PDFParse: new (opts: { data: Buffer }) => {
    getText: () => Promise<{ text: string }>;
    destroy: () => Promise<void>;
  };
};

export type InvoicePreviewKeyValue = { key: string; value: string };

/**
 * JSON-shaped snapshot for SB-062: `fields` maps each template label/key to the value token(s)
 * parsed from the DOM (pipe-separated line rows become multiple strings).
 */
export type InvoiceCompareJson = Readonly<{
  fields: Record<string, string[]>;
}>;

function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/[\t\f\v]+/g, ' ').trim();
}

function comparableAmountToken(raw: string): string {
  return raw
    .replace(/HK\$/gi, '')
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

function haystackFlat(haystackText: string): string {
  return normalizeWhitespace(haystackText).replace(/\s+/g, ' ');
}

/** Layout-tolerant: `needle` appears in `haystackText` (used for PDF⊆template and template-token∈PDF). */
export function segmentFoundInHaystack(haystackText: string, needle: string): boolean {
  const seg = needle.replace(/\s+/g, ' ').trim();
  if (!seg) {
    return true;
  }

  const flat = haystackFlat(haystackText);
  if (flat.includes(seg)) {
    return true;
  }

  const flatNoComma = flat.replace(/,/g, '');
  const segNoComma = seg.replace(/,/g, '');
  if (flatNoComma.includes(segNoComma)) {
    return true;
  }

  const core = comparableAmountToken(seg);
  if (core.length >= 2 && /\d/.test(core)) {
    if (flatNoComma.includes(core)) {
      return true;
    }
    const flatCompact = flat.replace(/\s/g, '').toLowerCase();
    if (flatCompact.includes(core)) {
      return true;
    }
  }

  const segCompact = seg.replace(/\s/g, '');
  if (segCompact.length >= 3 && flat.replace(/\s/g, '').includes(segCompact)) {
    return true;
  }

  return false;
}

function valueToSegments(value: string): string[] {
  const parts = value
    .split(/\s*\|\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (parts.length > 0) {
    return parts;
  }
  const single = value.replace(/\s+/g, ' ').trim();
  return single.length > 0 ? [single] : [];
}

/** Turns live DOM key/value rows into a plain JSON-serializable compare snapshot. */
export function previewKeyValuesToCompareJson(
  entries: ReadonlyArray<InvoicePreviewKeyValue>,
): InvoiceCompareJson {
  const fields: Record<string, string[]> = {};

  for (const { key, value } of entries) {
    const k = key.replace(/\s+/g, ' ').trim();
    if (!k) {
      continue;
    }
    const segments = valueToSegments(value);
    if (segments.length === 0) {
      continue;
    }
    if (fields[k] == null) {
      fields[k] = [];
    }
    for (const seg of segments) {
      if (!fields[k].includes(seg)) {
        fields[k].push(seg);
      }
    }
  }

  return { fields };
}

function flattenPreviewValues(preview: InvoiceCompareJson): string {
  return Object.values(preview.fields)
    .flat()
    .join('\n');
}

/**
 * Pulls invoice-like literals from PDF text (no template keys): numbers, money, bank id, email.
 * Used to assert PDF content is covered by the richer on-page template (PDF ⊆ template).
 */
export function extractPdfSemanticTokens(pdfText: string): string[] {
  const raw = normalizeWhitespace(pdfText);
  const set = new Set<string>();

  for (const m of raw.matchAll(/\bAT\d{4,}\b/g)) {
    set.add(m[0]);
  }
  for (const m of raw.matchAll(/HK\$\s*[\d,]+\.?\d*/gi)) {
    set.add(m[0].replace(/\s+/g, ''));
  }
  for (const m of raw.matchAll(/\$\s*[\d,]+\.?\d*/g)) {
    const tok = m[0].replace(/\s+/g, '').trim();
    if (tok.length > 1) {
      set.add(tok);
    }
  }
  for (const m of raw.matchAll(/\b\d{3}-\d{3,}-\d{3,}\b/g)) {
    set.add(m[0]);
  }
  for (const m of raw.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) {
    set.add(m[0]);
  }

  return [...set];
}

/**
 * For each preview field, lists template value tokens that also appear in the PDF (intersection only).
 */
export function buildPdfMatchJson(preview: InvoiceCompareJson, pdfText: string): InvoiceCompareJson {
  const fields: Record<string, string[]> = {};
  const pdf = normalizeWhitespace(pdfText);

  for (const [key, expected] of Object.entries(preview.fields)) {
    fields[key] = expected.filter((seg) => segmentFoundInHaystack(pdf, seg));
  }

  return { fields };
}

/**
 * SB-062: PDF is a **subset** of the template — every semantic token found in the PDF must appear on the
 * preview; the template may contain extra rows/copy. Also requires some overlap between PDF and preview JSON.
 */
export function assertInvoicePdfSubsetOfPreviewTemplate(
  preview: InvoiceCompareJson,
  previewFullText: string,
  pdfText: string,
): void {
  expect(Object.keys(preview.fields).length, 'preview JSON should have at least one field').toBeGreaterThan(
    0,
  );

  const pdf = normalizeWhitespace(pdfText);
  expect(pdf.length, 'PDF text extraction should yield content').toBeGreaterThan(15);

  const templateHaystack = `${previewFullText}\n${flattenPreviewValues(preview)}`;
  expect(templateHaystack.trim().length, 'preview body text should be non-empty').toBeGreaterThan(40);

  const pdfFacts = extractPdfSemanticTokens(pdf);
  expect(pdfFacts.length, 'PDF should yield at least one comparable token').toBeGreaterThan(0);

  for (const fact of pdfFacts) {
    expect(
      segmentFoundInHaystack(templateHaystack, fact),
      `PDF token should appear on invoice template (PDF ⊆ template): "${fact}"`,
    ).toBe(true);
  }

  const matched = buildPdfMatchJson(preview, pdfText);
  const overlap = Object.values(matched.fields).some((arr) => arr.length > 0);
  expect(overlap, 'at least one preview JSON value should appear in the PDF').toBe(true);
}

export async function extractInvoicePdfText(pdfBuffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: pdfBuffer });
  try {
    const result = await parser.getText();
    return normalizeWhitespace(result.text ?? '');
  } finally {
    await parser.destroy().catch(() => {});
  }
}
