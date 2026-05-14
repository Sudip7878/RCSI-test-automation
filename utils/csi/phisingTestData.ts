import { utcDateBasedNumber } from '../dateUtils';

/** Email local-part segment before the first `.` (individual search field). */
export function csiPhisingUserSearchToken(email: string): string {
  const localPart = email.split('@')[0] ?? '';
  const beforeDot = localPart.split('.')[0] ?? localPart;
  return beforeDot.trim();
}

/** `TestPhising_<utcDateBasedNumber>_<worker>`. */
export function csiUniquePhisingTestName(prefix = 'TestPhising_'): string {
  const worker = process.env.TEST_WORKER_INDEX ?? '0';
  return `${prefix}${utcDateBasedNumber()}_${worker}`;
}

/** PH-024: suffix for display name, subject, sender, etc. (`YYYYMMDDHHmmss` + worker). */
export function csiPh024UniqueSuffix(): string {
  const worker = process.env.TEST_WORKER_INDEX ?? '0';
  return `${utcDateBasedNumber()}_${worker}`;
}

/** Landing page URL host for PH-024 (recorded static test value). */
export const CSI_PH024_LANDING_PAGE_HOST = 'example.com' as const;
