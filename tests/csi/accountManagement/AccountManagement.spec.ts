import { expect, test } from '../../../fixtures/csi/testSetup';
import path from 'node:path';

import {
  buildBulkUsersFromSystemOwnerEmail,
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
import { buildAm009OrganizationProfile } from '../../../utils/csi/am009OrganizationTestData';
import {
  csiAccountManagementEmailLocalPart,
  csiAccountManagementFirstName,
  csiAccountManagementLastName,
} from '../../../utils/csi/accountManagementTestData';
import { csiTestEmail, csiTestPassword, csiUserTestEmail, csiUserTestPassword } from '../../../utils/csi/credentials';
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

  test.describe('manual add user', () => {
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

    test('manual add user', async ({
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
