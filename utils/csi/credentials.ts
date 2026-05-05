import auth from '../../data/csi/auth.json';

// Test password must never be committed; set CSI_TEST_PASSWORD in .env.
export function csiTestPassword(): string {
  const p = process.env.CSI_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

export function csiTestEmail(): string {
  return process.env.CSI_TEST_EMAIL?.trim() || auth.validUser.email;
}

/** `CSI_ORG_TEST_EMAIL` — org admin used for Account Management (e.g. user list). */
export function csiOrgTestEmail(): string {
  const e = process.env.CSI_ORG_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_ORG_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** `CSI_ORG_TEST_PASSWORD` — paired with {@link csiOrgTestEmail}. */
export function csiOrgTestPassword(): string {
  const p = process.env.CSI_ORG_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_ORG_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}
