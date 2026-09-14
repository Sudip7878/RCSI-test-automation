import type { CsiAccountManagementPage } from '../../pages/csi/AccountManagementPage';
import type { CsiAvotechLoginPage } from '../../pages/csi/AvotechLoginPage';

/** Which account session AM-033 has (updated after each login/logout in the spec). */
export type Am033LoggedInAs = 'subject' | 'admin' | 'none';

export type Am033SessionState = {
  loggedInAs: Am033LoggedInAs;
};

export type Am033FailureCleanupContext = {
  subjectEmail: string;
  session: Am033SessionState;
  adminEmail: string;
  adminPassword: string;
};

/**
 * Role changes require CSI_TEST_* (admin) on `/userList`; subject sessions cannot open Change Role.
 *
 * The page state at failure time is unknown: when the test fails while the subject is logged in
 * (e.g. on a permission-denied or partially-loaded module page), the "Hi," header may be absent
 * even though the subject session cookie is still active. Branching on header detection here would
 * skip the logout, leave the subject session active, and run the cleanup as the subject — who is
 * not allowed to change roles. To avoid that, always force the existing session to end first.
 *
 * gotoHomeAndLogoutForAm033 ends the session (with a cookie-clear fallback) and lands on the email
 * step, so the admin credentials below are always entered fresh rather than short-circuited by an
 * "already logged in" guard.
 */
export async function ensureAm033AdminSessionForCleanup(
  loginPage: CsiAvotechLoginPage,
  accountPage: CsiAccountManagementPage,
  options: { adminEmail: string; adminPassword: string },
): Promise<void> {
  const { adminEmail, adminPassword } = options;

  await loginPage.gotoHomeAndLogoutForAm033();

  await loginPage.signInWithEmailAndPassword(adminEmail, adminPassword);
  await loginPage.expectOnHome();
  await accountPage.openUserListWithSearchReady();
}

/**
 * AM-033 failure cleanup: force admin login, then clear all role checkboxes for the subject user.
 */
export async function cleanupAm033RoleAssignmentsOnFailure(
  loginPage: CsiAvotechLoginPage,
  accountPage: CsiAccountManagementPage,
  context: Am033FailureCleanupContext,
): Promise<void> {
  const { subjectEmail, session, adminEmail, adminPassword } = context;

  await ensureAm033AdminSessionForCleanup(loginPage, accountPage, { adminEmail, adminPassword });
  session.loggedInAs = 'admin';

  await accountPage.removeAllRoleAssignmentsFromUser(subjectEmail);
  session.loggedInAs = 'admin';
}
