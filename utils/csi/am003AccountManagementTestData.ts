/** AM-003: signup rejects malformed email values on the first step. */
export const AM003_INVALID_SIGNUP_EMAILS = ['user@', '@domain.com', 'plaintext'] as const;

export const AM003_INVALID_EMAIL_MESSAGE = 'Enter a valid email.' as const;

export const AM003_REQUIRED_EMAIL_MESSAGE = 'This field is required.' as const;
