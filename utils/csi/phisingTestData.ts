import { utcDateBasedNumber } from '../dateUtils';

/** Email local-part segment before the first `.` (individual search field). */
export function csiPhisingUserSearchToken(email: string): string {
  const localPart = email.split('@')[0] ?? '';
  const beforeDot = localPart.split('.')[0] ?? localPart;
  return beforeDot.trim();
}

/** Full local part before `@` — PH-011 alias targets (e.g. dax.manning+134). */
export function csiPhisingUserSearchTokenFullLocal(email: string): string {
  return (email.split('@')[0] ?? '').trim();
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

/** PH-011: schedule time = current clock + this offset (recorded-steps/Phising/PH-011.txt). */
export const PH011_SCHEDULE_TIME_OFFSET_MS = 2 * 60 * 1_000;

/** PH-011: `input[type="time"]` value — e.g. 09:23 now → 09:25 (24-hour HH:mm). */
export function csiPh011ScheduleTimeHHmm(now = new Date()): string {
  const scheduled = new Date(now.getTime() + PH011_SCHEDULE_TIME_OFFSET_MS);
  const hours = String(scheduled.getHours()).padStart(2, '0');
  const minutes = String(scheduled.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** PH-011: Test Duration dropdown option (UI label is “1 day”, data-value `1`). */
export const PH011_TEST_DURATION_OPTION_NAME = '1 day' as const;

/** PH-011: poll interval while waiting for ignored-mail engagement stats (recorded-steps/Phising/PH-011.txt). */
export const PH011_ENGAGEMENT_POLL_INTERVAL_MS = 5 * 60 * 1_000;

/** PH-011: total wait before pass when opened/clicked/submitted remain 0%. */
export const PH011_ENGAGEMENT_POLL_TIMEOUT_MS = 20 * 60 * 1_000;

export const PH011_ZERO_ENGAGEMENT_STAT_LABELS = [
  'Email opened',
  'Link clicked',
  'Data submitted',
] as const;
