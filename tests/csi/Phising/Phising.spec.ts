import { test } from '../../../fixtures/csi/testSetup';
import {
  csiPhisingAdminTestEmail,
  csiPhisingAdminTestPassword,
  csiPhisingNonVictimTestEmail,
  csiPhisingVictimTestEmail,
  csiPhisingVictimTestPassword,
  csiSystemOwnerTestEmail,
  csiSystemOwnerTestPassword,
  csiTestEmail,
  csiTestPassword,
} from '../../../utils/csi/credentials';
import {
  CSI_PH024_LANDING_PAGE_HOST,
  csiPh008DelayedDate,
  csiPh021OrgAName,
  csiPh021OrgBName,
  csiPh024UniqueSuffix,
  csiPhisingUserSearchToken,
  csiPhisingUserSearchTokenFullLocal,
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

    test.describe('PH-008 creates phishing test with delayed course rule', () => {
      test('PH-008', async ({ csiPhisingPage }) => {
        const loginEmail = csiPhisingAdminTestEmail();
        // Search by full login email (not the first-name token used in PH-001)
        const searchToken = loginEmail;
        const testName = csiUniquePhisingTestName();
        // Both the schedule start date and the delayed course rule date are 7 days from today
        const delayedDate = csiPh008DelayedDate();

        await csiPhisingPage.openPhisingTestCreation();
        await csiPhisingPage.selectFirstAttackTemplateAndContinue();
        await csiPhisingPage.chooseIndividualsAndSelectLoginUser(loginEmail, searchToken);
        await csiPhisingPage.fillPhisingTestDetailsAndContinueForPh008(testName);
        await csiPhisingPage.finalizeWithDelayedCourseRuleAndDistribute(delayedDate);
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

  /**
   * PH-003: same creation flow as PH-001 but uses CSI_TEST_EMAIL for login
   * and searches the target user by full email instead of the first-name token.
   */
  test.describe('PH-003 creates phishing test with CSI_TEST_EMAIL login and full-email user search', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (!process.env.CSI_TEST_PASSWORD?.length || !process.env.CSI_TEST_EMAIL?.trim()?.length) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
      await csiLoginPage.expectOnHome();
    });

    test('PH-003', async ({ csiPhisingPage }) => {
      const loginEmail = csiTestEmail();
      const searchToken = loginEmail;
      const testName = csiUniquePhisingTestName();

      await csiPhisingPage.openPhisingTestCreation();
      await csiPhisingPage.selectFirstAttackTemplateAndContinue();
      await csiPhisingPage.chooseIndividualsAndSelectLoginUser(loginEmail, searchToken);
      await csiPhisingPage.fillPhisingTestDetailsAndContinue(testName);
      await csiPhisingPage.finalizeAndDistribute();
      await csiPhisingPage.expectPhisingTestCreated(testName);
    });
  });

  /** PH-002: same creation flow as PH-001 but executed under a System Owner role. */
  test.describe('PH-002 system owner creates phishing test', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_SYSTEM_OWNER_TEST_PASSWORD?.length ||
        !process.env.CSI_SYSTEM_OWNER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      const email = csiSystemOwnerTestEmail();
      const password = csiSystemOwnerTestPassword();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(email, password);
      await csiLoginPage.expectOnHome();
    });

    test('PH-002', async ({ csiPhisingPage }) => {
      const loginEmail = csiSystemOwnerTestEmail();
      const searchToken = loginEmail;
      const testName = csiUniquePhisingTestName();

      await csiPhisingPage.openPhisingTestCreation();
      await csiPhisingPage.selectFirstAttackTemplateAndContinue();
      await csiPhisingPage.chooseIndividualsAndSelectLoginUser(loginEmail, searchToken);
      await csiPhisingPage.fillPhisingTestDetailsAndContinue(testName);
      await csiPhisingPage.finalizeAndDistribute();
      await csiPhisingPage.expectPhisingTestCreated(testName);
    });
  });

  /**
   * PH-021: Views phishing report results across orgs.
   * Uses a dedicated beforeEach login with CSI_TEST_EMAIL.
   */
  test.describe('PH-021 phishing report cross-org view', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (!process.env.CSI_TEST_PASSWORD?.length) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
      await csiLoginPage.expectOnHome();
    });

    test('PH-021', async ({ csiPhisingPage }) => {
      const orgAName = csiPh021OrgAName();
      const orgBName = csiPh021OrgBName();

      await csiPhisingPage.expectPh021SuperAdminViewsResultsAcrossOrgs(orgAName, orgBName);
    });
  });

  test.describe('PH-011 phishing mail ignore', () => {
    test.describe.configure({ timeout: 1_500_000 });

    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_PHISING_ADMIN_TEST_PASSWORD?.length ||
        !process.env.CSI_PHISING_ADMIN_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_PHISING_NON_VICTIM_TEST_PASSWORD?.length ||
        !process.env.CSI_PHISING_NON_VICTIM_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiPhisingAdminTestEmail(),
        csiPhisingAdminTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('PH-011', async ({ csiPhisingPage }) => {
      const targetEmail = csiPhisingNonVictimTestEmail();
      const testName = csiUniquePhisingTestName();

      await csiPhisingPage.createAndDistributePhishingTestForPh011({
        targetEmail,
        testName,
        searchToken: csiPhisingUserSearchTokenFullLocal(targetEmail),
      });

      await csiPhisingPage.expectPh011IgnoredPhishingEngagementStats();
    });
  });

  test.describe('PH-014 phishing course completed passed certificate', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_PHISING_VICTIM_TEST_PASSWORD?.length ||
        !process.env.CSI_PHISING_VICTIM_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiPhisingVictimTestEmail(),
        csiPhisingVictimTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('PH-014', async ({ csiPhisingPage }) => {
      await csiPhisingPage.expectPh014CompletedPassedCourseWithViewCertificate();
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
