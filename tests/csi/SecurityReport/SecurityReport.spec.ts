import * as fs from 'node:fs';
import { test } from '../../../fixtures/csi/testSetup';
import {
  csiSecurityReportAdminTestEmail,
  csiSecurityReportAdminTestPassword,
  csiTestEmail,
  csiTestPassword,
} from '../../../utils/csi/credentials';
import {
  csiOrgASystemOwnerTestEmail,
  csiOrgASystemOwnerTestPassword,
  csiOrgBSystemOwnerTestEmail,
  csiOrgBSystemOwnerTestPassword,
} from '../../../utils/csi/credentials';
import {
  CSI_ATTACK_SURFACE_REPORT_FILENAME,
  csiAttackSurfaceReportPdfPath,
  csiDarkwebReportTest1PdfPath,
  csiDarkwebReportTest2PdfPath,
  csiOrgADarkWebRequestId,
  csiOrgBDarkWebRequestId,
} from '../../../utils/csi/securityReportTestData';

test.describe('CSI · Security Report', () => {
  test.describe.configure({ timeout: 300_000 });

  test.describe('SR-014 — darkweb report download from request history', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_SECURITY_REPORT_ADMIN_PASSWORD?.length ||
        !process.env.CSI_SECURITY_REPORT_ADMIN_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiSecurityReportAdminTestEmail(),
        csiSecurityReportAdminTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('SR-014', async ({ csiSecurityReportPage }) => {
      await csiSecurityReportPage.openRequestHistory();
      await csiSecurityReportPage.openFirstCompletedRequestHistoryDetails();
      await csiSecurityReportPage.expectDarkwebReportSummaryView();
      await csiSecurityReportPage.exportAttackSurfaceReportAndExpectDownload();
    });
  });

  test.describe('SR-001 — attack surface dashboard view', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_SECURITY_REPORT_ADMIN_PASSWORD?.length ||
        !process.env.CSI_SECURITY_REPORT_ADMIN_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiSecurityReportAdminTestEmail(),
        csiSecurityReportAdminTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('SR-001', async ({ csiSecurityReportPage }) => {
      await csiSecurityReportPage.openAttackSurface();
      await csiSecurityReportPage.openFirstCompletedAttackSurfaceReportDetails();
      await csiSecurityReportPage.expectAttackSurfaceReportDashboardView();
      await csiSecurityReportPage.exportAttackSurfaceReportAndExpectDownload();
    });
  });

  /** SR-005: one end-to-end flow — security-report admin requests, then CSI_TEST approves with fixture PDF. */
  test('SR-005 — attack surface scan request', async ({ csiSecurityReportPage, csiLoginPage }) => {
    if (
      !process.env.CSI_SECURITY_REPORT_ADMIN_PASSWORD?.length ||
      !process.env.CSI_SECURITY_REPORT_ADMIN_EMAIL?.trim()?.length
    ) {
      test.skip();
      return;
    }

    const pdfPath = csiAttackSurfaceReportPdfPath();
    test.skip(!fs.existsSync(pdfPath), `Missing fixture PDF: ${pdfPath}`);

    await csiLoginPage.gotoLogin();
    await csiLoginPage.signInWithEmailAndPassword(
      csiSecurityReportAdminTestEmail(),
      csiSecurityReportAdminTestPassword(),
    );
    await csiLoginPage.expectOnHome();

    await csiSecurityReportPage.openAttackSurface();
    await csiSecurityReportPage.submitNewAttackSurfaceRequestFlow();
    await csiLoginPage.logoutViaHeaderMenu();
    await csiLoginPage.expectEmailStepVisible();

    await csiLoginPage.gotoLogin();
    await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
    await csiLoginPage.expectOnHome();

    await csiSecurityReportPage.openAttackSurface();
    await csiSecurityReportPage.tryClickClearAfterGridSettled();
    await csiSecurityReportPage.openFirstPendingAttackSurfaceRequestDetails();
    await csiSecurityReportPage.approveRequestedDataWithUploadedPdf(pdfPath, CSI_ATTACK_SURFACE_REPORT_FILENAME);
  });

  test.describe('SR-010 — dark web scan request', () => {
    test('SR-010 and SR-011', async ({ csiSecurityReportPage, csiLoginPage }) => {
      if (
        !process.env.CSI_SECURITY_REPORT_ADMIN_PASSWORD?.length ||
        !process.env.CSI_SECURITY_REPORT_ADMIN_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      const darkwebPdf1 = csiDarkwebReportTest1PdfPath();
      const darkwebPdf2 = csiDarkwebReportTest2PdfPath();
      test.skip(
        !fs.existsSync(darkwebPdf1) || !fs.existsSync(darkwebPdf2),
        `Missing darkweb fixture PDF(s): ${darkwebPdf1}, ${darkwebPdf2}`,
      );

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiSecurityReportAdminTestEmail(),
        csiSecurityReportAdminTestPassword(),
      );
      await csiLoginPage.expectOnHome();

      // SR-010: step 1
      await csiSecurityReportPage.openRequestHistoryForDarkwebRequest();
      await csiSecurityReportPage.submitNewDarkwebRequestFlow();
      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();

      // SR-011: step 2
      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
      await csiLoginPage.expectOnHome();

      await csiSecurityReportPage.openRequestHistory();
      await csiSecurityReportPage.tryClickClearAfterRequestHistoryGridSettled();
      await csiSecurityReportPage.openFirstPendingRequestHistoryDetails();
      await csiSecurityReportPage.submitDarkwebRequestedDataWithUploadedPdfs([darkwebPdf1, darkwebPdf2]);
      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiSecurityReportAdminTestEmail(),
        csiSecurityReportAdminTestPassword(),
      );
      await csiLoginPage.expectOnHome();

      await csiSecurityReportPage.openRequestHistory();
      await csiSecurityReportPage.expectFirstRequestHistoryRowStatus('Completed');
    });
  });
});

test.describe('CSI · Security Report — org dark web report isolation', () => {
  test.describe.configure({ timeout: 120_000 });

  /**
   * SR-009: Org A owner cannot open Org B dark web report and vice versa.
   * Request ids in `data/csi/securityReport.json` (recorded-steps/SecurityReport/SR-009.txt).
   */
  test.describe('SR-009 cross-org DarkwebReport access denied', () => {
    test('SR-009', async ({ csiLoginPage, csiSecurityReportPage }) => {
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

      await csiSecurityReportPage.openDarkwebReport(csiOrgBDarkWebRequestId());
      await csiSecurityReportPage.expectDarkwebReportNoPermissionMessage();

      await csiLoginPage.gotoHome();
      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiOrgBSystemOwnerTestEmail(),
        csiOrgBSystemOwnerTestPassword(),
      );
      await csiLoginPage.expectOnHome();

      await csiSecurityReportPage.openDarkwebReport(csiOrgADarkWebRequestId());
      await csiSecurityReportPage.expectDarkwebReportNoPermissionMessage();
    });
  });
});
