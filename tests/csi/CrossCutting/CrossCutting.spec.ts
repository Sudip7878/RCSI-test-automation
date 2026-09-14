import { test } from '../../../fixtures/csi/testSetup';
import {
  csiExpiredSalesSystemOwnerTestEmail,
  csiExpiredSalesSystemOwnerTestPassword,
  csiNoPolicySystemOwnerTestEmail,
  csiNoPolicySystemOwnerTestPassword,
  csiTestEmail,
  csiTestPassword,
  csiTpPhisingAdminTestEmail,
  csiTpPhisingAdminTestPassword,
  csiTpTrainingAdminTestEmail,
  csiTpTrainingAdminTestPassword,
  csiTrainingPhisingSysOwnerTestEmail,
  csiTrainingPhisingSysOwnerTestPassword,
} from '../../../utils/csi/credentials';
import {
  csiPhisingUserSearchToken,
  csiUniquePhisingTestName,
} from '../../../utils/csi/phisingTestData';
import { csiDistributionUserSearchToken, csiUniqueDistributionName } from '../../../utils/csi/trainingTestData';

function cc001RequiredEnvPresent(): boolean {
  return (
    !!process.env.CSI_TRAINING_PHISING_SYS_OWNER_TEST_PASSWORD?.length &&
    !!process.env.CSI_TRAINING_PHISING_SYS_OWNER_TEST_EMAIL?.trim()?.length &&
    !!process.env.CSI_TP_TRAINING_ADMIN_TEST_PASSWORD?.length &&
    !!process.env.CSI_TP_TRAINING_ADMIN_TEST_EMAIL?.trim()?.length &&
    !!process.env.CSI_TP_PHISING_ADMIN_TEST_PASSWORD?.length &&
    !!process.env.CSI_TP_PHISING_ADMIN_TEST_EMAIL?.trim()?.length
  );
}

test.describe('CSI · Cross Cutting', () => {
  test.describe.configure({ timeout: 300_000 });

  /**
   * CC-001: SB-056 (restricted hub) → logout → TR-001 (course distribution) → logout → PH-001 (phishing test).
   */
  test('CC-001', async ({
    csiLoginPage,
    csiSalesAndBillingPage,
    csiTrainingPage,
    csiPhisingPage,
  }) => {
    if (!cc001RequiredEnvPresent()) {
      test.skip();
      return;
    }

    await csiLoginPage.gotoLogin();
    await csiLoginPage.signInWithEmailAndPassword(
      csiTrainingPhisingSysOwnerTestEmail(),
      csiTrainingPhisingSysOwnerTestPassword(),
    );

    await csiSalesAndBillingPage.expectSb056TrainingAndPhishingNavVisible();
    await csiSalesAndBillingPage.navigateSb056TrainingPhishingThenAccountManagement();
    await csiSalesAndBillingPage.expectSb056RestrictedHubModulesNotVisible();

    await csiLoginPage.logoutViaHeaderMenu();
    await csiLoginPage.expectEmailStepVisible();

    await csiLoginPage.gotoLogin();
    const trainingAdminEmail = csiTpTrainingAdminTestEmail();
    await csiLoginPage.signInWithEmailAndPassword(
      trainingAdminEmail,
      csiTpTrainingAdminTestPassword(),
    );
    await csiLoginPage.expectOnHome();

    const distributionName = csiUniqueDistributionName();
    const trainingUserSearchToken = csiDistributionUserSearchToken(trainingAdminEmail);

    const myCourseTitles = await csiTrainingPage.openMyCourseAndCollectRegisteredCourseTitles();
    const excludedForFirst = new Set(myCourseTitles);

    await csiTrainingPage.openCourseDistribution();
    await csiTrainingPage.startNewDistribution();
    await csiTrainingPage.fillDistributionName(distributionName);

    const firstSelectedCourse = await csiTrainingPage.selectFirstVisibleCourseOptionNotIn(
      excludedForFirst,
      0,
    );
    const excludedForSecond = new Set([...myCourseTitles, firstSelectedCourse]);
    await csiTrainingPage.selectFirstVisibleCourseOptionNotIn(excludedForSecond, 1);
    await csiTrainingPage.goToNextWizardStep();
    await csiTrainingPage.pickTodayDistributionStartDate();
    await csiTrainingPage.searchUsersAndSelectRowByEmail(trainingAdminEmail, trainingUserSearchToken);
    await csiTrainingPage.checkOptionalNotifySwitch();
    await csiTrainingPage.goToNextWizardStep();
    await csiTrainingPage.submitDistribute();
    await csiTrainingPage.openDistributionView();
    await csiTrainingPage.expectDistributionListed(distributionName);

    await csiLoginPage.logoutViaHeaderMenu();
    await csiLoginPage.expectEmailStepVisible();

    await csiLoginPage.gotoLogin();
    const phisingAdminEmail = csiTpPhisingAdminTestEmail();
    await csiLoginPage.signInWithEmailAndPassword(
      phisingAdminEmail,
      csiTpPhisingAdminTestPassword(),
    );
    await csiLoginPage.expectOnHome();

    const phisingSearchToken = csiPhisingUserSearchToken(phisingAdminEmail);
    const phisingTestName = csiUniquePhisingTestName();

    await csiPhisingPage.openPhisingTestCreation();
    await csiPhisingPage.selectFirstAttackTemplateAndContinue();
    await csiPhisingPage.chooseIndividualsAndSelectLoginUser(phisingAdminEmail, phisingSearchToken);
    await csiPhisingPage.fillPhisingTestDetailsAndContinue(phisingTestName);
    await csiPhisingPage.finalizeAndDistribute();
    await csiPhisingPage.expectPhisingTestCreated(phisingTestName);
  });

  /**
   * CC-022: grant Policy Management via sales order, verify hub access, then revoke (recorded-steps/CrossCutting/CC-022.txt).
   */
  test.describe('CC-022 sales order policy management access change', () => {
    test.describe.configure({ timeout: 600_000 });

    test('CC-022', async ({
      csiLoginPage,
      csiAccountManagementPage,
      csiSalesAndBillingPage,
    }) => {
      if (
        !process.env.CSI_NO_POLICY_SYSTEM_OWNER_TEST_PASSWORD?.length ||
        !process.env.CSI_NO_POLICY_SYSTEM_OWNER_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_TEST_PASSWORD?.length
      ) {
        test.skip();
        return;
      }

      const noPolicyEmail = csiNoPolicySystemOwnerTestEmail();
      const noPolicyPassword = csiNoPolicySystemOwnerTestPassword();
      const adminEmail = csiTestEmail();
      const adminPassword = csiTestPassword();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(noPolicyEmail, noPolicyPassword);

      if (await csiSalesAndBillingPage.isPolicyManagementHubMenuVisibleWithin()) {
        await csiLoginPage.logoutViaHeaderMenu();
        await csiLoginPage.expectEmailStepVisible();
        await csiLoginPage.gotoLogin();
        await csiLoginPage.signInWithEmailAndPassword(adminEmail, adminPassword);
        await csiLoginPage.expectOnHome();

        const staleOrganizationName =
          await csiAccountManagementPage.readOrganizationNameForFirstUserRowWithEmail(noPolicyEmail);
        await csiSalesAndBillingPage.ensurePolicyManagementRevokedOnActiveSalesOrderForClient(
          staleOrganizationName,
        );

        await csiLoginPage.logoutViaHeaderMenu();
        await csiLoginPage.expectEmailStepVisible();
        await csiLoginPage.gotoLogin();
        await csiLoginPage.signInWithEmailAndPassword(noPolicyEmail, noPolicyPassword);
      }

      await csiSalesAndBillingPage.expectPolicyManagementHubNotVisible();

      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(adminEmail, adminPassword);
      await csiLoginPage.expectOnHome();

      const organizationName =
        await csiAccountManagementPage.readOrganizationNameForFirstUserRowWithEmail(noPolicyEmail);

      await csiSalesAndBillingPage.openSalesOrderList();
      await csiSalesAndBillingPage.searchSalesOrderListByOrganization(organizationName);
      await csiSalesAndBillingPage.openEditOnActiveSalesOrderForClient(organizationName);
      await csiSalesAndBillingPage.setPolicyManagementModuleIncluded(true);
      await csiSalesAndBillingPage.submitSalesOrderEditUpdate();

      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(noPolicyEmail, noPolicyPassword);
      await csiSalesAndBillingPage.expectPolicyManagementHubVisible();

      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(adminEmail, adminPassword);
      await csiLoginPage.expectOnHome();

      await csiSalesAndBillingPage.openSalesOrderList();
      await csiSalesAndBillingPage.searchSalesOrderListByOrganization(organizationName);
      await csiSalesAndBillingPage.openEditOnActiveSalesOrderForClient(organizationName);
      await csiSalesAndBillingPage.setPolicyManagementModuleIncluded(false);
      await csiSalesAndBillingPage.submitSalesOrderEditUpdate();
    });
  });

  /**
   * CC-023: expired sales system owner must not see revoked hub modules (recorded-steps/CrossCutting/CC-023.txt).
   */
  test.describe('CC-023 expired sales system owner access revoked', () => {
    test('CC-023', async ({ csiLoginPage, csiSalesAndBillingPage }) => {
      if (
        !process.env.CSI_EXPIRED_SALES_SYSTEM_OWNER_TEST_PASSWORD?.length ||
        !process.env.CSI_EXPIRED_SALES_SYSTEM_OWNER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiExpiredSalesSystemOwnerTestEmail(),
        csiExpiredSalesSystemOwnerTestPassword(),
      );

      await csiSalesAndBillingPage.expectCc023RevokedHubModulesNotVisible();
    });
  });
});
