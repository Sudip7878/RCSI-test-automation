import * as fs from 'node:fs';
import { test } from '../../../fixtures/csi/testSetup';
import {
  csiSecurityReportAdminTestEmail,
  csiSecurityReportAdminTestPassword,
  csiTestEmail,
  csiTestPassword,
} from '../../../utils/csi/credentials';
import { CSI_ATTACK_SURFACE_REPORT_FILENAME, csiAttackSurfaceReportPdfPath } from '../../../utils/csi/securityReportTestData';

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
});
