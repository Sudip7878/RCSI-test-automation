import { test } from '../../../fixtures/csi/testSetup';
import { csiOrgTestEmail, csiOrgTestPassword } from '../../../utils/csi/credentials';
import {
  csiAccountManagementEmailLocalPart,
  csiAccountManagementFirstName,
  csiAccountManagementLastName,
} from '../../../utils/csi/accountManagementTestData';

test.describe('CSI · Account Management', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ csiLoginPage }) => {
    if (
      !process.env.CSI_ORG_TEST_PASSWORD?.length ||
      !process.env.CSI_ORG_TEST_EMAIL?.trim()?.length
    ) {
      test.skip();
      return;
    }

    const email = csiOrgTestEmail();
    const password = csiOrgTestPassword();

    await csiLoginPage.gotoLogin();
    await csiLoginPage.signInWithEmailAndPassword(email, password);
    await csiLoginPage.expectOnHome();
  });

  test('System Owner manually adds user under org domain', async ({
    csiAccountManagementPage,
  }) => {
    const firstName = csiAccountManagementFirstName();
    const lastName = csiAccountManagementLastName();
    const emailLocal = csiAccountManagementEmailLocalPart(firstName, lastName);

    await csiAccountManagementPage.openUserList();
    await csiAccountManagementPage.startAddUserManually();
    await csiAccountManagementPage.fillNewUserIdentity({
      firstName,
      lastName,
      emailLocalPart: emailLocal,
    });
    await csiAccountManagementPage.checkFirstTwoRoleAssignments();
    await csiAccountManagementPage.submitCreateNewUser();
    await csiAccountManagementPage.expectUserCreatedSuccess();
  });
});
