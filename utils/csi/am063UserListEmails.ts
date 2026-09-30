import fs from 'node:fs';
import path from 'node:path';

import { expect } from '@playwright/test';

const AM063_CACHE_DIR = path.resolve(__dirname, '../../playwright/.cache/account-management');

export type Am063OrgKey = 'orgA' | 'orgB';

function snapshotPath(org: Am063OrgKey): string {
  const file = org === 'orgA' ? 'am063-org-a-user-emails.json' : 'am063-org-b-user-emails.json';
  return path.join(AM063_CACHE_DIR, file);
}

export function writeAm063UserEmailsSnapshot(org: Am063OrgKey, emails: ReadonlyArray<string>): string {
  fs.mkdirSync(AM063_CACHE_DIR, { recursive: true });
  const target = snapshotPath(org);
  const payload = {
    capturedAt: new Date().toISOString(),
    emails: [...emails].sort(),
  };
  fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return target;
}

export function readAm063UserEmailsSnapshot(org: Am063OrgKey): string[] {
  const raw = fs.readFileSync(snapshotPath(org), 'utf8');
  const parsed = JSON.parse(raw) as { emails?: string[] };
  if (!Array.isArray(parsed.emails)) {
    throw new Error(`Invalid AM-063 snapshot for ${org}`);
  }
  return parsed.emails;
}

/** AM-063: Org A and Org B user-list email sets must not intersect. */
export function expectNoEmailIntersection(orgAEmails: ReadonlyArray<string>, orgBEmails: ReadonlyArray<string>) {
  const normalizedB = new Set(orgBEmails.map((e) => e.trim().toLowerCase()));
  const overlap = orgAEmails.filter((e) => normalizedB.has(e.trim().toLowerCase()));
  expect(
    overlap,
    overlap.length > 0
      ? `Org A and Org B shared user emails: ${overlap.join(', ')}`
      : 'Org A and Org B must not share user-list emails',
  ).toEqual([]);
}
