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

/** PH-014: wait before clicking Completed tab (recorded-steps/Phising/PH-014.txt). */
export const PH014_TAB_BEFORE_CLICK_MS = 3_000;

/** PH-014: wait after Completed tab click for course cards to settle. */
export const PH014_COMPLETED_TAB_SETTLE_MS = 5_000;
