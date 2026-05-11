import { expect, test } from '../../../fixtures/csi/testSetup';
import { csiTestEmail, csiTestPassword } from '../../../utils/csi/credentials';
import {
  csiDistributionUserSearchToken,
  csiTrainingFirstCourseName,
  csiTrainingSecondCourseName,
  csiUniqueDistributionName,
} from '../../../utils/csi/trainingTestData';

test.describe('CSI · Training', () => {
  test.describe.configure({ timeout: 180_000 });

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
    test('Create course distribution from Course Distribution', async ({ csiTrainingPage }) => {
      const loginEmail = csiTestEmail();
      const distributionName = csiUniqueDistributionName();
      const userSearchToken = csiDistributionUserSearchToken(loginEmail);

      await csiTrainingPage.openCourseDistribution();
      await csiTrainingPage.startNewDistribution();
      await csiTrainingPage.fillDistributionName(distributionName);
      await csiTrainingPage.selectCourseByVirtualSelectSearch(csiTrainingFirstCourseName(), 0);
      await csiTrainingPage.selectCourseByVirtualSelectSearch(csiTrainingSecondCourseName(), 1);
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
});
