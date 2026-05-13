import path from 'path';
import { csiItAssetUniqueNumeric } from './itAssetManagementTestData';

const IA011_DATA_DIR = path.join(process.cwd(), 'data', 'csi', 'it-asset-management');

/** IA-011: fixture PDFs for Quotation / Delivery Notes / Purchase Invoice uploads. */
export const ia011QuotationPdfPath = path.join(IA011_DATA_DIR, 'Test Quotation.pdf');
export const ia011DeliveryNotesPdfPath = path.join(IA011_DATA_DIR, 'Test Delivery Notes.pdf');
export const ia011PurchaseInvoicePdfPath = path.join(IA011_DATA_DIR, 'Test Purchase Invoice.pdf');

export const ia011QuotationPdfFileName = 'Test Quotation.pdf';
export const ia011DeliveryNotesPdfFileName = 'Test Delivery Notes.pdf';
export const ia011PurchaseInvoicePdfFileName = 'Test Purchase Invoice.pdf';

/** IA-011 recorded pattern: `Purchase` + unique numeric (purpose / list remark). */
export function csiItAssetPurchaseOrderPurposeRemark(): string {
  return `Purchase ${csiItAssetUniqueNumeric()}`;
}
