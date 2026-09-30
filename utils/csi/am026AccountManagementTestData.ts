import { csiAccountManagementEmailLocalPart } from './accountManagementTestData';

/** AM-026: external domain appended to the email local part on manual add user. */
export const AM026_EXTERNAL_EMAIL_DOMAIN = '@external.com' as const;

/** AM-026: validation message after Create New User with an out-of-org-domain email. */
export const AM026_INVALID_EMAIL_MESSAGE = 'Invalid email' as const;

/** AM-026: local part (AM-019 format) plus `@external.com`. */
export function buildExternalDomainUserEmailAm026(firstName: string, lastName: string): string {
  const localPart = csiAccountManagementEmailLocalPart(firstName, lastName);
  return `${localPart}${AM026_EXTERNAL_EMAIL_DOMAIN}`;
}
