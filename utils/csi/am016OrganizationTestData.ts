/** AM-016: owner email validation message on Create organization submit. */
export const AM016_OWNER_EMAIL_VALIDATION_MESSAGE = 'Enter a valid email.' as const;

/** AM-016: remove `@` from the AM-010 owner email to produce an invalid format. */
export function buildInvalidFormatOwnerEmailAm016(ownerEmail: string): string {
  return ownerEmail.replace('@', '');
}
