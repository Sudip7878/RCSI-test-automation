import { expect, test } from '../../../fixtures/csi/testSetup';
import {
  csiAutoEnrollOrgUserTestEmail,
  csiAutoEnrollOrgUserTestPassword,
  csiOrgTestEmail,
  csiOrgTestPassword,
  csiTestEmail,
  csiTestPassingUserTestEmail,
  csiTestPassingUserTestPassword,
  csiTestPassword,
} from '../../../utils/csi/credentials';
import {
  csiDistributionUserSearchToken,
  csiTrainingFailRetakeCourseName,
  csiUniqueDistributionName,
} from '../../../utils/csi/trainingTestData';

test.describe('CSI · Training', () => {
  test.describe.configure({ timeout: 180_000 });

  test.describe('CSI_TEST user flows', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (!process.env.CSI_TEST_PASSWORD?.length) {
        test.skip();
        return;
      }

      const email = csiTestEmail();
      const password = csiTestPassword();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(email, password);
      await csiLoginPage.expectOnHome();
    });

    test.describe('Create course distribution from Course Distribution', () => {
      test('TR-001', async ({ csiTrainingPage }) => {
        const loginEmail = csiTestEmail();
        const distributionName = csiUniqueDistributionName();
        const userSearchToken = csiDistributionUserSearchToken(loginEmail);

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
        await csiTrainingPage.searchUsersAndSelectRowByEmail(loginEmail, userSearchToken);
        await csiTrainingPage.checkOptionalNotifySwitch();
        await csiTrainingPage.goToNextWizardStep();
        await csiTrainingPage.submitDistribute();
        await csiTrainingPage.openDistributionView();
        await csiTrainingPage.expectDistributionListed(distributionName);
      });
    });

    test.describe('TR-025 Course report PDF export', () => {
      test('TR-025', async ({ csiTrainingPage }) => {
        await csiTrainingPage.openCourseReport();
        const pdf = await csiTrainingPage.downloadCourseReportPdf();

        expect(pdf.length, 'course report PDF should have bytes').toBeGreaterThan(512);
        const header = pdf.subarray(0, Math.min(8, pdf.length)).toString('latin1');
        expect(header.startsWith('%PDF'), 'download should be a PDF (starts with %PDF)').toBe(true);
      });
    });

    /**
     * TR-011: retake failed course, complete video, intentionally fail quiz (recorded-steps/Training/TR-011.txt).
     */
    test.describe('TR-011 course retake and quiz failure', () => {
      test.describe.configure({ timeout: 600_000 });

      test('TR-011', async ({ csiTrainingPage }) => {
        await csiTrainingPage.runTr011RetakeAndFailFlow(csiTrainingFailRetakeCourseName());
      });
    });
  });

  /**
   * TR-010: passed course certificate preview and PDF download (recorded-steps/Training/TR-010.txt).
   */
  test.describe('TR-010 passed course certificate download', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_TEST_PASSING_USER_TEST_PASSWORD?.length ||
        !process.env.CSI_TEST_PASSING_USER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiTestPassingUserTestEmail(),
        csiTestPassingUserTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('TR-010', async ({ csiTrainingPage }) => {
      const pdf = await csiTrainingPage.downloadFirstPassedCourseCertificatePdf();

      expect(pdf.length, 'certificate PDF should have bytes').toBeGreaterThan(512);
      const header = pdf.subarray(0, Math.min(8, pdf.length)).toString('latin1');
      expect(header.startsWith('%PDF'), 'download should be a PDF (starts with %PDF)').toBe(true);
    });
  });

  /**
   * TR-022: auto-enrolled org user sees at least one course on My Course (recorded-steps/Training/TR-022.txt).
   */
  test.describe('TR-022 auto course assignment on My Course', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_AUTO_ENROLL_ORG_USER_TEST_PASSWORD?.length ||
        !process.env.CSI_AUTO_ENROLL_ORG_USER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiAutoEnrollOrgUserTestEmail(),
        csiAutoEnrollOrgUserTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('TR-022', async ({ csiTrainingPage }) => {
      await csiTrainingPage.expectTr022AutoAssignedCourseOnMyCourse();
    });
  });

  test.describe('TR-033 course dashboard manager view', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_ORG_TEST_PASSWORD?.length ||
        !process.env.CSI_ORG_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiOrgTestEmail(), csiOrgTestPassword());
      await csiLoginPage.expectOnHome();
    });

    test('TR-033', async ({ csiTrainingPage }) => {
      await csiTrainingPage.openCourseDashboard();
      await csiTrainingPage.switchToManagerViewAndSettle();
      await csiTrainingPage.expectTr033ManagerDashboardSectionsVisible();
    });
  });
});
