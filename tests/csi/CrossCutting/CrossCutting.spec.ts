import fs from 'node:fs';
import path from 'node:path';

import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';

import { CSI_ACCOUNT_MANAGEMENT_PATH } from '../../../config/csi';
import { test } from '../../../fixtures/csi/testSetup';
import type { CsiSalesAndBillingPage } from '../../../pages/csi/SalesAndBillingPage';
import { CsiAccountManagementPage } from '../../../pages/csi/AccountManagementPage';
import { CsiAvotechLoginPage } from '../../../pages/csi/AvotechLoginPage';
import {
  csiAdminTestEmail,
  csiAdminTestPassword,
  csiAdminUserTestEmail,
  csiAdminUserTestPassword,
  csiExpiredSalesSystemOwnerTestEmail,
  csiExpiredSalesSystemOwnerTestPassword,
  csiNoPolicySystemOwnerTestEmail,
  csiNoPolicySystemOwnerTestPassword,
  csiOrgASystemOwnerTestEmail,
  csiOrgASystemOwnerTestPassword,
  csiOrgBSystemOwnerTestEmail,
  csiOrgBSystemOwnerTestPassword,
  csiPhishingAdminTestEmail,
  csiPhishingAdminTestPassword,
  csiPolicyAuthorTestEmail,
  csiPolicyAuthorTestPassword,
  csiPolicyOwnerTestEmail,
  csiPolicyOwnerTestPassword,
  csiSystemOwnerTestEmail,
  csiSystemOwnerTestPassword,
  csiTestEmail,
  csiTestPassword,
  csiUserTestEmail,
  csiUserTestPassword,
  csiTpPhisingAdminTestEmail,
  csiTpPhisingAdminTestPassword,
  csiTpTrainingAdminTestEmail,
  csiTpTrainingAdminTestPassword,
  csiTrainingAdminTestEmail,
  csiTrainingAdminTestPassword,
  csiTrainingPhisingSysOwnerTestEmail,
  csiTrainingPhisingSysOwnerTestPassword,
} from '../../../utils/csi/credentials';
import { assertSb057ThemeMatchesBaseline } from '../../../utils/csi/sb057WhiteLabelCompare';
import {
  SB057_LOGO_MAX_DIFF_PIXEL_RATIO,
  SB057_VIEWPORT,
  sb057LogoSnapshotName,
  sb057OrgFileSlug,
} from '../../../utils/csi/sb057WhiteLabelTestData';
import {
  CC006_ORG_A_THEME_NAME,
  CC006_ORG_B_THEME_NAME,
  CC009_ADMIN_ACCESSIBLE_MODULE_PATHS,
  CC009_ADMIN_DENIED_MODULE_PATHS,
  CC009_CC010_PERMISSION_DENIED_TIMEOUT_MS,
  CC009_MODULE_ACCESS_TIMEOUT_MS,
  CC009_SALES_MODULE_PATHS,
  CC010_MODULE_ACCESS_TIMEOUT_MS,
  CC010_PHISHING_ADMIN_DENIED_TRAINING_PATHS,
  CC010_PHISHING_MODULE_PATHS,
  CC010_TRAINING_MODULE_PATHS,
  CC012_USER_ACCESSIBLE_MODULE_PATHS,
  cc008SuperAdminAccessibleModulePaths,
  cc009SystemOwnerAccessibleModulePaths,
  cc010PhishingAdminAccessibleTrainingPaths,
  cc012UserDeniedModulePaths,
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

/**
 * CC-006: logo snapshot compare; when the base image does not exist yet it is captured from the
 * live app instead of failing, so the first run bootstraps the baseline.
 */
async function expectCc006LogoMatchesBaseline(
  logo: Locator,
  snapshotName: string,
  testInfo: TestInfo,
): Promise<void> {
  const snapshotPath = testInfo.snapshotPath(snapshotName);
  if (!fs.existsSync(snapshotPath)) {
    fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
    await logo.screenshot({ path: snapshotPath });
    return;
  }
  await expect(logo).toHaveScreenshot(snapshotName, {
    maxDiffPixelRatio: SB057_LOGO_MAX_DIFF_PIXEL_RATIO,
    timeout: 30_000,
  });
}

/** CC-006: same logo + CSS variable checks as SB-057, against the baselines stored for `orgName`. */
async function expectCc006OrgWhiteLabelTheme(
  page: Page,
  salesAndBillingPage: CsiSalesAndBillingPage,
  orgName: string,
  testInfo: TestInfo,
): Promise<void> {
  await salesAndBillingPage.waitCc006PostLoginSettle();
  await salesAndBillingPage.expectCc006LogosVisible();

  const orgSlug = sb057OrgFileSlug(orgName);

  await expectCc006LogoMatchesBaseline(
    salesAndBillingPage.cc006WelcomeCardOrgLogo(),
    sb057LogoSnapshotName(orgSlug, 'welcome'),
    testInfo,
  );

  if ((await salesAndBillingPage.cc006VisibleOrgLogoImages().count()) >= 2) {
    await expectCc006LogoMatchesBaseline(
      salesAndBillingPage.cc006HeaderOrgLogo(),
      sb057LogoSnapshotName(orgSlug, 'header'),
      testInfo,
    );
  }

  await assertSb057ThemeMatchesBaseline(page, orgSlug, {
    updateBaselinesCommand: 'npm run test:cc006:update-baselines',
    createBaselineIfMissingOrEmpty: true,
  });
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
   * CC-006: white-label theming isolated per Sales Partner (recorded-steps/CrossCutting/CC-006.txt).
   * Org A owner (CSI_ORG_A_SYSTEM_OWNER_TEST_EMAIL) is signed in by beforeEach; Org B owner
   * (CSI_ORG_B_SYSTEM_OWNER_TEST_EMAIL) signs in inside the test after header logout.
   * After each login, wait 5 seconds, then run the SB-057 checks against that org's own baselines:
   * header and welcome-card logo snapshots (95% match) and the theme CSS variables JSON.
   * A missing logo snapshot, or a theme JSON that is missing or empty, is captured from the live app
   * on the first run instead of failing. To overwrite existing baselines, run
   * `npm run test:cc006:update-baselines`.
   */
  test.describe('CC-006 white-label theming isolated per sales partner', () => {
    test.describe.configure({ timeout: 300_000 });
    test.use({ viewport: SB057_VIEWPORT });

    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_ORG_A_SYSTEM_OWNER_TEST_PASSWORD?.length ||
        !process.env.CSI_ORG_A_SYSTEM_OWNER_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_ORG_B_SYSTEM_OWNER_TEST_PASSWORD?.length ||
        !process.env.CSI_ORG_B_SYSTEM_OWNER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiOrgASystemOwnerTestEmail(),
        csiOrgASystemOwnerTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('CC-006', async ({ page, csiLoginPage, csiSalesAndBillingPage }, testInfo) => {
      await expectCc006OrgWhiteLabelTheme(
        page,
        csiSalesAndBillingPage,
        CC006_ORG_A_THEME_NAME,
        testInfo,
      );

      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiOrgBSystemOwnerTestEmail(),
        csiOrgBSystemOwnerTestPassword(),
      );
      await csiLoginPage.expectOnHome();

      await expectCc006OrgWhiteLabelTheme(
        page,
        csiSalesAndBillingPage,
        CC006_ORG_B_THEME_NAME,
        testInfo,
      );
    });
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
   * CC-008: Super Admin vs System Owner — Sales & Billing access
   * (recorded-steps/CrossCutting/CC-008.txt).
   * No suite beforeEach. Both sessions log in inside the test:
   * CSI_SYSTEM_OWNER_TEST_EMAIL first, then CSI_TEST_EMAIL after header logout
   * once the email field is visible.
   * System Owner may open the same module URLs as CC-009 and must be denied
   * Sales & Billing ("You don't have permissions to view this screen." within 10 seconds).
   * Super Admin may open those System Owner URLs and the Sales & Billing URLs.
   * An accessible page must show no permission denial for 5 seconds.
   */
  test.describe('CC-008 super admin and system owner sales and billing access', () => {
    test.describe.configure({ timeout: 900_000 });

    test('CC-008', async ({ csiLoginPage, csiAccountManagementPage }) => {
      if (
        !process.env.CSI_SYSTEM_OWNER_TEST_PASSWORD?.length ||
        !process.env.CSI_SYSTEM_OWNER_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_TEST_PASSWORD?.length
      ) {
        test.skip();
        return;
      }

      const moduleAccessTimeoutMs = CC009_MODULE_ACCESS_TIMEOUT_MS;
      const permissionDeniedTimeoutMs = CC009_CC010_PERMISSION_DENIED_TIMEOUT_MS;

      await csiLoginPage.gotoLogin();
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

      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();

      await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
      await csiLoginPage.expectAuthenticatedAppSession();

      for (const modulePath of cc008SuperAdminAccessibleModulePaths()) {
        await csiAccountManagementPage.openModulePathAndExpectAccessible(
          modulePath,
          moduleAccessTimeoutMs,
        );
      }
    });
  });

  /**
   * CC-005: Super Admin sees all organizations and can open Sales & Billing
   * (recorded-steps/CrossCutting/CC-005.txt).
   * No suite beforeEach. Logs in inside the test as CSI_TEST_EMAIL (csiTestEmail).
   * After login it waits 5 seconds before opening /avo_organizationlist, which must render
   * the table with data rows and a non-zero item total.
   * Each Sales & Billing URL must show no permission denial for 5 seconds.
   */
  test.describe('CC-005 super admin sees all organizations', () => {
    test.describe.configure({ timeout: 300_000 });

    test('CC-005', async ({ csiLoginPage, csiAccountManagementPage }) => {
      if (!process.env.CSI_TEST_PASSWORD?.length || !process.env.CSI_TEST_EMAIL?.trim()?.length) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
      await csiLoginPage.expectAuthenticatedAppSession();
      await csiLoginPage.page.waitForTimeout(5_000);

      await csiAccountManagementPage.openOrganizationList();
      await csiAccountManagementPage.expectOrganizationListTableLoadedCc005();

      for (const modulePath of CC009_SALES_MODULE_PATHS) {
        await csiAccountManagementPage.openModulePathAndExpectAccessible(
          modulePath,
          CC009_MODULE_ACCESS_TIMEOUT_MS,
        );
      }
    });
  });

  /**
   * CC-012: Vertical escalation — User to Admin/Super Admin
   * (recorded-steps/CrossCutting/CC-012.txt).
   * No suite beforeEach. This file does not sign in ahead of the test, so CC-012
   * logs in inside the body as CSI_USER_TEST_EMAIL (csiUserTestEmail).
   * That mailbox is also the AM-033 subject; do not run the two tests together,
   * because AM-033 rewrites the user's roles.
   * Regular user may open /courseDashboard, /myCourse, /courseLibrary, and /MyPolicies.
   * Every other Admin / System Owner / Sales URL must show
   * "You don't have permissions to view this screen." within 10 seconds.
   */
  test.describe('CC-012 user cannot escalate to admin or super admin', () => {
    test.describe.configure({ timeout: 900_000 });

    test('CC-012', async ({ csiLoginPage, csiAccountManagementPage }) => {
      if (
        !process.env.CSI_USER_TEST_PASSWORD?.length ||
        !process.env.CSI_USER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      const moduleAccessTimeoutMs = CC009_MODULE_ACCESS_TIMEOUT_MS;
      const permissionDeniedTimeoutMs = CC009_CC010_PERMISSION_DENIED_TIMEOUT_MS;

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiUserTestEmail(), csiUserTestPassword());
      await csiLoginPage.expectAuthenticatedAppSession();

      for (const modulePath of CC012_USER_ACCESSIBLE_MODULE_PATHS) {
        await csiAccountManagementPage.openModulePathAndExpectAccessible(
          modulePath,
          moduleAccessTimeoutMs,
        );
      }

      for (const modulePath of cc012UserDeniedModulePaths()) {
        await csiAccountManagementPage.openModulePathAndExpectPermissionDenied(
          modulePath,
          permissionDeniedTimeoutMs,
        );
      }
    });
  });

  /**
   * CC-013: role change takes effect on an already open session
   * (recorded-steps/CrossCutting/CC-013.txt).
   * No suite beforeEach. The file does not sign in ahead of the test.
   * Browser 1 logs in as CSI_ADMIN_USER_TEST_EMAIL and stays signed in.
   * Browser 2 logs in as CSI_TEST_EMAIL and toggles the first role checkbox (Admin)
   * on the user list Change Role grid — same navigation as AM-033, without changing
   * those methods. The subject account must start with Admin assigned.
   * After revoke, browser 1 opens /AccountManagement and must see
   * "You don't have permissions to view this screen." within 10 seconds.
   * After Admin is assigned again, the same session can open /AccountManagement
   * with no permission denial for 5 seconds. Browser 1 returns to the hub home
   * between the first access check and the role edit so the session is idle.
   * If the test fails after revoke, the Admin checkbox is checked again before close.
   */
  test.describe('CC-013 role change takes immediate effect', () => {
    test.describe.configure({ timeout: 300_000 });

    test('CC-013', async ({ browser, csiLoginPage, csiAccountManagementPage }) => {
      if (
        !process.env.CSI_ADMIN_USER_TEST_PASSWORD?.length ||
        !process.env.CSI_ADMIN_USER_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_TEST_PASSWORD?.length
      ) {
        test.skip();
        return;
      }

      const subjectEmail = csiAdminUserTestEmail();
      const subjectPassword = csiAdminUserTestPassword();
      const operatorEmail = csiTestEmail();
      const operatorPassword = csiTestPassword();
      const moduleAccessTimeoutMs = CC009_MODULE_ACCESS_TIMEOUT_MS;
      const permissionDeniedTimeoutMs = CC009_CC010_PERMISSION_DENIED_TIMEOUT_MS;

      const operatorContext = await browser.newContext();
      const operatorPage = await operatorContext.newPage();
      const operatorLoginPage = new CsiAvotechLoginPage(operatorPage);
      const operatorAccountPage = new CsiAccountManagementPage(operatorPage);
      let adminRoleRevoked = false;
      let adminRoleRestored = false;

      try {
        await csiLoginPage.gotoLogin();
        await csiLoginPage.signInWithEmailAndPassword(subjectEmail, subjectPassword);
        await csiLoginPage.expectAuthenticatedAppSession();

        await csiAccountManagementPage.openModulePathAndExpectAccessible(
          CSI_ACCOUNT_MANAGEMENT_PATH,
          moduleAccessTimeoutMs,
        );
        await csiLoginPage.gotoHome();

        await operatorLoginPage.gotoLogin();
        await operatorLoginPage.signInWithEmailAndPassword(operatorEmail, operatorPassword);
        await operatorLoginPage.expectOnHome();

        adminRoleRevoked = true;
        await operatorAccountPage.revokeAdminViaFirstRoleCheckboxCc013(subjectEmail);

        await csiAccountManagementPage.openModulePathAndExpectPermissionDenied(
          CSI_ACCOUNT_MANAGEMENT_PATH,
          permissionDeniedTimeoutMs,
        );

        await operatorAccountPage.assignAdminViaFirstRoleCheckboxCc013(subjectEmail);
        adminRoleRestored = true;

        await csiAccountManagementPage.openModulePathAndExpectAccessible(
          CSI_ACCOUNT_MANAGEMENT_PATH,
          moduleAccessTimeoutMs,
        );
      } finally {
        if (adminRoleRevoked && !adminRoleRestored) {
          try {
            await operatorAccountPage.assignAdminViaFirstRoleCheckboxCc013(subjectEmail);
          } catch (restoreError) {
            console.error(
              `[CC-013] Could not restore the Admin role for ${subjectEmail}:`,
              restoreError,
            );
          }
        }
        await operatorContext.close();
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
   * CC-011: Policy Owner vs Policy Author on View Policies
   * (recorded-steps/CrossCutting/CC-011.txt).
   * No suite beforeEach. Both sessions log in inside the test:
   * CSI_POLICY_OWNER_TEST_EMAIL, then CSI_POLICY_AUTHOR_TEST_EMAIL after header logout
   * once the email field is visible.
   * Owner: Pending for Approval reveals Review; Create a New Policy stays hidden.
   * Author: Create a New Policy is visible; Pending for Approval does not reveal Review.
   */
  test.describe('CC-011 policy author and policy owner separation', () => {
    test.describe.configure({ timeout: 300_000 });

    test('CC-011', async ({ csiLoginPage, csiPolicyManagementPage }) => {
      if (
        !process.env.CSI_POLICY_OWNER_TEST_PASSWORD?.length ||
        !process.env.CSI_POLICY_OWNER_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_POLICY_AUTHOR_TEST_PASSWORD?.length ||
        !process.env.CSI_POLICY_AUTHOR_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiPolicyOwnerTestEmail(),
        csiPolicyOwnerTestPassword(),
      );
      await csiLoginPage.expectAuthenticatedAppSession();

      await csiPolicyManagementPage.openViewPoliciesCc011();
      await csiPolicyManagementPage.expectPendingForApprovalTextCc011();
      await csiPolicyManagementPage.clickPendingForApprovalTextCc011();
      await csiPolicyManagementPage.expectReviewTextVisibleCc011();
      await csiPolicyManagementPage.expectCreateNewPolicyButtonHiddenCc011();

      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();

      await csiLoginPage.signInWithEmailAndPassword(
        csiPolicyAuthorTestEmail(),
        csiPolicyAuthorTestPassword(),
      );
      await csiLoginPage.expectAuthenticatedAppSession();

      await csiPolicyManagementPage.openViewPoliciesCc011();
      await csiPolicyManagementPage.expectCreateNewPolicyButtonVisibleCc011();
      await csiPolicyManagementPage.clickPendingForApprovalTextCc011();
      await csiPolicyManagementPage.expectReviewTextHiddenCc011();
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
