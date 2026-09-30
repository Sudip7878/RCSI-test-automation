import {
  AM009_ORG_CATEGORY,
  AM009_ORG_PLAN,
  AM009_ORG_SIZE,
  AM009_PHONE_NUMBER,
  parseOwnerNameFromCsiTestEmail,
} from './am009OrganizationTestData';
import { readLastUserNumber } from './userCounter';

const AM015_DEFAULT_EXISTING_ORGANIZATION_NAME = 'TestCorp';

/** AM-015: success notice after Create organization (duplicate org name is allowed). */
export const AM015_ORGANIZATION_CREATED_SUCCESS =
  'You have successfully added this organization.';

/** AM-015: wait after Organization name before Category / Size / Plan dropdowns settle. */
export const AM015_ORG_NAME_DROPDOWN_SETTLE_MS = 3_000;

export function csiExistingOrganizationNameForAm015(): string {
  const orgName = process.env.CSI_EXISTING_ORGANIZATION_NAME?.trim();
  if (orgName != null && orgName.length > 0) {
    return orgName;
  }

  const clientName = process.env.CSI_EXISTING_CLIENT_NAME?.trim();
  if (clientName != null && clientName.length > 0) {
    return clientName;
  }

  return AM015_DEFAULT_EXISTING_ORGANIZATION_NAME;
}

export type Am015OrganizationProfile = {
  suffix: number;
  firstName: string;
  lastName: string;
  ownerEmail: string;
  phoneNumber: string;
  organizationName: string;
  category: typeof AM009_ORG_CATEGORY;
  size: typeof AM009_ORG_SIZE;
  plan: typeof AM009_ORG_PLAN;
};

export type Am015OrganizationTextFieldStep = {
  type: 'textbox';
  name: string;
  value: string;
};

export type Am015OrganizationVirtualSelectStep = {
  type: 'virtualSelect';
  triggerText: string;
  optionName: string;
};

export type Am015OrganizationFormStep =
  | Am015OrganizationTextFieldStep
  | Am015OrganizationVirtualSelectStep;

/**
 * AM-015: same owner identity generation as AM-010 but uses a fixed existing organization name
 * (`TestCorp`); duplicate organization names are allowed and creation succeeds.
 */
export function buildAm015OrganizationProfile(csiTestEmail: string): Am015OrganizationProfile {
  const suffix = readLastUserNumber() + 1;
  const { firstName, lastNameBase, emailLocalBase, emailDomain } = parseOwnerNameFromCsiTestEmail(csiTestEmail);
  const lastName = `${lastNameBase}${suffix}`;
  const ownerEmail = `${emailLocalBase}+${suffix}@${emailDomain}`;

  return {
    suffix,
    firstName,
    lastName,
    ownerEmail,
    phoneNumber: AM009_PHONE_NUMBER,
    organizationName: csiExistingOrganizationNameForAm015(),
    category: AM009_ORG_CATEGORY,
    size: AM009_ORG_SIZE,
    plan: AM009_ORG_PLAN,
  };
}

/** Ordered Create organization wizard steps for AM-015 (iterate in POM). */
export function am015OrganizationFormSteps(profile: Am015OrganizationProfile): Am015OrganizationFormStep[] {
  return [
    { type: 'textbox', name: 'First name', value: profile.firstName },
    { type: 'textbox', name: 'Last name', value: profile.lastName },
    { type: 'textbox', name: 'Owner email', value: profile.ownerEmail },
    { type: 'textbox', name: 'Phone number', value: profile.phoneNumber },
    { type: 'textbox', name: 'Organization name', value: profile.organizationName },
    { type: 'virtualSelect', triggerText: 'Category', optionName: profile.category },
    { type: 'virtualSelect', triggerText: 'Size', optionName: profile.size },
    { type: 'virtualSelect', triggerText: 'Plan', optionName: profile.plan },
  ];
}
