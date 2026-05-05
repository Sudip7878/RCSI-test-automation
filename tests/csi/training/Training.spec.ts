import { test } from '../../../fixtures/csi/testSetup';
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
