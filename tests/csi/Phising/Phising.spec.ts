import { test } from '../../../fixtures/csi/testSetup';
import {
  csiPhisingAdminTestEmail,
  csiPhisingAdminTestPassword,
  csiTestEmail,
  csiTestPassword,
} from '../../../utils/csi/credentials';
import {
  CSI_PH024_LANDING_PAGE_HOST,
  csiPh024UniqueSuffix,
  csiPhisingUserSearchToken,
  csiUniquePhisingTestName,
} from '../../../utils/csi/phisingTestData';

test.describe('CSI · Phising', () => {
  test.describe.configure({ timeout: 180_000 });

  /** PH-020: phishing admin. Kept separate from PH-024 so CSI_TEST login is not preceded by an admin session. */
  test.describe('Phishing admin', () => {
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
      test('PH-001', async ({ csiPhisingPage }) => {
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

    test.describe('PH-020 phishing dashboard view', () => {
      test('PH-020', async ({ csiPhisingPage }) => {
        await csiPhisingPage.openPhishingDashboard();
        await csiPhisingPage.expectPh020PhishingDashboardSectionsVisible();
      });
    });
  });

  test.describe('PH-024 email template creation', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (!process.env.CSI_TEST_PASSWORD?.length) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
      await csiLoginPage.expectOnHome();
    });

    test('PH-024', async ({ csiPhisingPage }) => {
      const suffix = csiPh024UniqueSuffix();
      await csiPhisingPage.createAndPublishPh024EmailTemplate({
        uniqueSuffix: suffix,
        landingPageHost: CSI_PH024_LANDING_PAGE_HOST,
      });
    });
  });
});
