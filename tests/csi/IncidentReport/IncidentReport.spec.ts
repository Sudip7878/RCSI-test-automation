import * as fs from 'node:fs';
import { test } from '../../../fixtures/csi/testSetup';
import {
  csiIncidentReporterTestEmail,
  csiIncidentReporterTestPassword,
  csiSystemOwnerTestEmail,
  csiSystemOwnerTestPassword,
  csiTestEmail,
  csiTestPassword,
} from '../../../utils/csi/credentials';
import {
  csiIncidentAffectedSystems,
  csiIncidentCommentBody,
  csiIncidentCommentDocumentPdfPath,
  csiIncidentCommentReplyBody,
  csiIncidentCommentUploadedPdfAliasName,
  csiIncidentDescription,
  csiIncidentHandlerDisplayName,
  CSI_INCIDENT_STATUS_TRANSITIONS_IR013,
  parseTestIncidentDescriptionSuffix,
} from '../../../utils/csi/incidentReportTestData';

test.describe('CSI · Incident Report', () => {
  test.describe.configure({ timeout: 180_000 });

  test.describe('IR-005 — reporter dashboard', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_INCIDENT_REPORTER_TEST_PASSWORD?.length ||
        !process.env.CSI_INCIDENT_REPORTER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiIncidentReporterTestEmail(),
        csiIncidentReporterTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('IR-005', async ({ csiIncidentReportPage }) => {
      const description = csiIncidentDescription();
      const affected = csiIncidentAffectedSystems();

      await csiIncidentReportPage.openDashboard();
      await csiIncidentReportPage.startNewIncidentForm();
      await csiIncidentReportPage.fillMandatoryDropdowns();
      await csiIncidentReportPage.fillDescriptionAndAffectedSystems(description, affected);
      await csiIncidentReportPage.saveUntilSuccessVisible();
    });
  });

  test.describe('IR-001 — assign Incident Reporter role', () => {
    test('IR-001', async ({
      csiLoginPage,
      csiAccountManagementPage,
      csiIncidentReportPage,
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

      const reporterEmail = csiIncidentReporterTestEmail();
      const reporterPassword = csiIncidentReporterTestPassword();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiSystemOwnerTestEmail(),
        csiSystemOwnerTestPassword(),
      );
      await csiLoginPage.expectOnHome();

      await csiAccountManagementPage.openUserListWithSearchReady();
      await csiAccountManagementPage.searchUserListByEmail(reporterEmail);
      await csiAccountManagementPage.expectUserGridShowsEmail(reporterEmail);
      await csiAccountManagementPage.openUserRowActionsMenu(reporterEmail);
      await csiAccountManagementPage.openChangeRoleFromActionsMenu();
      await csiAccountManagementPage.ensureIncidentReporterRoleChecked();
      await csiAccountManagementPage.confirmRoleChange();
      await csiAccountManagementPage.expectRecordUpdatedSuccess();

      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();
      await csiLoginPage.gotoLogin();

      await csiLoginPage.signInWithEmailAndPassword(reporterEmail, reporterPassword);
      await csiLoginPage.expectOnHome();

      await csiIncidentReportPage.openIncidentResponseFromSidebar();
      await csiIncidentReportPage.openDashboard();
    });
  });

  test.describe('IR-011 — handler assignment and reporter verification', () => {
    test.describe.configure({ timeout: 300_000 });

    test('IR-011', async ({ csiLoginPage, csiIncidentReportPage }) => {
      if (
        !process.env.CSI_INCIDENT_REPORTER_TEST_PASSWORD?.length ||
        !process.env.CSI_INCIDENT_REPORTER_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_TEST_PASSWORD?.length
      ) {
        test.skip();
        return;
      }

      const reporterEmail = csiIncidentReporterTestEmail();
      const reporterPassword = csiIncidentReporterTestPassword();
      const description = csiIncidentDescription();
      const affected = csiIncidentAffectedSystems();
      const handlerDisplayName = csiIncidentHandlerDisplayName();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(reporterEmail, reporterPassword);
      await csiLoginPage.expectOnHome();

      const caseId = await csiIncidentReportPage.createIncidentReportAndCaptureCaseId(description, affected);

      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();
      await csiLoginPage.gotoLogin();

      await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
      await csiLoginPage.expectOnHome();
      await csiIncidentReportPage.openDashboard();
      await csiIncidentReportPage.openIncidentDetailsForCaseId(caseId);
      await csiIncidentReportPage.assignIncidentHandlerFromNotAssignedByDisplayName(handlerDisplayName);
      await csiIncidentReportPage.transitionIncidentStatusOpenToUnderAssessment();

      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();
      await csiLoginPage.gotoLogin();

      await csiLoginPage.signInWithEmailAndPassword(reporterEmail, reporterPassword);
      await csiLoginPage.expectOnHome();
      await csiIncidentReportPage.expectDashboardIncidentHandlerAndStatus(
        caseId,
        handlerDisplayName,
        'UNDER ASSESMENT',
      );
    });
  });

  test.describe('IR-012 — comment thread, PDF alias upload, download, reply', () => {
    test.describe.configure({ timeout: 300_000 });

    test('IR-012', async ({ csiLoginPage, csiIncidentReportPage }) => {
      if (
        !process.env.CSI_INCIDENT_REPORTER_TEST_PASSWORD?.length ||
        !process.env.CSI_INCIDENT_REPORTER_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_TEST_PASSWORD?.length
      ) {
        test.skip();
        return;
      }

      const pdfPath = csiIncidentCommentDocumentPdfPath();
      if (!fs.existsSync(pdfPath)) {
        test.skip();
        return;
      }

      const reporterEmail = csiIncidentReporterTestEmail();
      const reporterPassword = csiIncidentReporterTestPassword();
      const description = csiIncidentDescription();
      const affected = csiIncidentAffectedSystems();
      const suffix = parseTestIncidentDescriptionSuffix(description);
      const aliasName = csiIncidentCommentUploadedPdfAliasName(suffix);
      const commentText = csiIncidentCommentBody(suffix);
      const replyText = csiIncidentCommentReplyBody(suffix);

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(reporterEmail, reporterPassword);
      await csiLoginPage.expectOnHome();

      const caseId = await csiIncidentReportPage.createIncidentReportAndCaptureCaseId(description, affected);

      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();
      await csiLoginPage.gotoLogin();

      await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
      await csiLoginPage.expectOnHome();
      await csiIncidentReportPage.openDashboard();
      await csiIncidentReportPage.openIncidentDetailsForCaseId(caseId);
      await csiIncidentReportPage.postDetailCommentWithUploadedPdfAlias({
        commentText,
        aliasPdfFileName: aliasName,
        sourcePdfAbsolutePath: pdfPath,
      });

      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();
      await csiLoginPage.gotoLogin();

      await csiLoginPage.signInWithEmailAndPassword(reporterEmail, reporterPassword);
      await csiLoginPage.expectOnHome();
      await csiIncidentReportPage.openDashboard();
      await csiIncidentReportPage.openIncidentDetailsForCaseId(caseId);
      await csiIncidentReportPage.expectDetailViewShowsCommentText(commentText);
      await csiIncidentReportPage.expectDetailCommentAttachmentAliasVisible(aliasName);
      await csiIncidentReportPage.expectCommentAttachmentDownloadStarted(aliasName);
      await csiIncidentReportPage.postDetailCommentReply(replyText);

      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();
      await csiLoginPage.gotoLogin();

      await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
      await csiLoginPage.expectOnHome();
      await csiIncidentReportPage.openDashboard();
      await csiIncidentReportPage.openIncidentDetailsForCaseId(caseId);
      await csiIncidentReportPage.expectDetailViewShowsCommentText(replyText);
    });
  });

  test.describe('IR-013 — ticket status Open through Closed', () => {
    test.describe.configure({ timeout: 420_000 });

    test('IR-013', async ({ csiLoginPage, csiIncidentReportPage }) => {
      if (
        !process.env.CSI_INCIDENT_REPORTER_TEST_PASSWORD?.length ||
        !process.env.CSI_INCIDENT_REPORTER_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_TEST_PASSWORD?.length
      ) {
        test.skip();
        return;
      }

      const reporterEmail = csiIncidentReporterTestEmail();
      const reporterPassword = csiIncidentReporterTestPassword();
      const description = csiIncidentDescription();
      const affected = csiIncidentAffectedSystems();
      void parseTestIncidentDescriptionSuffix(description);

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(reporterEmail, reporterPassword);
      await csiLoginPage.expectOnHome();

      const caseId = await csiIncidentReportPage.createIncidentReportAndCaptureCaseId(description, affected);

      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();
      await csiLoginPage.gotoLogin();

      for (const step of CSI_INCIDENT_STATUS_TRANSITIONS_IR013) {
        await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
        await csiLoginPage.expectOnHome();
        await csiIncidentReportPage.openDashboard();
        await csiIncidentReportPage.openIncidentDetailsForCaseId(caseId);
        await csiIncidentReportPage.transitionIncidentDetailStatusByPicker(
          step.currentChipText,
          step.nextPickerLabel,
        );
        await csiLoginPage.logoutViaHeaderMenu();
        await csiLoginPage.expectEmailStepVisible();
        await csiLoginPage.gotoLogin();

        await csiLoginPage.signInWithEmailAndPassword(reporterEmail, reporterPassword);
        await csiLoginPage.expectOnHome();
        await csiIncidentReportPage.expectDashboardIncidentStatus(caseId, step.dashboardStatusContains);
        await csiLoginPage.logoutViaHeaderMenu();
        await csiLoginPage.expectEmailStepVisible();
        await csiLoginPage.gotoLogin();
      }
    });
  });
});
