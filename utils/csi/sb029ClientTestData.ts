import salesAndBilling from '../../data/csi/salesAndBilling.json';
import { csiTestEmail } from './credentials';
import { csiUniqueTimestampSuffix } from './salesAndBillingTestData';
import { readLastUserNumber, writeLastUserNumber } from './userCounter';
import type { Sb030AddClientFormData } from './sb030ClientTestData';
import { sb030AddClientFormSteps } from './sb030ClientTestData';

const SB029_CLIENT_NAME_PREFIX = 'Test Client ';

/** SB-029: unique client name in the form `Test Client {timestamp}-{worker}`. */
export function csiUniqueClientNameForSb029(): string {
  return `${SB029_CLIENT_NAME_PREFIX}${csiUniqueTimestampSuffix()}`;
}

/**
 * SB-029: derive the owner email from `CSI_TEST_EMAIL` by inserting `+{n+1}` before `@`,
 * then persist the incremented counter to `storage/userCounter.json`.
 *
 * e.g. CSI_TEST_EMAIL=dax.manning@appnovation.com, lastUserNumber=135
 *   → writes lastUserNumber=136, returns "dax.manning+136@appnovation.com"
 */
export function nextOwnerEmailForSb029(): string {
  const base = csiTestEmail();
  const atIndex = base.indexOf('@');
  if (atIndex === -1) {
    throw new Error(`CSI_TEST_EMAIL "${base}" does not contain '@'.`);
  }

  const lastUserNumber = readLastUserNumber();
  const nextNumber = lastUserNumber + 1;
  writeLastUserNumber(nextNumber);

  return `${base.slice(0, atIndex)}+${nextNumber}${base.slice(atIndex)}`;
}

export function buildSb029AddClientFormData(): Sb030AddClientFormData {
  const defaults = salesAndBilling.sb030ClientDefaults;
  return {
    clientName: csiUniqueClientNameForSb029(),
    organizationType: defaults.organizationType,
    ownerFirstName: defaults.ownerFirstName,
    ownerLastName: defaults.ownerLastName,
    ownerEmail: nextOwnerEmailForSb029(),
  };
}

/** Ordered Add Client wizard steps for SB-029 (same form sequence as SB-030). */
export function sb029AddClientFormSteps(data: Sb030AddClientFormData) {
  return sb030AddClientFormSteps(data);
}
