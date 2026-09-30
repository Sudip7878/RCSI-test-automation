/**
 * AM-029: bulk upload with wrong file formats (empty template, then corrupted header).
 * Both attempts must fail validation before the "Fix problematic user data" step is ever
 * reached, so this message is the only success criterion for the test.
 */
export const AM029_MISSING_FIELDS_MESSAGE =
  'Some fields are missing, please review and reupload the file.' as const;

/** AM-029: value written into the header row's first cell to invalidate the template. */
export const AM029_INVALID_HEADER_VALUE = 'Invalid Header' as const;
