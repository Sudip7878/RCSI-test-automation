import salesAndBilling from '../../data/csi/salesAndBilling.json';
import { csiTestEmail } from './credentials';
import { csiUniqueTimestampSuffix } from './salesAndBillingTestData';
import type { Sb030AddClientFormData } from './sb030ClientTestData';
import { sb030AddClientFormSteps } from './sb030ClientTestData';

/** SB-031: duplicate owner email error on Submit (`CSI_TEST_EMAIL`; default dax.manning@appnovation.com). */
export const SB031_DUPLICATE_CLIENT_EMAIL_ERROR = 'Owner already exist';

const SB031_CLIENT_NAME_PREFIX = 'Client-';

/** SB-031: unique client name so only the owner email triggers the duplicate rejection. */
export function csiUniqueClientNameForSb031(): string {
  return `${SB031_CLIENT_NAME_PREFIX}${csiUniqueTimestampSuffix()}`;
}

export function buildSb031AddClientFormData(): Sb030AddClientFormData {
  const defaults = salesAndBilling.sb030ClientDefaults;
  return {
    clientName: csiUniqueClientNameForSb031(),
    organizationType: defaults.organizationType,
    ownerFirstName: defaults.ownerFirstName,
    ownerLastName: defaults.ownerLastName,
    ownerEmail: csiTestEmail(),
  };
}

/** Ordered Add Client wizard steps for SB-031 (same form sequence as SB-030). */
export function sb031AddClientFormSteps(data: Sb030AddClientFormData) {
  return sb030AddClientFormSteps(data);
}
