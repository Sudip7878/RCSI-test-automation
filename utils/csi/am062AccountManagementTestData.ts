/** AM-062: error shown when the current password field does not match the logged-in account. */
export const AM062_INVALID_PASSWORD_MESSAGE = 'Invalid password' as const;

/** AM-062: derive a wrong current password from the active one so it cannot match on submit. */
export function buildWrongCurrentPasswordAm062(currentPassword: string): string {
  return `${currentPassword}x`;
}
