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
