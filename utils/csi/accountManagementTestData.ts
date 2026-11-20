const DEFAULT_FIRST_NAME = 'Test';

/** AM-036: user whose role assignments are updated and verified. */
export const AM036_TARGET_USER_EMAIL = 'dax.manning+217@avotech.com';

/** AM-036: roles to assign, verify in the user list, and remove during cleanup. */
export const AM036_ROLE_NAMES = ['Phishing admin', 'Training Admin'] as const;

export function csiAccountManagementFirstName(): string {
  return DEFAULT_FIRST_NAME;
}

/** `Name_${timestamp}_${worker}` so parallel workers do not collide. */
export function csiAccountManagementLastName(): string {
  const worker = process.env.TEST_WORKER_INDEX ?? '0';
  return `Name_${Date.now()}_${worker}`;
}

/** Local part only (`firstName`+`lastName`, lowercased); app supplies the domain. */
export function csiAccountManagementEmailLocalPart(firstName: string, lastName: string): string {
  return `${firstName}${lastName}`.replace(/\s+/g, '').toLowerCase();
}

/**
 * AM-041: generates a unique group title using a timestamp + worker index so parallel
 * runs do not collide. Format: `Test Group <timestamp>_<worker>`.
 */
export function csiGroupTitleAm041(): string {
  const worker = process.env.TEST_WORKER_INDEX ?? '0';
  return `Test Group ${Date.now()}_${worker}`;
}

/** AM-043 fallback group name when the group grid has no rows. */
export function csiDuplicateGroupFallbackTitleAm043(): string {
  const worker = process.env.TEST_WORKER_INDEX ?? '0';
  return `Duplicate Group ${Date.now()}_${worker}`;
}
