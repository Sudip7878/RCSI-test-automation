import { test } from '../../../fixtures/csi/testSetup';
import {
  csiAdminTestEmail,
  csiAdminTestPassword,
  csiExpiredSalesSystemOwnerTestEmail,
  csiExpiredSalesSystemOwnerTestPassword,
  csiNoPolicySystemOwnerTestEmail,
  csiNoPolicySystemOwnerTestPassword,
  csiPhishingAdminTestEmail,
  csiPhishingAdminTestPassword,
  csiSystemOwnerTestEmail,
  csiSystemOwnerTestPassword,
  csiTestEmail,
  csiTestPassword,
  csiTpPhisingAdminTestEmail,
  csiTpPhisingAdminTestPassword,
  csiTpTrainingAdminTestEmail,
  csiTpTrainingAdminTestPassword,
  csiTrainingAdminTestEmail,
  csiTrainingAdminTestPassword,
  csiTrainingPhisingSysOwnerTestEmail,
  csiTrainingPhisingSysOwnerTestPassword,
} from '../../../utils/csi/credentials';
import {
  CC009_ADMIN_ACCESSIBLE_MODULE_PATHS,
  CC009_ADMIN_DENIED_MODULE_PATHS,
  CC009_CC010_PERMISSION_DENIED_TIMEOUT_MS,
  CC009_MODULE_ACCESS_TIMEOUT_MS,
  CC009_SALES_MODULE_PATHS,
  CC010_MODULE_ACCESS_TIMEOUT_MS,
  CC010_PHISHING_ADMIN_DENIED_TRAINING_PATHS,
  CC010_PHISHING_MODULE_PATHS,
  CC010_TRAINING_MODULE_PATHS,
  cc009SystemOwnerAccessibleModulePaths,
  cc010PhishingAdminAccessibleTrainingPaths,
} from '../../../utils/csi/crossCuttingTestData';
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

  test.describe('CC-009 admin and system owner module URL access', () => {
    test.describe.configure({ timeout: 900_000 });

    test('CC-009', async ({ csiLoginPage, csiAccountManagementPage }) => {
      if (
        !process.env.CSI_ADMIN_TEST_PASSWORD?.length ||
        !process.env.CSI_ADMIN_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_SYSTEM_OWNER_TEST_PASSWORD?.length ||
        !process.env.CSI_SYSTEM_OWNER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      const moduleAccessTimeoutMs = CC009_MODULE_ACCESS_TIMEOUT_MS;
      const permissionDeniedTimeoutMs = CC009_CC010_PERMISSION_DENIED_TIMEOUT_MS;

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiAdminTestEmail(), csiAdminTestPassword());
      await csiLoginPage.expectAuthenticatedAppSession();

      for (const modulePath of CC009_ADMIN_ACCESSIBLE_MODULE_PATHS) {
        await csiAccountManagementPage.openModulePathAndExpectAccessible(
          modulePath,
          moduleAccessTimeoutMs,
        );
      }

      for (const modulePath of CC009_ADMIN_DENIED_MODULE_PATHS) {
        await csiAccountManagementPage.openModulePathAndExpectPermissionDenied(
          modulePath,
          permissionDeniedTimeoutMs,
        );
      }

      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();

      await csiLoginPage.signInWithEmailAndPassword(
        csiSystemOwnerTestEmail(),
        csiSystemOwnerTestPassword(),
      );
      await csiLoginPage.expectAuthenticatedAppSession();

      for (const modulePath of cc009SystemOwnerAccessibleModulePaths()) {
        await csiAccountManagementPage.openModulePathAndExpectAccessible(
          modulePath,
          moduleAccessTimeoutMs,
        );
      }

      for (const modulePath of CC009_SALES_MODULE_PATHS) {
        await csiAccountManagementPage.openModulePathAndExpectPermissionDenied(
          modulePath,
          permissionDeniedTimeoutMs,
        );
      }
    });
  });

  /**
   * CC-010: Training Admin and Phishing Admin module URL access
   * (recorded-steps/CrossCutting/CC-010.txt).
   * No suite beforeEach. Both sessions log in inside the test:
   * CSI_TRAINING_ADMIN_TEST_EMAIL, then CSI_PHISHING_ADMIN_TEST_EMAIL after header logout
   * once the email field is visible.
   * Training admin is denied phishing URLs. Phishing admin can open phishing URLs and training URLs
   * except /CourseDistribution and /CourseReport, which stay permission-denied.
   */
  test.describe('CC-010 training admin and phishing admin module URL isolation', () => {
    test.describe.configure({ timeout: 600_000 });

    test('CC-010', async ({ csiLoginPage, csiAccountManagementPage }) => {
      if (
        !process.env.CSI_TRAINING_ADMIN_TEST_PASSWORD?.length ||
        !process.env.CSI_TRAINING_ADMIN_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_PHISHING_ADMIN_TEST_PASSWORD?.length ||
        !process.env.CSI_PHISHING_ADMIN_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      const moduleAccessTimeoutMs = CC010_MODULE_ACCESS_TIMEOUT_MS;
      const permissionDeniedTimeoutMs = CC009_CC010_PERMISSION_DENIED_TIMEOUT_MS;

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiTrainingAdminTestEmail(),
        csiTrainingAdminTestPassword(),
      );
      await csiLoginPage.expectAuthenticatedAppSession();

      for (const modulePath of CC010_TRAINING_MODULE_PATHS) {
        await csiAccountManagementPage.openModulePathAndExpectAccessible(
          modulePath,
          moduleAccessTimeoutMs,
        );
      }

      for (const modulePath of CC010_PHISHING_MODULE_PATHS) {
        await csiAccountManagementPage.openModulePathAndExpectPermissionDenied(
          modulePath,
          permissionDeniedTimeoutMs,
        );
      }

      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();

      await csiLoginPage.signInWithEmailAndPassword(
        csiPhishingAdminTestEmail(),
        csiPhishingAdminTestPassword(),
      );
      await csiLoginPage.expectAuthenticatedAppSession();

      for (const modulePath of CC010_PHISHING_MODULE_PATHS) {
        await csiAccountManagementPage.openModulePathAndExpectAccessible(
          modulePath,
          moduleAccessTimeoutMs,
        );
      }

      for (const modulePath of cc010PhishingAdminAccessibleTrainingPaths()) {
        await csiAccountManagementPage.openModulePathAndExpectAccessible(
          modulePath,
          moduleAccessTimeoutMs,
        );
      }

      for (const modulePath of CC010_PHISHING_ADMIN_DENIED_TRAINING_PATHS) {
        await csiAccountManagementPage.openModulePathAndExpectPermissionDenied(
          modulePath,
          permissionDeniedTimeoutMs,
        );
      }
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
