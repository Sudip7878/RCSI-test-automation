import { expect, test } from '../../../fixtures/csi/testSetup';
import path from 'node:path';

import {
  buildBulkUsersFromSystemOwnerEmail,
  writeBulkUsersToTemplateXlsx,
} from '../../../utils/csi/accountManagementBulkUpload';
import {
  csiIncidentReporterTestEmail,
  csiIncidentReporterTestPassword,
  csiOrgTestEmail,
  csiOrgTestPassword,
  csiSystemOwnerTestEmail,
  csiSystemOwnerTestPassword,
} from '../../../utils/csi/credentials';
import {
  csiAccountManagementEmailLocalPart,
  csiAccountManagementFirstName,
  csiAccountManagementLastName,
} from '../../../utils/csi/accountManagementTestData';

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
});
