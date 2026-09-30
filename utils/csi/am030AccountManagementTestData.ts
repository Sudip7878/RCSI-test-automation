/** AM-030: manual add user rejects an email that already exists in the org. */
export const AM030_MANUAL_DUPLICATE_EMAIL_MESSAGE = 'Email already exist' as const;

/** AM-030: bulk upload duplicate review — no rows are eligible for import. */
export const AM030_BULK_NO_USER_IMPORTED_MESSAGE = 'No user record can be imported.' as const;

/** AM-030: bulk upload duplicate review — summary banner above problematic rows. */
export const AM030_BULK_USERS_ALREADY_EXIST_MESSAGE =
  'User(s) already exist within the system' as const;

/** AM-030: per-row status tag on the "Fix problematic user data" review step. */
export const AM030_BULK_ROW_DUPLICATE_TAG = 'User already exist' as const;

/** Local part of the login email for the manual add form (domain is auto-filled by the app). */
export function loginEmailLocalPartAm030(loginEmail: string): string {
  const [localPart] = loginEmail.trim().split('@');
  if (!localPart) {
    throw new Error(`Login email is invalid for AM-030: ${loginEmail}`);
  }
  return localPart;
}
