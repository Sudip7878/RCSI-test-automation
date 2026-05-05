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
