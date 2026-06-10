import fs from 'node:fs';
import path from 'node:path';

import * as XLSX from 'xlsx';

export type BulkUserRow = Readonly<{
  firstName: string;
  lastName: string;
  email: string;
  position: string;
}>;

type UserCounterState = {
  lastUserNumber: number;
};

const USER_COUNTER_PATH = path.resolve(__dirname, '../../storage/userCounter.json');

function titleCase(value: string): string {
  if (value.length === 0) {
    return value;
  }
  return `${value[0].toUpperCase()}${value.slice(1).toLowerCase()}`;
}

function readUserCounter(): UserCounterState {
  const raw = fs.readFileSync(USER_COUNTER_PATH, 'utf8');
  const parsed = JSON.parse(raw) as Partial<UserCounterState>;
  const last = parsed.lastUserNumber;
  if (typeof last !== 'number' || !Number.isFinite(last)) {
    throw new Error(`Invalid lastUserNumber in ${USER_COUNTER_PATH}`);
  }
  return { lastUserNumber: last };
}

function writeUserCounter(next: UserCounterState): void {
  fs.writeFileSync(USER_COUNTER_PATH, `${JSON.stringify(next, null, 4)}\n`, 'utf8');
}

function parseSystemOwnerEmailForBulkPattern(systemOwnerEmail: string): {
  firstName: string;
  firstNameToken: string;
  lastNameBase: string;
  domain: string;
} {
  const [localRaw, domainRaw] = systemOwnerEmail.trim().toLowerCase().split('@');
  if (!localRaw || !domainRaw) {
    throw new Error(`System owner email is invalid: ${systemOwnerEmail}`);
  }

  const localParts = localRaw.split('.');
  if (localParts.length < 2) {
    throw new Error(`Expected local-part with dot separator in: ${systemOwnerEmail}`);
  }

  const firstNameToken = localParts[0];
  const lastPart = localParts.slice(1).join('.');
  const plusIndex = lastPart.indexOf('+');
  const lastNameBase = plusIndex >= 0 ? lastPart.slice(0, plusIndex) : lastPart;

  if (firstNameToken.length === 0 || lastNameBase.length === 0) {
    throw new Error(`Could not derive first/last name from: ${systemOwnerEmail}`);
  }

  return {
    firstName: titleCase(firstNameToken),
    firstNameToken,
    lastNameBase,
    domain: domainRaw,
  };
}

export function buildBulkUsersFromSystemOwnerEmail(
  systemOwnerEmail: string,
  count = 5,
  position = 'QA',
): { rows: BulkUserRow[]; startingNumber: number; endingNumber: number } {
  const { lastUserNumber } = readUserCounter();
  const { firstName, firstNameToken, lastNameBase, domain } =
    parseSystemOwnerEmailForBulkPattern(systemOwnerEmail);

  const rows: BulkUserRow[] = [];
  for (let i = 1; i <= count; i += 1) {
    const n = lastUserNumber + i;
    rows.push({
      firstName,
      lastName: `${titleCase(lastNameBase)}${n}`,
      email: `${firstNameToken}.${lastNameBase}+${n}@${domain}`,
      position,
    });
  }

  writeUserCounter({ lastUserNumber: lastUserNumber + count });
  return {
    rows,
    startingNumber: lastUserNumber + 1,
    endingNumber: lastUserNumber + count,
  };
}

/**
 * AM-028: same naming logic as `buildBulkUsersFromSystemOwnerEmail` but writes `invalid.com`
 * as the email domain so every row triggers an "Invalid domain" validation error on upload.
 * Returns both `uploadRows` (for the Excel file) and `fixedRows` (real domain, for post-fix
 * grid verification after the UI fix-and-save loop).
 */
export function buildBulkUsersWithInvalidDomainAm028(
  systemOwnerEmail: string,
  count = 5,
  position = 'QA',
): { uploadRows: BulkUserRow[]; fixedRows: BulkUserRow[]; startingNumber: number; endingNumber: number } {
  const { lastUserNumber } = readUserCounter();
  const { firstName, firstNameToken, lastNameBase, domain } =
    parseSystemOwnerEmailForBulkPattern(systemOwnerEmail);

  const uploadRows: BulkUserRow[] = [];
  const fixedRows: BulkUserRow[] = [];

  for (let i = 1; i <= count; i += 1) {
    const n = lastUserNumber + i;
    const lastName = `${titleCase(lastNameBase)}${n}`;
    uploadRows.push({
      firstName,
      lastName,
      email: `${firstNameToken}.${lastNameBase}+${n}@invalid.com`,
      position,
    });
    fixedRows.push({
      firstName,
      lastName,
      email: `${firstNameToken}.${lastNameBase}+${n}@${domain}`,
      position,
    });
  }

  writeUserCounter({ lastUserNumber: lastUserNumber + count });
  return {
    uploadRows,
    fixedRows,
    startingNumber: lastUserNumber + 1,
    endingNumber: lastUserNumber + count,
  };
}

/**
 * Rewrites the downloaded bulk-import template with header + provided rows.
 * Row data starts from the first data row (dummy template rows are replaced).
 */
export function writeBulkUsersToTemplateXlsx(
  downloadedTemplatePath: string,
  rows: ReadonlyArray<BulkUserRow>,
  outputPath: string,
): string {
  const workbook = XLSX.readFile(downloadedTemplatePath);
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    throw new Error('Downloaded template has no worksheet.');
  }

  const sheet = workbook.Sheets[firstSheet];
  const existing = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, blankrows: false });
  const firstRow = existing[0] ?? [];
  const hasHeader =
    firstRow.some((v) => /first\s*name/i.test(String(v))) &&
    firstRow.some((v) => /last\s*name/i.test(String(v))) &&
    firstRow.some((v) => /email/i.test(String(v)));

  const header = hasHeader ? firstRow : ['First Name', 'Last Name', 'Email', 'Position'];
  const nextData = [header, ...rows.map((row) => [row.firstName, row.lastName, row.email, row.position])];

  workbook.Sheets[firstSheet] = XLSX.utils.aoa_to_sheet(nextData);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  XLSX.writeFile(workbook, outputPath);
  return outputPath;
}
