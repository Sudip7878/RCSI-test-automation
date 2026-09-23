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

/** CC-022: system owner without Policy Management until sales order is updated (`CSI_NO_POLICY_SYSTEM_OWNER_TEST_*`). */
export function csiNoPolicySystemOwnerTestEmail(): string {
  const e = process.env.CSI_NO_POLICY_SYSTEM_OWNER_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_NO_POLICY_SYSTEM_OWNER_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiNoPolicySystemOwnerTestEmail}. */
export function csiNoPolicySystemOwnerTestPassword(): string {
  const p = process.env.CSI_NO_POLICY_SYSTEM_OWNER_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_NO_POLICY_SYSTEM_OWNER_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
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

/** AM-033: subject user for role/module access checks (`CSI_USER_TEST_*`). */
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

/** TR-010: user with passed course(s) on My Course (`CSI_TEST_PASSING_USER_TEST_*`). */
export function csiTestPassingUserTestEmail(): string {
  const e = process.env.CSI_TEST_PASSING_USER_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_TEST_PASSING_USER_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiTestPassingUserTestEmail}. */
export function csiTestPassingUserTestPassword(): string {
  const p = process.env.CSI_TEST_PASSING_USER_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_TEST_PASSING_USER_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

/** TR-022: org user with auto-enrolled courses on My Course (`CSI_AUTO_ENROLL_ORG_USER_TEST_*`). */
export function csiAutoEnrollOrgUserTestEmail(): string {
  const e = process.env.CSI_AUTO_ENROLL_ORG_USER_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_AUTO_ENROLL_ORG_USER_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiAutoEnrollOrgUserTestEmail}. */
export function csiAutoEnrollOrgUserTestPassword(): string {
  const p = process.env.CSI_AUTO_ENROLL_ORG_USER_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_AUTO_ENROLL_ORG_USER_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

/** `CSI_TP_TRAINING_ADMIN_TEST_EMAIL` — Training admin for CC-001 (Training + Phishing package tenant). */
export function csiTpTrainingAdminTestEmail(): string {
  const e = process.env.CSI_TP_TRAINING_ADMIN_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_TP_TRAINING_ADMIN_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiTpTrainingAdminTestEmail}. */
export function csiTpTrainingAdminTestPassword(): string {
  const p = process.env.CSI_TP_TRAINING_ADMIN_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_TP_TRAINING_ADMIN_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

/** `CSI_TP_PHISING_ADMIN_TEST_EMAIL` — Phishing admin for CC-001 (Training + Phishing package tenant). */
export function csiTpPhisingAdminTestEmail(): string {
  const e = process.env.CSI_TP_PHISING_ADMIN_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_TP_PHISING_ADMIN_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiTpPhisingAdminTestEmail}. */
export function csiTpPhisingAdminTestPassword(): string {
  const p = process.env.CSI_TP_PHISING_ADMIN_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_TP_PHISING_ADMIN_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

/** `CSI_TRAINING_ADMIN_TEST_EMAIL` — Training admin (TR-001 course distribution). */
export function csiTrainingAdminTestEmail(): string {
  const e = process.env.CSI_TRAINING_ADMIN_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_TRAINING_ADMIN_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiTrainingAdminTestEmail}. */
export function csiTrainingAdminTestPassword(): string {
  const p = process.env.CSI_TRAINING_ADMIN_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_TRAINING_ADMIN_TEST_PASSWORD in the environment (see .env.example).');
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

/** `CSI_PHISHING_ADMIN_TEST_EMAIL` — Phishing admin for CC-010 (recorded-steps/CrossCutting/CC-010.txt). */
export function csiPhishingAdminTestEmail(): string {
  const e = process.env.CSI_PHISHING_ADMIN_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_PHISHING_ADMIN_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiPhishingAdminTestEmail}. */
export function csiPhishingAdminTestPassword(): string {
  const p = process.env.CSI_PHISHING_ADMIN_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_PHISHING_ADMIN_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

/** PH-014: phishing victim with completed course on `/phishingCourse` (`CSI_PHISING_VICTIM_TEST_*`). */
export function csiPhisingVictimTestEmail(): string {
  const e = process.env.CSI_PHISING_VICTIM_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_PHISING_VICTIM_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiPhisingVictimTestEmail}. */
export function csiPhisingVictimTestPassword(): string {
  const p = process.env.CSI_PHISING_VICTIM_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_PHISING_VICTIM_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

/** PH-011: user who must not engage with phishing email (`CSI_PHISING_NON_VICTIM_TEST_*`). */
export function csiPhisingNonVictimTestEmail(): string {
  const e = process.env.CSI_PHISING_NON_VICTIM_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_PHISING_NON_VICTIM_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiPhisingNonVictimTestEmail}. */
export function csiPhisingNonVictimTestPassword(): string {
  const p = process.env.CSI_PHISING_NON_VICTIM_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_PHISING_NON_VICTIM_TEST_PASSWORD in the environment (see .env.example).');
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

/** CC-023: expired sales system owner — module access revoked on hub. */
export function csiExpiredSalesSystemOwnerTestEmail(): string {
  const e = process.env.CSI_EXPIRED_SALES_SYSTEM_OWNER_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_EXPIRED_SALES_SYSTEM_OWNER_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiExpiredSalesSystemOwnerTestEmail}. */
export function csiExpiredSalesSystemOwnerTestPassword(): string {
  const p = process.env.CSI_EXPIRED_SALES_SYSTEM_OWNER_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_EXPIRED_SALES_SYSTEM_OWNER_TEST_PASSWORD in the environment (see .env.example).');
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

/** AM-063: Org A system owner (`CSI_ORG_A_SYSTEM_OWNER_TEST_*`). */
export function csiOrgASystemOwnerTestEmail(): string {
  const e = process.env.CSI_ORG_A_SYSTEM_OWNER_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_ORG_A_SYSTEM_OWNER_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiOrgASystemOwnerTestEmail}. */
export function csiOrgASystemOwnerTestPassword(): string {
  const p = process.env.CSI_ORG_A_SYSTEM_OWNER_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_ORG_A_SYSTEM_OWNER_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

/** AM-063: Org B system owner (`CSI_ORG_B_SYSTEM_OWNER_TEST_*`). */
export function csiOrgBSystemOwnerTestEmail(): string {
  const e = process.env.CSI_ORG_B_SYSTEM_OWNER_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_ORG_B_SYSTEM_OWNER_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiOrgBSystemOwnerTestEmail}. */
export function csiOrgBSystemOwnerTestPassword(): string {
  const p = process.env.CSI_ORG_B_SYSTEM_OWNER_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_ORG_B_SYSTEM_OWNER_TEST_PASSWORD in the environment (see .env.example).');
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

/** IR-019: Org A incident reporter (`CSI_ORG_A_INCIDNET_REPORTER_TEST_*` — env key spelling matches recorded steps). */
export function csiOrgAIncidentReporterTestEmail(): string {
  const e = process.env.CSI_ORG_A_INCIDNET_REPORTER_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_ORG_A_INCIDNET_REPORTER_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiOrgAIncidentReporterTestEmail}. */
export function csiOrgAIncidentReporterTestPassword(): string {
  const p = process.env.CSI_ORG_A_INCIDNET_REPORTER_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_ORG_A_INCIDNET_REPORTER_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

/** IR-019: Org B incident reporter (`CSI_ORG_B_INCIDNET_REPORTER_TEST_*`). */
export function csiOrgBIncidentReporterTestEmail(): string {
  const e = process.env.CSI_ORG_B_INCIDNET_REPORTER_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_ORG_B_INCIDNET_REPORTER_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiOrgBIncidentReporterTestEmail}. */
export function csiOrgBIncidentReporterTestPassword(): string {
  const p = process.env.CSI_ORG_B_INCIDNET_REPORTER_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_ORG_B_INCIDNET_REPORTER_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

/**
 * AM-054: user account that starts in Inactive state; the test reactivates it, verifies
 * login succeeds, then deactivates it again (`CSI_ORG_INACTIVE_USER_TEST_EMAIL`).
 * Keep Inactive when not running the test.
 */
export function csiOrgInactiveUserTestEmail(): string {
  const e = process.env.CSI_ORG_INACTIVE_USER_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_ORG_INACTIVE_USER_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiOrgInactiveUserTestEmail}. */
export function csiOrgInactiveUserTestPassword(): string {
  const p = process.env.CSI_ORG_INACTIVE_USER_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_ORG_INACTIVE_USER_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

/**
 * AM-041: display name of the group manager used when searching in the group creation form.
 * This is the name as it appears in the manager search dropdown (e.g. "Dax Manning12").
 */
export function csiGroupManagerName(): string {
  const n = process.env.CSI_GROUP_MANAGER_NAME?.trim();
  if (n == null || n.length === 0) {
    throw new Error('Set CSI_GROUP_MANAGER_NAME in the environment (see .env.example).');
  }
  return n;
}

/** AM-041: group manager email used for the second login to verify group visibility. */
export function csiGroupManagerEmail(): string {
  const e = process.env.CSI_GROUP_MANAGER_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_GROUP_MANAGER_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiGroupManagerEmail}. */
export function csiGroupManagerPassword(): string {
  const p = process.env.CSI_GROUP_MANAGER_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_GROUP_MANAGER_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

/** AM-041: email of the user to be added as a group member. */
export function csiGroupMemberEmail(): string {
  const e = process.env.CSI_GROUP_MEMBER_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_GROUP_MEMBER_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** AM-021: Avotech org manager who verifies the super-admin-created user appears in their user list (`CSI_AVOTECH_MANAGER_TEST_EMAIL`). */
export function csiAvotechManagerTestEmail(): string {
  const e = process.env.CSI_AVOTECH_MANAGER_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_AVOTECH_MANAGER_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiAvotechManagerTestEmail}. */
export function csiAvotechManagerTestPassword(): string {
  const p = process.env.CSI_AVOTECH_MANAGER_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_AVOTECH_MANAGER_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

/** AM-020: admin user who adds a user to any org (`CSI_ADMIN_TEST_EMAIL`). */
export function csiAdminTestEmail(): string {
  const e = process.env.CSI_ADMIN_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_ADMIN_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiAdminTestEmail}. */
export function csiAdminTestPassword(): string {
  const p = process.env.CSI_ADMIN_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_ADMIN_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

/**
 * AM-061: account used for the change-password test. The account alternates between two known
 * passwords (PASSWORD_1 / PASSWORD_2); the test tries PASSWORD_1 first and falls back to
 * PASSWORD_2 if the login is rejected, then changes to the other one.
 * Keep the account in a consistent state (either password is valid before running).
 */
export function csiOrgPasswordChangeUserTestEmail(): string {
  const e = process.env.CSI_ORG_PASSWORD_CHANGE_USER_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_ORG_PASSWORD_CHANGE_USER_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** AM-061: first of the two alternating passwords for the password-change test account. */
export function csiOrgPasswordChangeUserTestPassword1(): string {
  const p = process.env.CSI_ORG_PASSWORD_CHANGE_USER_TEST_PASSWORD_1;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_ORG_PASSWORD_CHANGE_USER_TEST_PASSWORD_1 in the environment (see .env.example).');
  }
  return p;
}

/** AM-061: second of the two alternating passwords for the password-change test account. */
export function csiOrgPasswordChangeUserTestPassword2(): string {
  const p = process.env.CSI_ORG_PASSWORD_CHANGE_USER_TEST_PASSWORD_2;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_ORG_PASSWORD_CHANGE_USER_TEST_PASSWORD_2 in the environment (see .env.example).');
  }
  return p;
}

/** SB-057: custom-themed org owner (`CSI_CUSTOM_ORG_OWNER_TEST_*`). */
export function csiCustomOrgOwnerTestEmail(): string {
  const e = process.env.CSI_CUSTOM_ORG_OWNER_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_CUSTOM_ORG_OWNER_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiCustomOrgOwnerTestEmail}. */
export function csiCustomOrgOwnerTestPassword(): string {
  const p = process.env.CSI_CUSTOM_ORG_OWNER_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_CUSTOM_ORG_OWNER_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

/** IR-017: Ricoh org owner whose Incident Response click redirects to Blackpanda (external domain, no phone field). */
export function csiRicohOrgOwnerTestEmail(): string {
  const e = process.env.CSI_RICOH_ORG_OWNER_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_RICOH_ORG_OWNER_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiRicohOrgOwnerTestEmail}. */
export function csiRicohOrgOwnerTestPassword(): string {
  const p = process.env.CSI_RICOH_ORG_OWNER_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_RICOH_ORG_OWNER_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}

/** `CSI_IT_ASSET_MANAGER_TEST_EMAIL` — IT Asset Manager role account for IA-015 and related tests. */
export function csiItAssetManagerTestEmail(): string {
  const e = process.env.CSI_IT_ASSET_MANAGER_TEST_EMAIL?.trim();
  if (e == null || e.length === 0) {
    throw new Error('Set CSI_IT_ASSET_MANAGER_TEST_EMAIL in the environment (see .env.example).');
  }
  return e;
}

/** Paired with {@link csiItAssetManagerTestEmail}. */
export function csiItAssetManagerTestPassword(): string {
  const p = process.env.CSI_IT_ASSET_MANAGER_TEST_PASSWORD;
  if (p == null || p.length === 0) {
    throw new Error('Set CSI_IT_ASSET_MANAGER_TEST_PASSWORD in the environment (see .env.example).');
  }
  return p;
}
