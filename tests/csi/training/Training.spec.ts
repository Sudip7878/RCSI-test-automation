import { expect, test } from '../../../fixtures/csi/testSetup';
import {
  csiAdminTestEmail,
  csiAdminTestPassword,
  csiAutoEnrollOrgUserTestEmail,
  csiAutoEnrollOrgUserTestPassword,
  csiOrgTestEmail,
  csiOrgTestPassword,
  csiOrgUserTestEmail,
  csiSystemOwnerTestEmail,
  csiSystemOwnerTestPassword,
  csiTestEmail,
  csiTestPassingUserTestEmail,
  csiTestPassingUserTestPassword,
  csiTestPassword,
  csiTpTrainingAdminTestEmail,
  csiTpTrainingAdminTestPassword,
} from '../../../utils/csi/credentials';
import {
  csiTrainingFailRetakeCourseName,
  csiUniqueDistributionName,
} from '../../../utils/csi/trainingTestData';

test.describe('CSI · Training', () => {
  test.describe.configure({ timeout: 180_000 });

  /**
   * TR-001: Training Admin creates a course distribution from Course Distribution
   * (recorded-steps/Training/TR-001.txt).
   */
  test.describe('TR-001 training admin creates distribution', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_TP_TRAINING_ADMIN_TEST_PASSWORD?.length ||
        !process.env.CSI_TP_TRAINING_ADMIN_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiTpTrainingAdminTestEmail(),
        csiTpTrainingAdminTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('TR-001', async ({ csiTrainingPage }) => {
      const loginEmail = csiTpTrainingAdminTestEmail();
      const distributionName = csiUniqueDistributionName();

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
      await csiTrainingPage.searchUsersAndSelectRowByEmail(loginEmail, loginEmail);
      await csiTrainingPage.checkOptionalNotifySwitch();
      await csiTrainingPage.goToNextWizardStep();
      await csiTrainingPage.submitDistribute();
      await csiTrainingPage.openDistributionView();
      await csiTrainingPage.expectDistributionListed(distributionName);
    });
  });

  /**
   * TR-002: System Owner creates a course distribution — identical flow to TR-001
   * but logged in as CSI_SYSTEM_OWNER_TEST_EMAIL (recorded-steps/Training/TR-002.txt).
   */
  test.describe('TR-002 system owner creates distribution', () => {
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

    test('TR-002', async ({ csiTrainingPage }) => {
      const loginEmail = csiSystemOwnerTestEmail();
      const distributionName = csiUniqueDistributionName();

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
      await csiTrainingPage.searchUsersAndSelectRowByEmail(loginEmail, loginEmail);
      await csiTrainingPage.checkOptionalNotifySwitch();
      await csiTrainingPage.goToNextWizardStep();
      await csiTrainingPage.submitDistribute();
      await csiTrainingPage.openDistributionView();
      await csiTrainingPage.expectDistributionListed(distributionName);
    });
  });

  /**
   * TR-003: Admin creates a course distribution — identical flow to TR-001
   * but logged in as CSI_ADMIN_TEST_EMAIL (recorded-steps/Training/TR-003.txt).
   */
  test.describe('TR-003 admin creates distribution', () => {
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

    test('TR-003', async ({ csiTrainingPage }) => {
      const loginEmail = csiAdminTestEmail();
      const distributionName = csiUniqueDistributionName();

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
      await csiTrainingPage.searchUsersAndSelectRowByEmail(loginEmail, loginEmail);
      await csiTrainingPage.checkOptionalNotifySwitch();
      await csiTrainingPage.goToNextWizardStep();
      await csiTrainingPage.submitDistribute();
      await csiTrainingPage.openDistributionView();
      await csiTrainingPage.expectDistributionListed(distributionName);
    });
  });

  /**
   * TR-004: Super Admin creates a course distribution in any org — same flow as TR-001 but
   * logged in as CSI_TEST_EMAIL (super admin) and the distribution target user is
   * CSI_ORG_USER_TEST_EMAIL instead of the logged-in account
   * (recorded-steps/Training/TR-004.txt).
   */
  test.describe('TR-004 super admin creates distribution in any org', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_TEST_PASSWORD?.length ||
        !process.env.CSI_ORG_USER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
      await csiLoginPage.expectOnHome();
    });

    test('TR-004', async ({ csiTrainingPage }) => {
      const targetEmail = csiOrgUserTestEmail();
      const distributionName = csiUniqueDistributionName();

      const myCourseTitles = await csiTrainingPage.openMyCourseAndCollectRegisteredCourseTitles();
      const excludedForFirst = new Set(myCourseTitles);

      await csiTrainingPage.openCourseDistribution();
      await csiTrainingPage.startNewDistribution();
      await csiTrainingPage.fillDistributionName(distributionName);

      const firstSelectedCourse = await csiTrainingPage.selectFirstVisibleCourseOptionNotInStrict(
        excludedForFirst,
        0,
      );
      const excludedForSecond = new Set([...myCourseTitles, firstSelectedCourse]);
      await csiTrainingPage.selectFirstVisibleCourseOptionNotInStrict(excludedForSecond, 1);
      await csiTrainingPage.goToNextWizardStep();
      await csiTrainingPage.pickTodayDistributionStartDate();
      // Search and select the org user (not the super admin) as the distribution target
      await csiTrainingPage.searchUsersAndSelectRowByEmail(targetEmail, targetEmail);
      await csiTrainingPage.checkOptionalNotifySwitch();
      await csiTrainingPage.goToNextWizardStep();
      await csiTrainingPage.submitDistribute();
      await csiTrainingPage.openDistributionView();
      await csiTrainingPage.expectDistributionListed(distributionName);
    });
  });

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
