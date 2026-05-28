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
 * Role changes require CSI_TEST_* on `/userList`. Subject sessions cannot open Change Role.
 */
export async function ensureAm033AdminSessionForCleanup(
  loginPage: CsiAvotechLoginPage,
  accountPage: CsiAccountManagementPage,
  options: { adminEmail: string; adminPassword: string },
): Promise<void> {
  const { adminEmail, adminPassword } = options;

  if (await loginPage.page.getByText(/^Hi,\s/i).isVisible({ timeout: 3_000 }).catch(() => false)) {
    await loginPage.gotoHomeAndLogoutForAm033();
  } else {
    await loginPage.gotoLogin();
  }
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
