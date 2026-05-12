import { utcDateBasedNumber } from '../dateUtils';

/**
 * Search token is the local-part prefix before the first dot.
 * Example: `dax.manning+10@appnovation.com` -> `dax`.
 */
export function csiPhisingUserSearchToken(email: string): string {
  const localPart = email.split('@')[0] ?? '';
  const beforeDot = localPart.split('.')[0] ?? localPart;
  return beforeDot.trim();
}

/** Unique name format requested in PH-001: `TestPhising_<date-based-number>`. */
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
