import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { utcDateBasedNumber } from '../dateUtils';
import {
  csiItAssetCurrency,
  csiItAssetIpAddress,
  csiItAssetLocation,
  csiItAssetManufacturer,
  csiItAssetOperatingSystem,
  csiItAssetOsVersion,
  csiItAssetState,
  csiItAssetSupplier,
} from './itAssetManagementTestData';

const IA003_ASSET_SHEET = 'Asset';
export const IA003_BULK_ASSET_ROW_COUNT = 10;

/**
 * Copies the edited IA-003 workbook into `recorded-steps/ITAssetManagement/IA-003` (creates dirs).
 * Uncomment the call in `ITAssetManagement.spec.ts` (IA-003) after `buildIa003BulkClientMachineWorkbook` to enable.
 */
export function saveIa003EditedWorkbookArtifact(editedPath: string): void {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const destDir = path.join(repoRoot, 'recorded-steps', 'ITAssetManagement', 'IA-003');
  fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, path.basename(editedPath));
  fs.copyFileSync(editedPath, destPath);
}

/** Distinct starting model numbers per worker for 10 sequential rows. */
export function csiIa003BulkBaseNumeric(): number {
  const worker = Number((process.env.TEST_WORKER_INDEX ?? '0').replace(/\D/g, '') || '0');
  const slice = utcDateBasedNumber().slice(2);
  const n = Number.parseInt(slice, 10) % 890_000;
  return n + 100_000 + worker * 11_000;
}

function serialNumberFromModelNumber(modelNumber: number): number {
  return Number(String(modelNumber).split('').reverse().join(''));
}

function formatUsShortDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function blankRow(length: number): unknown[] {
  return Array.from({ length }, () => '');
}

/** Match Excel headers after BOM/NBSP/whitespace cleanup and optional trailing `*`. */
function normalizeHeaderLabel(s: unknown): string {
  return String(s ?? '')
    .replace(/^\ufeff/, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\*+\s*$/, '')
    .toLowerCase();
}

function colIndex(headers: unknown[], label: string): number {
  const want = normalizeHeaderLabel(label);
  return headers.findIndex((h) => normalizeHeaderLabel(h) === want);
}

const IA003_HEADER_SIGNATURE = ['asset name', 'manufacturer', 'model number'] as const;

function headerSignatureHits(row: unknown[]): number {
  const norm = row.map(normalizeHeaderLabel);
  return IA003_HEADER_SIGNATURE.filter((k) => norm.includes(k)).length;
}

/** Downloaded templates may have title/instruction rows above the real header row. */
function findAssetHeaderRowIndex(grid: unknown[][]): number {
  let best = 0;
  let bestHits = headerSignatureHits(grid[0] ?? []);
  const maxScan = Math.min(30, grid.length);
  for (let r = 1; r < maxScan; r += 1) {
    const hits = headerSignatureHits(grid[r] ?? []);
    if (hits > bestHits) {
      bestHits = hits;
      best = r;
    }
  }
  if (bestHits >= 2) return best;
  return 0;
}

function padRowToWidth(row: unknown[], width: number): unknown[] {
  const out = row.slice(0, width);
  while (out.length < width) out.push('');
  return out;
}

/**
 * Keeps the downloaded `Asset` sheet preamble and detected header row unchanged; appends
 * {@link IA003_BULK_ASSET_ROW_COUNT} data rows aligned to those headers (IA-003).
 */
export function buildIa003BulkClientMachineWorkbook(params: {
  downloadedTemplatePath: string;
  outputPath: string;
  baseNumeric: number;
}): string[] {
  const { downloadedTemplatePath, outputPath, baseNumeric } = params;
  const workbook = XLSX.readFile(downloadedTemplatePath);
  const sheet = workbook.Sheets[IA003_ASSET_SHEET];
  if (sheet == null) {
    throw new Error(`IA-003: workbook missing sheet "${IA003_ASSET_SHEET}"`);
  }

  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' }) as unknown[][];
  if (grid.length === 0) {
    throw new Error('IA-003: Asset sheet has no rows');
  }

  const headerRowIndex = findAssetHeaderRowIndex(grid);
  const preamble = grid.slice(0, headerRowIndex);
  const headerCells = (grid[headerRowIndex] ?? []) as unknown[];
  const width = Math.max(
    headerCells.length,
    ...preamble.map((r) => r.length),
    1,
  );
  const headerRow = padRowToWidth(headerCells, width);

  const acquisition = new Date();
  acquisition.setDate(acquisition.getDate() + 1);
  const warranty = new Date(acquisition);
  warranty.setFullYear(warranty.getFullYear() + 1);
  const acquisitionStr = formatUsShortDate(acquisition);
  const warrantyStr = formatUsShortDate(warranty);

  const ix = {
    assetName: colIndex(headerRow, 'Asset Name'),
    manufacturer: colIndex(headerRow, 'Manufacturer'),
    modelNumber: colIndex(headerRow, 'Model Number'),
    os: colIndex(headerRow, 'Operating System (OS)'),
    osVersion: colIndex(headerRow, 'OS Version'),
    serial: colIndex(headerRow, 'Serial Number'),
    ip: colIndex(headerRow, 'IP Address'),
    subnet: colIndex(headerRow, 'Subnet Mask'),
    endpoint: colIndex(headerRow, 'Endpoint Protection'),
    state: colIndex(headerRow, 'Asset State'),
    location: colIndex(headerRow, 'Asset Location'),
    group: colIndex(headerRow, 'Group'),
    user: colIndex(headerRow, 'User'),
    supplier: colIndex(headerRow, 'Supplier Name'),
    website: colIndex(headerRow, 'Supplier Website'),
    currency: colIndex(headerRow, 'Currency'),
    purchaseCost: colIndex(headerRow, 'Purchase Cost'),
    acquisition: colIndex(headerRow, 'Acquisition Date'),
    warranty: colIndex(headerRow, 'Warranty Expiry Date'),
    eol: colIndex(headerRow, 'End of Life Date'),
    invoice: colIndex(headerRow, 'Purchase Invoice'),
    linkDevice: colIndex(headerRow, 'Link Device Section'),
  };

  const set = (row: unknown[], idx: number, value: unknown) => {
    if (idx >= 0 && idx < row.length) {
      row[idx] = value;
    }
  };

  const rows: unknown[][] = [
    ...preamble.map((r) => padRowToWidth(r as unknown[], width)),
    headerRow,
  ];
  const assetNames: string[] = [];

  for (let i = 0; i < IA003_BULK_ASSET_ROW_COUNT; i += 1) {
    const modelNumber = baseNumeric + i;
    const assetName = `Test Asset ${modelNumber}`;
    assetNames.push(assetName);
    const row = blankRow(width);
    set(row, ix.assetName, assetName);
    set(row, ix.manufacturer, csiItAssetManufacturer);
    set(row, ix.modelNumber, modelNumber);
    set(row, ix.os, csiItAssetOperatingSystem);
    set(row, ix.osVersion, Number(csiItAssetOsVersion()));
    set(row, ix.serial, serialNumberFromModelNumber(modelNumber));
    set(row, ix.ip, csiItAssetIpAddress());
    set(row, ix.subnet, '');
    set(row, ix.endpoint, '');
    set(row, ix.state, csiItAssetState);
    set(row, ix.location, csiItAssetLocation());
    set(row, ix.group, '');
    set(row, ix.user, '');
    set(row, ix.supplier, csiItAssetSupplier);
    set(row, ix.website, 'test.com');
    set(row, ix.currency, csiItAssetCurrency);
    set(row, ix.purchaseCost, '');
    set(row, ix.acquisition, acquisitionStr);
    set(row, ix.warranty, warrantyStr);
    set(row, ix.eol, '');
    set(row, ix.invoice, '');
    set(row, ix.linkDevice, '');
    rows.push(row);
  }

  workbook.Sheets[IA003_ASSET_SHEET] = XLSX.utils.aoa_to_sheet(rows);
  XLSX.writeFile(workbook, outputPath);
  return assetNames;
}
