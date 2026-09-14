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

/** `CSI_ORG_USER_TEST_EMAIL` — org-scoped user for AM-050 (deactivate / inactive login / reactivate). */
export function csiOrgUserTestEmail(): string {
  const e = process.env.CSI_ORG_USER_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_ORG_USER_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** `CSI_ORG_USER_TEST_PASSWORD` — paired with {@link csiOrgUserTestEmail}. */
export function csiOrgUserTestPassword(): string {
  const p = process.env.CSI_ORG_USER_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_ORG_USER_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

/** `CSI_PHISING_ADMIN_TEST_EMAIL` — admin used for Phising test creation. */
export function csiPhisingAdminTestEmail(): string {
  const e = process.env.CSI_PHISING_ADMIN_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_PHISING_ADMIN_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** `CSI_PHISING_ADMIN_TEST_PASSWORD` — paired with {@link csiPhisingAdminTestEmail}. */
export function csiPhisingAdminTestPassword(): string {
  const p = process.env.CSI_PHISING_ADMIN_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_PHISING_ADMIN_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

export function csiIncidentReporterTestEmail(): string {
  const e = process.env.CSI_INCIDENT_REPORTER_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_INCIDENT_REPORTER_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

export function csiIncidentReporterTestPassword(): string {
  const p = process.env.CSI_INCIDENT_REPORTER_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_INCIDENT_REPORTER_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

/** `CSI_SYSTEM_OWNER_TEST_EMAIL` — used to assign roles on user list (IR-001). */
export function csiSystemOwnerTestEmail(): string {
  const e = process.env.CSI_SYSTEM_OWNER_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_SYSTEM_OWNER_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** `CSI_SYSTEM_OWNER_TEST_PASSWORD` — paired with {@link csiSystemOwnerTestEmail}. */
export function csiSystemOwnerTestPassword(): string {
  const p = process.env.CSI_SYSTEM_OWNER_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_SYSTEM_OWNER_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

/** SR-005: Attack Surface admin (Request New Report). */
export function csiSecurityReportAdminTestEmail(): string {
  const e = process.env.CSI_SECURITY_REPORT_ADMIN_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_SECURITY_REPORT_ADMIN_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiSecurityReportAdminTestEmail}. */
export function csiSecurityReportAdminTestPassword(): string {
  const p = process.env.CSI_SECURITY_REPORT_ADMIN_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_SECURITY_REPORT_ADMIN_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

/** SB-056: restricted hub user (Training / Phishing / Account Management only). */
export function csiTrainingPhisingSysOwnerTestEmail(): string {
  const e = process.env.CSI_TRAINING_PHISING_SYS_OWNER_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_TRAINING_PHISING_SYS_OWNER_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiTrainingPhisingSysOwnerTestEmail}. */
export function csiTrainingPhisingSysOwnerTestPassword(): string {
  const p = process.env.CSI_TRAINING_PHISING_SYS_OWNER_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_TRAINING_PHISING_SYS_OWNER_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

/** PT-001: penetration tester who submits a new pen test request. */
export function csiPenetrationTesterTestEmail(): string {
  const e = process.env.CSI_PENETRATION_TESTER_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_PENETRATION_TESTER_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiPenetrationTesterTestEmail}. */
export function csiPenetrationTesterTestPassword(): string {
  const p = process.env.CSI_PENETRATION_TESTER_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_PENETRATION_TESTER_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

/** CI-009: regular user without Cyber Insurance module access. */
export function csiUserTestEmail(): string {
  const e = process.env.CSI_USER_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_USER_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiUserTestEmail}. */
export function csiUserTestPassword(): string {
  const p = process.env.CSI_USER_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_USER_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}
