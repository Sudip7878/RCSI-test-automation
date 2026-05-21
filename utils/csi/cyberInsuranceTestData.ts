import { utcDateBasedNumber } from '../dateUtils';

/** CI-001: `Description` + UTC numeric suffix. */
export function csiCyberInsuranceBusinessDescription(uniqueNumeric = utcDateBasedNumber()): string {
  return `Description ${uniqueNumeric}`;
}

/** CI-001: `Address` + UTC numeric suffix (same run as description when passed through). */
export function csiCyberInsuranceAddress(uniqueNumeric = utcDateBasedNumber()): string {
  return `Address ${uniqueNumeric}`;
}
