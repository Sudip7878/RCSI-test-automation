import * as fs from 'node:fs';
import { test } from '../../../fixtures/csi/testSetup';
import {
  csiIncidentReporterTestEmail,
  csiIncidentReporterTestPassword,
  csiOrgAIncidentReporterTestEmail,
  csiOrgAIncidentReporterTestPassword,
  csiOrgBIncidentReporterTestEmail,
  csiOrgBIncidentReporterTestPassword,
  csiPenetrationTesterTestEmail,
  csiPenetrationTesterTestPassword,
  csiRicohOrgOwnerTestEmail,
  csiRicohOrgOwnerTestPassword,
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
  csiOrgAIncidentReportId,
  csiOrgBIncidentReportId,
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

  test.describe('IR-016 — penetration tester Incident Response Blackpanda auth', () => {
    test.describe.configure({ timeout: 180_000 });

    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_PENETRATION_TESTER_TEST_PASSWORD?.length ||
        !process.env.CSI_PENETRATION_TESTER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiPenetrationTesterTestEmail(),
        csiPenetrationTesterTestPassword(),
      );
      await csiLoginPage.expectOnAccountManagement();
    });

    test('IR-016', async ({ csiIncidentReportPage }) => {
      await csiIncidentReportPage.clickIncidentResponseAndExpectBlackpandaAuthRedirect();
    });
  });

  test.describe('IR-017 — Ricoh org owner Incident Response redirects to external domain with no phone field', () => {
    test.describe.configure({ timeout: 180_000 });

    // Uses CSI_RICOH_ORG_OWNER_TEST_* credentials — different account from the IR-016 beforeEach.
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_RICOH_ORG_OWNER_TEST_PASSWORD?.length ||
        !process.env.CSI_RICOH_ORG_OWNER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiRicohOrgOwnerTestEmail(),
        csiRicohOrgOwnerTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('IR-017', async ({ csiIncidentReportPage }) => {
      await csiIncidentReportPage.clickIncidentResponseAndExpectBlackpandaAuthRedirectNoPhoneNumber();
    });
  });
});

test.describe('CSI · Incident Report — org incident report isolation', () => {
  test.describe.configure({ timeout: 120_000 });

  /**
   * IR-019: Org A reporter cannot open Org B incident detail and vice versa.
   * Ids in `data/csi/incidentReport.json` (recorded-steps/IncidentReport/IR-019.txt).
   */
  test.describe('IR-019 cross-org IncidentReportDetail access denied', () => {
    test('IR-019', async ({ csiLoginPage, csiIncidentReportPage }) => {
      if (
        !process.env.CSI_ORG_A_INCIDNET_REPORTER_TEST_PASSWORD?.length ||
        !process.env.CSI_ORG_A_INCIDNET_REPORTER_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_ORG_B_INCIDNET_REPORTER_TEST_PASSWORD?.length ||
        !process.env.CSI_ORG_B_INCIDNET_REPORTER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiOrgAIncidentReporterTestEmail(),
        csiOrgAIncidentReporterTestPassword(),
      );
      await csiLoginPage.expectOnHome();

      await csiIncidentReportPage.openIncidentReportDetail(csiOrgBIncidentReportId());
      await csiIncidentReportPage.expectIncidentReportDetailNoPermissionMessage();

      await csiLoginPage.gotoHome();
      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiOrgBIncidentReporterTestEmail(),
        csiOrgBIncidentReporterTestPassword(),
      );
      await csiLoginPage.expectOnHome();

      await csiIncidentReportPage.openIncidentReportDetail(csiOrgAIncidentReportId());
      await csiIncidentReportPage.expectIncidentReportDetailNoPermissionMessage();
    });
  });
});
