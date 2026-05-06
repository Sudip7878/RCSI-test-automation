import { utcDateBasedNumber } from '../dateUtils';

/** IR-005: `Test Incident ` + UTC numeric suffix (see recorded steps). */
export function csiIncidentDescription(uniqueNumeric = utcDateBasedNumber()): string {
  return `Test Incident ${uniqueNumeric}`;
}

export function csiIncidentAffectedSystems(): string {
  return 'QA Environment';
}
