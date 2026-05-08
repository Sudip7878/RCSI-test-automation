import { test } from '../../../fixtures/csi/testSetup';
import { csiPhisingAdminTestEmail, csiPhisingAdminTestPassword } from '../../../utils/csi/credentials';
import { csiPhisingUserSearchToken, csiUniquePhisingTestName } from '../../../utils/csi/phisingTestData';

test.describe('CSI · Phising', () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ csiLoginPage }) => {
    if (
      !process.env.CSI_PHISING_ADMIN_TEST_PASSWORD?.length ||
      !process.env.CSI_PHISING_ADMIN_TEST_EMAIL?.trim()?.length
    ) {
      test.skip();
      return;
    }

    const email = csiPhisingAdminTestEmail();
    const password = csiPhisingAdminTestPassword();

    await csiLoginPage.gotoLogin();
    await csiLoginPage.signInWithEmailAndPassword(email, password);
    await csiLoginPage.expectOnHome();
  });

  test.describe('Create a phishing test from template', () => {
    test('Create a phishing test from template', async ({ csiPhisingPage }) => {
      const loginEmail = csiPhisingAdminTestEmail();
      const searchToken = csiPhisingUserSearchToken(loginEmail);
      const testName = csiUniquePhisingTestName();

      await csiPhisingPage.openPhisingTestCreation();
      await csiPhisingPage.selectFirstAttackTemplateAndContinue();
      await csiPhisingPage.chooseIndividualsAndSelectLoginUser(loginEmail, searchToken);
      await csiPhisingPage.fillPhisingTestDetailsAndContinue(testName);
      await csiPhisingPage.finalizeAndDistribute();
      await csiPhisingPage.expectPhisingTestCreated(testName);
    });
  });
});
