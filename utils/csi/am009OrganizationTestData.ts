import { readLastUserNumber } from './userCounter';

export const AM009_ORG_CATEGORY = 'Accounting' as const;
export const AM009_ORG_SIZE = '-4' as const;
export const AM009_ORG_PLAN = 'CyberGO FREE (Yearly)' as const;
export const AM009_PHONE_NUMBER = '1234567890';

export type Am009OrganizationProfile = {
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

function titleCaseWord(segment: string): string {
  const trimmed = segment.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/** AM-009: first/last from `CSI_TEST_EMAIL` local part before `@`, split on `.` */
export function parseOwnerNameFromCsiTestEmail(email: string): {
  firstName: string;
  lastNameBase: string;
  emailLocalBase: string;
  emailDomain: string;
} {
  const trimmed = email.trim();
  const at = trimmed.indexOf('@');
  if (at < 0) {
    throw new Error(`CSI_TEST_EMAIL must contain @ for AM-009: ${email}`);
  }

  let local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const plus = local.indexOf('+');
  if (plus >= 0) {
    local = local.slice(0, plus);
  }

  const dot = local.indexOf('.');
  if (dot < 0) {
    throw new Error(`CSI_TEST_EMAIL local part must use '.' between first and last name for AM-009: ${email}`);
  }

  const firstRaw = local.slice(0, dot);
  const lastRaw = local.slice(dot + 1);
  if (!firstRaw.length || !lastRaw.length) {
    throw new Error(`CSI_TEST_EMAIL local part must have non-empty first and last segments for AM-009: ${email}`);
  }

  return {
    firstName: titleCaseWord(firstRaw),
    lastNameBase: titleCaseWord(lastRaw),
    emailLocalBase: local,
    emailDomain: domain,
  };
}

export const AM021_ORG_NAME = 'Avotech' as const;
export const AM021_ORG_SEARCH_TERM = 'avotech' as const;
/** Domain appended by the application when a user is created under the Avotech org. */
export const AM021_ORG_EMAIL_DOMAIN = 'avotech.com' as const;

export type Am021UserProfile = {
  suffix: number;
  firstName: string;
  lastName: string;
  /** Local part only — filled in the Email* field; app appends the org domain automatically. */
  emailLocalPart: string;
  /** Full email with `@avotech.com` — used to verify the user appears in the org manager's user list. */
  avotechEmail: string;
};

/**
 * AM-021: super admin creates a user under the Avotech org.
 * Uses the same first/last naming convention as AM-009 (CSI_TEST_EMAIL + lastUserNumber + 1).
 */
export function buildAm021UserProfile(csiTestEmail: string): Am021UserProfile {
  const suffix = readLastUserNumber() + 1;
  const { firstName, lastNameBase, emailLocalBase } = parseOwnerNameFromCsiTestEmail(csiTestEmail);
  const lastName = `${lastNameBase}${suffix}`;
  const emailLocalPart = `${emailLocalBase}+${suffix}`;

  return {
    suffix,
    firstName,
    lastName,
    emailLocalPart,
    avotechEmail: `${emailLocalPart}@${AM021_ORG_EMAIL_DOMAIN}`,
  };
}

/** Suffix = `lastUserNumber + 1` from `storage/userCounter.json` (AM-009). */
export function buildAm009OrganizationProfile(csiTestEmail: string): Am009OrganizationProfile {
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
    organizationName: `Test Org ${suffix}`,
    category: AM009_ORG_CATEGORY,
    size: AM009_ORG_SIZE,
    plan: AM009_ORG_PLAN,
  };
}
