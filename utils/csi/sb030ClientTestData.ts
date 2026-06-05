import salesAndBilling from '../../data/csi/salesAndBilling.json';

const SB030_DEFAULT_EXISTING_CLIENT_NAME = 'TestCorp';

/** SB-030: duplicate client name error on Submit (`CSI_EXISTING_CLIENT_NAME`; default TestCorp). */
export const SB030_DUPLICATE_CLIENT_NAME_ERROR = 'Client name already exist';

/** SB-030: wait on Client List before Add Client (page/dropdowns settle). */
export const SB030_CLIENT_LIST_SETTLE_MS = 5_000;

/** SB-030: wait after Client Name before Organization Type / Size dropdowns load. */
export const SB030_CLIENT_NAME_DROPDOWN_SETTLE_MS = 5_000;

export function csiExistingClientNameForSb030(): string {
  const raw = process.env.CSI_EXISTING_CLIENT_NAME?.trim();
  if (raw != null && raw.length > 0) {
    return raw;
  }
  return SB030_DEFAULT_EXISTING_CLIENT_NAME;
}

export type Sb030AddClientTextFieldStep = {
  type: 'textbox';
  name: string;
  value: string;
};

export type Sb030AddClientVirtualSelectStep = {
  type: 'virtualSelect';
  triggerText: string;
  optionName: string;
};

export type Sb030AddClientOrganizationSizeStep = {
  type: 'organizationSizeFirst';
};

export type Sb030AddClientFormStep =
  | Sb030AddClientTextFieldStep
  | Sb030AddClientVirtualSelectStep
  | Sb030AddClientOrganizationSizeStep;

export type Sb030AddClientFormData = {
  clientName: string;
  organizationType: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
};

export function buildSb030AddClientFormData(): Sb030AddClientFormData {
  const defaults = salesAndBilling.sb030ClientDefaults;
  return {
    clientName: csiExistingClientNameForSb030(),
    organizationType: defaults.organizationType,
    ownerFirstName: defaults.ownerFirstName,
    ownerLastName: defaults.ownerLastName,
    ownerEmail: defaults.ownerEmail,
  };
}

/** Ordered Add Client wizard steps for SB-030 (iterate in POM; no hardcoded field sequence in spec). */
export function sb030AddClientFormSteps(data: Sb030AddClientFormData): Sb030AddClientFormStep[] {
  return [
    { type: 'textbox', name: 'Client Name*', value: data.clientName },
    {
      type: 'virtualSelect',
      triggerText: 'Select Organization Type',
      optionName: data.organizationType,
    },
    { type: 'organizationSizeFirst' },
    { type: 'textbox', name: 'Owner First Name*', value: data.ownerFirstName },
    { type: 'textbox', name: 'Owner Last Name*', value: data.ownerLastName },
    { type: 'textbox', name: 'Owner Email*', value: data.ownerEmail },
  ];
}
