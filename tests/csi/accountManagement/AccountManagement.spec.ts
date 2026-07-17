import { expect, test } from '../../../fixtures/csi/testSetup';
import path from 'node:path';

import {
  buildBulkUsersFromSystemOwnerEmail,
  buildBulkUsersWithInvalidDomainAm028,
  writeBulkUsersToTemplateXlsx,
} from '../../../utils/csi/accountManagementBulkUpload';
import {
  expectNoEmailIntersection,
  writeAm063UserEmailsSnapshot,
} from '../../../utils/csi/am063UserListEmails';
import {
  csiIncidentReporterTestEmail,
  csiIncidentReporterTestPassword,
  csiOrgASystemOwnerTestEmail,
  csiOrgASystemOwnerTestPassword,
  csiOrgBSystemOwnerTestEmail,
  csiOrgBSystemOwnerTestPassword,
  csiOrgTestEmail,
  csiOrgTestPassword,
  csiOrgUserTestEmail,
  csiOrgUserTestPassword,
  csiSystemOwnerTestEmail,
  csiSystemOwnerTestPassword,
} from '../../../utils/csi/credentials';
import {
  AM021_ORG_NAME,
  AM021_ORG_SEARCH_TERM,
  buildAm009OrganizationProfile,
  buildAm021UserProfile,
} from '../../../utils/csi/am009OrganizationTestData';
// import {
//   am015OrganizationFormSteps,
//   buildAm015OrganizationProfile,
// } from '../../../utils/csi/am015OrganizationTestData';
// import {
//   buildInvalidFormatOwnerEmailAm016,
// } from '../../../utils/csi/am016OrganizationTestData';
// import { AM003_INVALID_SIGNUP_EMAILS } from '../../../utils/csi/am003AccountManagementTestData';
// import { buildExternalDomainUserEmailAm026 } from '../../../utils/csi/am026AccountManagementTestData';
import { buildWrongCurrentPasswordAm062 } from '../../../utils/csi/am062AccountManagementTestData';
import {
  csiAccountManagementEmailLocalPart,
  csiAccountManagementFirstName,
  csiAccountManagementLastName,
  csiGroupTitleAm041,
} from '../../../utils/csi/accountManagementTestData';
import {
  csiAdminTestEmail,
  csiAdminTestPassword,
  csiAvotechManagerTestEmail,
  csiAvotechManagerTestPassword,
  csiGroupManagerEmail,
  csiGroupManagerName,
  csiGroupManagerPassword,
  csiGroupMemberEmail,
  csiOrgInactiveUserTestEmail,
  csiOrgInactiveUserTestPassword,
  csiOrgPasswordChangeUserTestEmail,
  csiOrgPasswordChangeUserTestPassword1,
  csiOrgPasswordChangeUserTestPassword2,
  csiTestEmail,
  csiTestPassword,
  csiUserTestEmail,
  csiUserTestPassword,
} from '../../../utils/csi/credentials';
import {
  cleanupAm033RoleAssignmentsOnFailure,
  type Am033LoggedInAs,
} from '../../../utils/csi/am033Cleanup';
import {
  AM033_ROLE_MODULE_ACCESS,
  am033AllModulePaths,
} from '../../../utils/csi/am033RoleModuleAccess';
import {
  csiSalesOrderDuration,
  csiSalesOrderUnitsPerModule,
} from '../../../utils/csi/salesAndBillingTestData';
import { writeLastUserNumber } from '../../../utils/csi/userCounter';

test.describe('CSI · Account Management', () => {
  test.describe.configure({ timeout: 120_000 });

  test.describe('AM-019 manual add user', () => {
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

    test('AM-019', async ({
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

  /**
   * AM-020: admin adds user — identical flow to AM-019 (manual add user) but logged in as
   * `CSI_ADMIN_TEST_EMAIL` (recorded-steps/AccountManagement/AM-020.txt).
   */
  test.describe('AM-020 admin add user', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_ADMIN_TEST_PASSWORD?.length ||
        !process.env.CSI_ADMIN_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiAdminTestEmail(), csiAdminTestPassword());
      await csiLoginPage.expectOnHome();
    });

    test('AM-020', async ({ csiAccountManagementPage }) => {
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

  /**
   * AM-021: super admin creates a user under the Avotech org, then logs in as the Avotech org
   * manager to verify the new user appears in the user list
   * (recorded-steps/AccountManagement/AM-021.txt).
   * Uses `CSI_TEST_*` for creation and `CSI_AVOTECH_MANAGER_TEST_*` for verification.
   */
  test.describe('AM-021 super admin adds user to any org', () => {
    test.describe.configure({ timeout: 180_000 });

    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_TEST_PASSWORD?.length ||
        !process.env.CSI_AVOTECH_MANAGER_TEST_PASSWORD?.length ||
        !process.env.CSI_AVOTECH_MANAGER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
      await csiLoginPage.expectOnHome();
    });

    test('AM-021', async ({ csiLoginPage, csiAccountManagementPage }) => {
      const profile = buildAm021UserProfile(csiTestEmail());

      await csiAccountManagementPage.openUserListWithSearchReady();
      await csiAccountManagementPage.startAddUserManually();
      await csiAccountManagementPage.selectOrganizationInAddUserFormAm021(
        AM021_ORG_SEARCH_TERM,
        AM021_ORG_NAME,
      );
      await csiAccountManagementPage.fillNewUserIdentity({
        firstName: profile.firstName,
        lastName: profile.lastName,
        emailLocalPart: profile.emailLocalPart,
      });
      await csiAccountManagementPage.submitCreateNewUser();
      await csiAccountManagementPage.expectUserCreatedSuccess();
      writeLastUserNumber(profile.suffix);

      // Navigate away then logout so the session is cleanly ended before switching accounts
      await csiAccountManagementPage.openUserListWithSearchReady();
      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();

      // Log in as the Avotech org manager and verify the new user is visible in their user list
      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiAvotechManagerTestEmail(),
        csiAvotechManagerTestPassword(),
      );
      await csiLoginPage.expectOnHome();

      await csiAccountManagementPage.openUserListWithSearchReady();
      await csiAccountManagementPage.searchUserListByEmail(profile.avotechEmail);
      await csiAccountManagementPage.expectUserGridShowsEmail(profile.avotechEmail);
    });
  });

  test.describe('AM-027 bulk upload', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_SYSTEM_OWNER_TEST_PASSWORD?.length ||
        !process.env.CSI_SYSTEM_OWNER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiSystemOwnerTestEmail(),
        csiSystemOwnerTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('AM-027', async ({ csiAccountManagementPage }) => {
      const systemOwnerEmail = csiSystemOwnerTestEmail();

      await csiAccountManagementPage.openUserListWithSearchReady();
      await csiAccountManagementPage.startAddUsersByExcelUpload();

      const cacheDir = path.resolve(__dirname, '../../../playwright/.cache/account-management');
      const downloadedTemplatePath = path.join(cacheDir, 'Employee_Import_Template.downloaded.xlsx');
      await csiAccountManagementPage.downloadBulkImportTemplateTo(downloadedTemplatePath);

      const generated = buildBulkUsersFromSystemOwnerEmail(systemOwnerEmail, 5, 'QA');
      const editedTemplatePath = path.join(cacheDir, 'Employee_Import_Template.edited.xlsx');
      writeBulkUsersToTemplateXlsx(downloadedTemplatePath, generated.rows, editedTemplatePath);

      await csiAccountManagementPage.uploadCompletedTemplate(editedTemplatePath);
      await csiAccountManagementPage.continueAfterTemplateUpload();

      const okRowEmails = await csiAccountManagementPage.collectValidatedBulkUploadEmails(generated.rows);
      await csiAccountManagementPage.importBulkUsers();
      await csiAccountManagementPage.expectBulkImportQueuedMessage();

      await csiAccountManagementPage.waitAndOpenUserListAfterBulkImport(3_000);
      await csiAccountManagementPage.expectUserGridShowsEmails(okRowEmails);
    });
  });

  /**
   * AM-028: bulk upload where every row has `invalid.com` as the email domain.
   * After the first Continue the UI shows an "Invalid domain" button per row; the test
   * clicks each one, clicks Save, and waits for the status to flip to "OK" before
   * proceeding with the second Continue and the standard AM-027 import flow
   * (recorded-steps/AccountManagement/AM-028.txt).
   */
  test.describe('AM-028 bulk upload fix invalid domain', () => {
    test.describe.configure({ timeout: 300_000 });

    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_SYSTEM_OWNER_TEST_PASSWORD?.length ||
        !process.env.CSI_SYSTEM_OWNER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiSystemOwnerTestEmail(),
        csiSystemOwnerTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('AM-028', async ({ csiAccountManagementPage }) => {
      const systemOwnerEmail = csiSystemOwnerTestEmail();

      await csiAccountManagementPage.openUserListWithSearchReady();
      await csiAccountManagementPage.startAddUsersByExcelUpload();

      const cacheDir = path.resolve(__dirname, '../../../playwright/.cache/account-management');
      const downloadedTemplatePath = path.join(cacheDir, 'Employee_Import_Template.downloaded.xlsx');
      await csiAccountManagementPage.downloadBulkImportTemplateTo(downloadedTemplatePath);

      // Upload rows use invalid.com domain; fixedRows carry the real domain for grid verification
      const generated = buildBulkUsersWithInvalidDomainAm028(systemOwnerEmail, 5, 'QA');
      const editedTemplatePath = path.join(cacheDir, 'Employee_Import_Template.am028.edited.xlsx');
      writeBulkUsersToTemplateXlsx(downloadedTemplatePath, generated.uploadRows, editedTemplatePath);

      await csiAccountManagementPage.uploadCompletedTemplate(editedTemplatePath);
      await csiAccountManagementPage.continueAfterTemplateUpload();

      // Fix every "Invalid domain" entry via the UI before the second Continue
      await csiAccountManagementPage.fixAllInvalidDomainEntriesAm028();
      await csiAccountManagementPage.continueAfterTemplateUpload();

      const okRowEmails = await csiAccountManagementPage.collectValidatedBulkUploadEmails(generated.fixedRows);
      await csiAccountManagementPage.importBulkUsers();
      await csiAccountManagementPage.expectBulkImportQueuedMessage();

      await csiAccountManagementPage.waitAndOpenUserListAfterBulkImport(3_000);
      await csiAccountManagementPage.expectUserGridShowsEmails(okRowEmails);
    });
  });

  /**
   * AM-041: system owner creates a group, assigns a manager by display-name search, adds a
   * member by email, saves; then verifies the group is visible in the group manager's group
   * list (recorded-steps/AccountManagement/AM-041.txt).
   * Uses `CSI_SYSTEM_OWNER_TEST_*` for creation and `CSI_GROUP_MANAGER_*` for verification.
   */
  test.describe('AM-041 system owner creates group and assigns manager', () => {
    test.describe.configure({ timeout: 180_000 });

    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_SYSTEM_OWNER_TEST_PASSWORD?.length ||
        !process.env.CSI_SYSTEM_OWNER_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_GROUP_MANAGER_NAME?.trim()?.length ||
        !process.env.CSI_GROUP_MANAGER_EMAIL?.trim()?.length ||
        !process.env.CSI_GROUP_MANAGER_PASSWORD?.length ||
        !process.env.CSI_GROUP_MEMBER_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiSystemOwnerTestEmail(),
        csiSystemOwnerTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('AM-041', async ({ csiLoginPage, csiAccountManagementPage }) => {
      const groupTitle = csiGroupTitleAm041();
      const managerName = csiGroupManagerName();
      const memberEmail = csiGroupMemberEmail();

      // Phase 1 — system owner creates the group
      await csiAccountManagementPage.openGroupList();
      await csiAccountManagementPage.startCreateGroupAm041(groupTitle);
      await csiAccountManagementPage.selectGroupManagerAm041(managerName);
      await csiAccountManagementPage.addGroupMemberByEmailAm041(memberEmail);
      await csiAccountManagementPage.saveGroupCreationAm041();

      // Phase 2 — group manager verifies the new group is visible in their group list
      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiGroupManagerEmail(),
        csiGroupManagerPassword(),
      );
      await csiLoginPage.expectOnHome();

      await csiAccountManagementPage.openGroupListWithSearchReadyAm041();
      await csiAccountManagementPage.searchAndExpectGroupInGridAm041(groupTitle);
    });
  });

  /**
   * AM-042: admin creates group + assigns manager — identical flow to AM-041 but the first
   * login uses `CSI_ADMIN_TEST_EMAIL` instead of `CSI_SYSTEM_OWNER_TEST_EMAIL`
   * (recorded-steps/AccountManagement/AM-042.txt).
   */
  test.describe('AM-042 admin creates group and assigns manager', () => {
    test.describe.configure({ timeout: 180_000 });

    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_ADMIN_TEST_PASSWORD?.length ||
        !process.env.CSI_ADMIN_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_GROUP_MANAGER_NAME?.trim()?.length ||
        !process.env.CSI_GROUP_MANAGER_EMAIL?.trim()?.length ||
        !process.env.CSI_GROUP_MANAGER_PASSWORD?.length ||
        !process.env.CSI_GROUP_MEMBER_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiAdminTestEmail(), csiAdminTestPassword());
      await csiLoginPage.expectOnHome();
    });

    test('AM-042', async ({ csiLoginPage, csiAccountManagementPage }) => {
      const groupTitle = csiGroupTitleAm041();
      const managerName = csiGroupManagerName();
      const memberEmail = csiGroupMemberEmail();

      // Phase 1 — admin creates the group
      await csiAccountManagementPage.openGroupList();
      await csiAccountManagementPage.startCreateGroupAm041(groupTitle);
      await csiAccountManagementPage.selectGroupManagerAm041(managerName);
      await csiAccountManagementPage.addGroupMemberByEmailAm041(memberEmail);
      await csiAccountManagementPage.saveGroupCreationAm041();

      // Phase 2 — group manager verifies the new group is visible in their group list
      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiGroupManagerEmail(),
        csiGroupManagerPassword(),
      );
      await csiLoginPage.expectOnHome();

      await csiAccountManagementPage.openGroupListWithSearchReadyAm041();
      await csiAccountManagementPage.searchAndExpectGroupInGridAm041(groupTitle);
    });
  });

  test.describe('AM-045 organization MFA', () => {
    test.describe.configure({ timeout: 180_000 });

    test('AM-045', async ({
      page,
      csiLoginPage,
      csiAccountManagementPage,
    }) => {
      if (
        !process.env.CSI_SYSTEM_OWNER_TEST_PASSWORD?.length ||
        !process.env.CSI_SYSTEM_OWNER_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_INCIDENT_REPORTER_TEST_PASSWORD?.length ||
        !process.env.CSI_INCIDENT_REPORTER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      const ownerEmail = csiSystemOwnerTestEmail();
      const ownerPassword = csiSystemOwnerTestPassword();
      const reporterEmail = csiIncidentReporterTestEmail();
      const reporterPassword = csiIncidentReporterTestPassword();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(ownerEmail, ownerPassword);
      await csiLoginPage.expectOnHome();

      await csiAccountManagementPage.openOrganizationDetail();
      await csiAccountManagementPage.startEditOrganizationDetails();
      await csiAccountManagementPage.openChangeMfaRule();
      await csiAccountManagementPage.selectMfaRuleRequiredForSomeRoles();
      await csiAccountManagementPage.ensureIncidentReporterMfaCheckboxChecked();
      await csiAccountManagementPage.submitMfaRoleSelection();
      await csiAccountManagementPage.saveOrganizationDetailChanges();
      await csiAccountManagementPage.expectOrganizationChangesSaved();

      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();
      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(reporterEmail, reporterPassword);
      await expect(
        page.getByText('Multi factor Authentication', { exact: true }),
      ).toBeVisible({ timeout: 60_000 });

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(ownerEmail, ownerPassword);
      await csiLoginPage.expectOnHome();

      await csiAccountManagementPage.openOrganizationDetail();
      await csiAccountManagementPage.startEditOrganizationDetails();
      await csiAccountManagementPage.openChangeMfaRule();
      await csiAccountManagementPage.selectMfaRuleNotMandatory();
      await csiAccountManagementPage.submitMfaRoleSelection();
      await csiAccountManagementPage.saveOrganizationDetailChanges();
      await csiAccountManagementPage.expectOrganizationChangesSaved();
    });
  });

  /**
   * AM-009: create organization (`avo_organizationlist`) then sales order with that client
   * (recorded-steps/AccountManagement/AM-009.txt). Uses `CSI_TEST_*` and `storage/userCounter.json`.
   */
  test.describe('AM-009 create organization and sales order', () => {
    test.describe.configure({ timeout: 300_000 });

    test.beforeEach(async ({ csiLoginPage }) => {
      if (!process.env.CSI_TEST_PASSWORD?.length) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
      await csiLoginPage.expectOnHome();
    });

    test('AM-009', async ({ csiAccountManagementPage, csiSalesAndBillingPage }) => {
      const profile = buildAm009OrganizationProfile(csiTestEmail());
      const salesOrderDropdownMaxAttempts = 4;
      const salesOrderDatePickerMaxAttempts = 4;
      const duration = csiSalesOrderDuration();
      const unitsPerModule = csiSalesOrderUnitsPerModule();

      await csiAccountManagementPage.openOrganizationList();
      await csiAccountManagementPage.startAddOrganization();
      await csiAccountManagementPage.fillNewOrganizationAm009({
        firstName: profile.firstName,
        lastName: profile.lastName,
        ownerEmail: profile.ownerEmail,
        phoneNumber: profile.phoneNumber,
        organizationName: profile.organizationName,
        category: profile.category,
        size: profile.size,
        plan: profile.plan,
      });
      await csiAccountManagementPage.submitCreateOrganization();
      await csiAccountManagementPage.expectOrganizationRecordCreated();
      await csiAccountManagementPage.dismissOrganizationRecordCreatedNotice();
      writeLastUserNumber(profile.suffix);

      await csiSalesAndBillingPage.openSalesAndBilling();
      await csiSalesAndBillingPage.openSalesOrder();
      await csiSalesAndBillingPage.clickAddSalesOrder();
      await csiSalesAndBillingPage.selectSalesOrderClientByOrganizationNameForAm009(
        profile.organizationName,
        salesOrderDropdownMaxAttempts,
      );
      await csiSalesAndBillingPage.selectFirstOptionByTriggerText(
        'Select Sales Partner',
        salesOrderDropdownMaxAttempts,
      );
      await csiSalesAndBillingPage.selectFirstBillingPartnerOptionForAm009(salesOrderDropdownMaxAttempts);
      await csiSalesAndBillingPage.selectFirstOptionByTriggerText(
        'Select Package Type',
        salesOrderDropdownMaxAttempts,
      );

      await csiSalesAndBillingPage.pickTodaySalesStartDate(salesOrderDatePickerMaxAttempts);
      await csiSalesAndBillingPage.fillSalesOrderDuration(duration);
      await csiSalesAndBillingPage.selectFirstBillingMode();
      await csiSalesAndBillingPage.selectAllSalesOrderModulesAndSetUnits(unitsPerModule);
      await csiSalesAndBillingPage.continueSalesOrderToReview();
      await csiSalesAndBillingPage.submitPackage();
      await csiSalesAndBillingPage.expectSalesOrderCreated();
    });
  });

  /**
   * AM-010: create organization only — same data-generation as AM-009 but stops after the
   * "Record created." success notice (recorded-steps/AccountManagement/AM-010.txt).
   * Uses `CSI_TEST_*` credentials and `storage/userCounter.json`.
   */
  test.describe('AM-010 create organization', () => {
    test.describe.configure({ timeout: 180_000 });

    test.beforeEach(async ({ csiLoginPage }) => {
      if (!process.env.CSI_TEST_PASSWORD?.length) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
      await csiLoginPage.expectOnHome();
    });

    test('AM-010', async ({ csiAccountManagementPage }) => {
      const profile = buildAm009OrganizationProfile(csiTestEmail());

      await csiAccountManagementPage.openOrganizationList();
      await csiAccountManagementPage.startAddOrganization();
      await csiAccountManagementPage.fillNewOrganizationAm009({
        firstName: profile.firstName,
        lastName: profile.lastName,
        ownerEmail: profile.ownerEmail,
        phoneNumber: profile.phoneNumber,
        organizationName: profile.organizationName,
        category: profile.category,
        size: profile.size,
        plan: profile.plan,
      });
      await csiAccountManagementPage.submitCreateOrganization();
      await csiAccountManagementPage.expectOrganizationRecordCreated();
      await csiAccountManagementPage.dismissOrganizationRecordCreatedNotice();
      writeLastUserNumber(profile.suffix);
    });
  });

  /**
   * AM-063: Org A system owner user list must not overlap Org B emails (recorded-steps/AccountManagement/AM-063.txt).
   */
  test.describe('AM-063 OrgA system owner cannot see OrgB users', () => {
    test.describe.configure({ timeout: 600_000 });

    test('AM-063', async ({ csiLoginPage, csiAccountManagementPage }) => {
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

      await csiAccountManagementPage.openUserListWithSearchReady();
      const orgAEmails = await csiAccountManagementPage.collectAllUserListEmailsAm063();
      writeAm063UserEmailsSnapshot('orgA', orgAEmails);

      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiOrgBSystemOwnerTestEmail(),
        csiOrgBSystemOwnerTestPassword(),
      );
      await csiLoginPage.expectOnAccountManagement();

      await csiAccountManagementPage.openUserListWithSearchReady();
      const orgBEmails = await csiAccountManagementPage.collectAllUserListEmailsAm063();
      writeAm063UserEmailsSnapshot('orgB', orgBEmails);

      expectNoEmailIntersection(orgAEmails, orgBEmails);
    });
  });

  test.describe('AM-050 user deactivation and reactivation', () => {
    test.describe.configure({ timeout: 180_000 });

    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_ORG_TEST_PASSWORD?.length ||
        !process.env.CSI_ORG_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_ORG_USER_TEST_PASSWORD?.length ||
        !process.env.CSI_ORG_USER_TEST_EMAIL?.trim()?.length
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

    test('AM-050', async ({ page, csiLoginPage, csiAccountManagementPage }) => {
      const orgEmail = csiOrgTestEmail();
      const orgPassword = csiOrgTestPassword();
      const targetEmail = csiOrgUserTestEmail();
      const targetPassword = csiOrgUserTestPassword();

      await csiAccountManagementPage.openUserListWithSearchReady();
      await csiAccountManagementPage.searchUserListByEmail(targetEmail);
      await csiAccountManagementPage.expectUserGridShowsEmail(targetEmail);

      await csiAccountManagementPage.setUserInactiveViaUserListActions(targetEmail);
      await csiAccountManagementPage.expectUserListRowStatus(targetEmail, 'Inactive');

      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();
      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(targetEmail, targetPassword);
      await expect(page.getByText('Your account is inactive.', { exact: true })).toBeVisible({
        timeout: 60_000,
      });

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(orgEmail, orgPassword);
      await csiLoginPage.expectOnHome();

      await csiAccountManagementPage.openUserListWithSearchReady();
      await csiAccountManagementPage.searchUserListByEmail(targetEmail);
      await csiAccountManagementPage.expectUserGridShowsEmail(targetEmail);

      await csiAccountManagementPage.setUserActiveViaUserListActions(targetEmail);
      await csiAccountManagementPage.expectUserListRowStatus(targetEmail, 'Active');
    });
  });

  /**
   * AM-052: super admin (CSI_TEST_EMAIL) deactivates a user from any org, verifies the
   * "Your account is inactive." block screen, then reactivates the user.
   * Same flow as AM-050 but performed by a platform-level super admin who can act across
   * all orgs (recorded-steps/AccountManagement/AM-052.txt).
   * Target account: CSI_ORG_USER_TEST_EMAIL (keep Active when not running the test).
   */
  test.describe('AM-052 super admin deactivates user in any org', () => {
    test.describe.configure({ timeout: 180_000 });

    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_TEST_PASSWORD?.length ||
        !process.env.CSI_ORG_USER_TEST_PASSWORD?.length ||
        !process.env.CSI_ORG_USER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
      await csiLoginPage.expectOnHome();
    });

    test('AM-052', async ({ page, csiLoginPage, csiAccountManagementPage }) => {
      const adminEmail = csiTestEmail();
      const adminPassword = csiTestPassword();
      const targetEmail = csiOrgUserTestEmail();
      const targetPassword = csiOrgUserTestPassword();

      await csiAccountManagementPage.openUserListWithSearchReady();
      await csiAccountManagementPage.searchUserListByEmail(targetEmail);
      await csiAccountManagementPage.expectUserGridShowsEmail(targetEmail);

      await csiAccountManagementPage.setUserInactiveViaUserListActions(targetEmail);
      await csiAccountManagementPage.expectUserListRowStatus(targetEmail, 'Inactive');

      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();
      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(targetEmail, targetPassword);
      await expect(page.getByText('Your account is inactive.', { exact: true })).toBeVisible({
        timeout: 60_000,
      });

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(adminEmail, adminPassword);
      await csiLoginPage.expectOnHome();

      await csiAccountManagementPage.openUserListWithSearchReady();
      await csiAccountManagementPage.searchUserListByEmail(targetEmail);
      await csiAccountManagementPage.expectUserGridShowsEmail(targetEmail);

      await csiAccountManagementPage.setUserActiveViaUserListActions(targetEmail);
      await csiAccountManagementPage.expectUserListRowStatus(targetEmail, 'Active');
    });
  });

  /**
   * AM-054: reverse of AM-052 — super admin (CSI_TEST_EMAIL) reactivates an initially-inactive
   * user, verifies that user can now log in successfully, then deactivates the user again
   * (recorded-steps/AccountManagement/AM-054.txt).
   * Target account: CSI_ORG_INACTIVE_USER_TEST_EMAIL (keep Inactive when not running the test).
   */
  test.describe('AM-054 super admin reactivates user', () => {
    test.describe.configure({ timeout: 180_000 });

    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_TEST_PASSWORD?.length ||
        !process.env.CSI_ORG_INACTIVE_USER_TEST_PASSWORD?.length ||
        !process.env.CSI_ORG_INACTIVE_USER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
      await csiLoginPage.expectOnHome();
    });

    test('AM-054', async ({ csiLoginPage, csiAccountManagementPage }) => {
      const adminEmail = csiTestEmail();
      const adminPassword = csiTestPassword();
      const targetEmail = csiOrgInactiveUserTestEmail();
      const targetPassword = csiOrgInactiveUserTestPassword();

      // Phase 1 — super admin sets the initially-inactive user to Active
      await csiAccountManagementPage.openUserListWithSearchReady();
      await csiAccountManagementPage.searchUserListByEmail(targetEmail);
      await csiAccountManagementPage.expectUserGridShowsEmail(targetEmail);

      await csiAccountManagementPage.setUserActiveViaUserListActions(targetEmail);
      await csiAccountManagementPage.expectUserListRowStatus(targetEmail, 'Active');

      // Phase 2 — verify the target user can now log in successfully (no inactive error)
      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();
      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(targetEmail, targetPassword);
      await csiLoginPage.expectOnHome();

      // Phase 3 — log out the target user and re-login as super admin to revert the status
      // (successful login means gotoLogin would redirect to home, so logout via header first)
      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();
      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(adminEmail, adminPassword);
      await csiLoginPage.expectOnHome();

      // Phase 4 — super admin sets the user back to Inactive (restore pre-test state)
      await csiAccountManagementPage.openUserListWithSearchReady();
      await csiAccountManagementPage.searchUserListByEmail(targetEmail);
      await csiAccountManagementPage.expectUserGridShowsEmail(targetEmail);

      await csiAccountManagementPage.setUserInactiveViaUserListActions(targetEmail);
      await csiAccountManagementPage.expectUserListRowStatus(targetEmail, 'Inactive');
    });
  });

  /**
   * AM-061: a user changes their own password from the Security tab of UserProfile, then
   * verifies that the new password is accepted on the next login.
   * The test account has two known passwords (PASSWORD_1 / PASSWORD_2) that alternate after
   * each successful run. The test probes PASSWORD_1 first; if the login returns
   * "Invalid username or password." it falls back to PASSWORD_2 and swaps the roles.
   * (recorded-steps/AccountManagement/AM-061.txt)
   */
  test.describe('AM-061 change password while logged in', () => {
    test.describe.configure({ timeout: 120_000 });

    // No login in beforeEach — the alternating-password logic must run in the test body
    // to determine which password is currently active before navigating to the app.
    test.beforeEach(async () => {
      if (
        !process.env.CSI_ORG_PASSWORD_CHANGE_USER_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_ORG_PASSWORD_CHANGE_USER_TEST_PASSWORD_1?.length ||
        !process.env.CSI_ORG_PASSWORD_CHANGE_USER_TEST_PASSWORD_2?.length
      ) {
        test.skip();
        return;
      }
    });

    test('AM-061', async ({ csiLoginPage, csiAccountManagementPage }) => {
      const userEmail = csiOrgPasswordChangeUserTestEmail();
      const password1 = csiOrgPasswordChangeUserTestPassword1();
      const password2 = csiOrgPasswordChangeUserTestPassword2();

      // Probe which password is currently active by attempting password1.
      // If the login page returns "Invalid username or password.", password1 is not the active
      // one — go directly to the login page and retry with password2 (no expectOnHome between
      // the failed attempt and the retry).
      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(userEmail, password1);

      let currentPassword: string;
      let newPassword: string;

      if (await csiLoginPage.isInvalidCredentialsVisible()) {
        // password1 rejected — go straight to login and use password2
        currentPassword = password2;
        newPassword = password1;
        await csiLoginPage.gotoLogin();
        await csiLoginPage.signInWithEmailAndPassword(userEmail, password2);
      } else {
        currentPassword = password1;
        newPassword = password2;
      }

      await csiLoginPage.expectOnHome();

      // Navigate to UserProfile → Security tab and perform the password change
      await csiAccountManagementPage.openUserProfileSecurityTab();
      await csiAccountManagementPage.fillChangePasswordFormAm061(currentPassword, newPassword);
      await csiAccountManagementPage.submitChangePasswordAm061();
      await csiAccountManagementPage.expectPasswordChangedSuccessAm061();

      // Verify the new password is accepted on the next login
      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();
      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(userEmail, newPassword);
      await csiLoginPage.expectOnHome();
    });
  });

  /**
   * AM-062: same flow as AM-061 but submits a wrong current password; expects "Invalid password"
   * and must not change the account password (recorded-steps/AccountManagement/AM-062.txt).
   */
  test.describe('AM-062 wrong current password', () => {
    test.describe.configure({ timeout: 120_000 });

    test.beforeEach(async () => {
      if (
        !process.env.CSI_ORG_PASSWORD_CHANGE_USER_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_ORG_PASSWORD_CHANGE_USER_TEST_PASSWORD_1?.length ||
        !process.env.CSI_ORG_PASSWORD_CHANGE_USER_TEST_PASSWORD_2?.length
      ) {
        test.skip();
        return;
      }
    });

    test('AM-062', async ({ csiLoginPage, csiAccountManagementPage }) => {
      const userEmail = csiOrgPasswordChangeUserTestEmail();
      const password1 = csiOrgPasswordChangeUserTestPassword1();
      const password2 = csiOrgPasswordChangeUserTestPassword2();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(userEmail, password1);

      let currentPassword: string;
      let newPassword: string;

      if (await csiLoginPage.isInvalidCredentialsVisible()) {
        currentPassword = password2;
        newPassword = password1;
        await csiLoginPage.gotoLogin();
        await csiLoginPage.signInWithEmailAndPassword(userEmail, password2);
      } else {
        currentPassword = password1;
        newPassword = password2;
      }

      await csiLoginPage.expectOnHome();

      const wrongCurrentPassword = buildWrongCurrentPasswordAm062(currentPassword);

      await csiAccountManagementPage.openUserProfileSecurityTab();
      await csiAccountManagementPage.fillChangePasswordFormAm061(
        wrongCurrentPassword,
        newPassword,
      );
      await csiAccountManagementPage.submitChangePasswordAm061();
      await csiAccountManagementPage.expectInvalidPasswordErrorAm062();
    });
  });

  /**
   * AM-033: per-role module URL access for `CSI_USER_TEST_*` (recorded-steps/AccountManagement/AM-033.txt).
   */
  test.describe('AM-033 role module access', () => {
    test.describe.configure({ timeout: 900_000 });

    test('AM-033', async ({ csiLoginPage, csiAccountManagementPage }) => {
      if (
        !process.env.CSI_TEST_PASSWORD?.length ||
        !process.env.CSI_USER_TEST_PASSWORD?.length ||
        !process.env.CSI_USER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      const subjectEmail = csiUserTestEmail();
      const subjectPassword = csiUserTestPassword();
      const adminEmail = csiTestEmail();
      const adminPassword = csiTestPassword();
      const session: { loggedInAs: Am033LoggedInAs } = { loggedInAs: 'none' };
      let am033FinishedSuccessfully = false;

      try {
        await csiLoginPage.gotoLogin();
        await csiLoginPage.signInWithEmailAndPassword(subjectEmail, subjectPassword);
        await csiLoginPage.expectAuthenticatedAppSession();
        session.loggedInAs = 'subject';

        for (const modulePath of am033AllModulePaths()) {
          await csiAccountManagementPage.openModulePathAndExpectPermissionDenied(modulePath);
        }

        await csiLoginPage.gotoHomeAndLogoutForAm033();
        session.loggedInAs = 'none';

        for (const role of AM033_ROLE_MODULE_ACCESS) {
          await csiLoginPage.gotoLogin();
          await csiLoginPage.signInWithEmailAndPassword(adminEmail, adminPassword);
          await csiLoginPage.expectOnHome();
          session.loggedInAs = 'admin';

          await csiAccountManagementPage.assignExclusiveRoleToUserOnUserList(subjectEmail, role.roleName);

          await csiLoginPage.gotoHomeAndLogoutForAm033();
          session.loggedInAs = 'none';

          await csiLoginPage.gotoLogin();
          await csiLoginPage.signInWithEmailAndPassword(subjectEmail, subjectPassword);
          await csiLoginPage.expectAuthenticatedAppSession();
          session.loggedInAs = 'subject';

          for (const modulePath of role.modulePaths) {
            await csiAccountManagementPage.openModulePathAndExpectAccessible(modulePath);
          }

          await csiLoginPage.gotoHomeAndLogoutForAm033();
          session.loggedInAs = 'none';
        }

        await csiLoginPage.gotoLogin();
        await csiLoginPage.signInWithEmailAndPassword(adminEmail, adminPassword);
        await csiLoginPage.expectOnHome();
        session.loggedInAs = 'admin';

        await csiAccountManagementPage.removeAllRoleAssignmentsFromUser(subjectEmail);

        await csiLoginPage.gotoHomeAndLogoutForAm033();
        session.loggedInAs = 'none';

        am033FinishedSuccessfully = true;
      } finally {
        if (am033FinishedSuccessfully) {
          return;
        }
        try {
          await cleanupAm033RoleAssignmentsOnFailure(csiLoginPage, csiAccountManagementPage, {
            subjectEmail,
            session,
            adminEmail,
            adminPassword,
          });
        } catch (cleanupError) {
          console.error(
            `[AM-033] Failure cleanup could not clear roles for ${subjectEmail} (loggedInAs=${session.loggedInAs}):`,
            cleanupError,
          );
        }
      }
    });
  });
});
