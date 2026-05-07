import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  buildPdfMatchJson,
  extractPdfSemanticTokens,
  type InvoiceCompareJson,
  type InvoicePreviewKeyValue,
} from './invoicePdfPreviewCompare';

/** Written only when {@link writeInvoiceCompareDebugJsonFiles} is invoked (e.g. uncomment the call in SB-062). */
export const INVOICE_COMPARE_DEBUG_DIR = path.join(
  path.resolve(__dirname, '../..'),
  'debug-output',
  'invoice-compare',
);

export type WriteInvoiceCompareDebugParams = Readonly<{
  previewCompareJson: InvoiceCompareJson;
  previewKeyValues: ReadonlyArray<InvoicePreviewKeyValue>;
  previewFullText: string;
  pdfText: string;
}>;

/**
 * Writes template vs PDF compare data as two JSON files under `debug-output/invoice-compare/`.
 * No-op when this function is not called (comment out the call in the spec to disable).
 */
export function writeInvoiceCompareDebugJsonFiles(params: WriteInvoiceCompareDebugParams): void {
  const generatedAt = new Date().toISOString();
  mkdirSync(INVOICE_COMPARE_DEBUG_DIR, { recursive: true });

  const templatePayload = {
    generatedAt,
    compareJson: { fields: { ...params.previewCompareJson.fields } },
    domKeyValues: [...params.previewKeyValues],
    previewFullTextLength: params.previewFullText.length,
  };

  const pdfPayload = {
    generatedAt,
    pdfTextLength: params.pdfText.length,
    semanticTokens: extractPdfSemanticTokens(params.pdfText),
    intersectionFields: buildPdfMatchJson(params.previewCompareJson, params.pdfText).fields,
  };

  writeFileSync(
    path.join(INVOICE_COMPARE_DEBUG_DIR, 'invoice-template-snapshot.json'),
    `${JSON.stringify(templatePayload, null, 2)}\n`,
    'utf8',
  );
  writeFileSync(
    path.join(INVOICE_COMPARE_DEBUG_DIR, 'invoice-pdf-snapshot.json'),
    `${JSON.stringify(pdfPayload, null, 2)}\n`,
    'utf8',
  );
}
