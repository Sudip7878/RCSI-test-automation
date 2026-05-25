import { test } from '../../../fixtures/csi/testSetup';
import {
  csiTpPhisingAdminTestEmail,
  csiTpPhisingAdminTestPassword,
  csiTpTrainingAdminTestEmail,
  csiTpTrainingAdminTestPassword,
  csiTrainingPhisingSysOwnerTestEmail,
  csiTrainingPhisingSysOwnerTestPassword,
} from '../../../utils/csi/credentials';
import {
  csiPhisingUserSearchToken,
  csiUniquePhisingTestName,
} from '../../../utils/csi/phisingTestData';
import { csiDistributionUserSearchToken, csiUniqueDistributionName } from '../../../utils/csi/trainingTestData';

function cc001RequiredEnvPresent(): boolean {
  return (
    !!process.env.CSI_TRAINING_PHISING_SYS_OWNER_TEST_PASSWORD?.length &&
    !!process.env.CSI_TRAINING_PHISING_SYS_OWNER_TEST_EMAIL?.trim()?.length &&
    !!process.env.CSI_TP_TRAINING_ADMIN_TEST_PASSWORD?.length &&
    !!process.env.CSI_TP_TRAINING_ADMIN_TEST_EMAIL?.trim()?.length &&
    !!process.env.CSI_TP_PHISING_ADMIN_TEST_PASSWORD?.length &&
    !!process.env.CSI_TP_PHISING_ADMIN_TEST_EMAIL?.trim()?.length
  );
}

test.describe('CSI · Cross Cutting', () => {
  test.describe.configure({ timeout: 300_000 });

  /**
   * CC-001: SB-056 (restricted hub) → logout → TR-001 (course distribution) → logout → PH-001 (phishing test).
   */
  test('CC-001', async ({
    csiLoginPage,
    csiSalesAndBillingPage,
    csiTrainingPage,
    csiPhisingPage,
  }) => {
    if (!cc001RequiredEnvPresent()) {
      test.skip();
      return;
    }

    await csiLoginPage.gotoLogin();
    await csiLoginPage.signInWithEmailAndPassword(
      csiTrainingPhisingSysOwnerTestEmail(),
      csiTrainingPhisingSysOwnerTestPassword(),
    );

    await csiSalesAndBillingPage.expectSb056TrainingAndPhishingNavVisible();
    await csiSalesAndBillingPage.navigateSb056TrainingPhishingThenAccountManagement();
    await csiSalesAndBillingPage.expectSb056RestrictedHubModulesNotVisible();

    await csiLoginPage.logoutViaHeaderMenu();
    await csiLoginPage.expectEmailStepVisible();

    await csiLoginPage.gotoLogin();
    const trainingAdminEmail = csiTpTrainingAdminTestEmail();
    await csiLoginPage.signInWithEmailAndPassword(
      trainingAdminEmail,
      csiTpTrainingAdminTestPassword(),
    );
    await csiLoginPage.expectOnHome();

    const distributionName = csiUniqueDistributionName();
    const trainingUserSearchToken = csiDistributionUserSearchToken(trainingAdminEmail);

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
    await csiTrainingPage.searchUsersAndSelectRowByEmail(trainingAdminEmail, trainingUserSearchToken);
    await csiTrainingPage.checkOptionalNotifySwitch();
    await csiTrainingPage.goToNextWizardStep();
    await csiTrainingPage.submitDistribute();
    await csiTrainingPage.openDistributionView();
    await csiTrainingPage.expectDistributionListed(distributionName);

    await csiLoginPage.logoutViaHeaderMenu();
    await csiLoginPage.expectEmailStepVisible();

    await csiLoginPage.gotoLogin();
    const phisingAdminEmail = csiTpPhisingAdminTestEmail();
    await csiLoginPage.signInWithEmailAndPassword(
      phisingAdminEmail,
      csiTpPhisingAdminTestPassword(),
    );
    await csiLoginPage.expectOnHome();

    const phisingSearchToken = csiPhisingUserSearchToken(phisingAdminEmail);
    const phisingTestName = csiUniquePhisingTestName();

    await csiPhisingPage.openPhisingTestCreation();
    await csiPhisingPage.selectFirstAttackTemplateAndContinue();
    await csiPhisingPage.chooseIndividualsAndSelectLoginUser(phisingAdminEmail, phisingSearchToken);
    await csiPhisingPage.fillPhisingTestDetailsAndContinue(phisingTestName);
    await csiPhisingPage.finalizeAndDistribute();
    await csiPhisingPage.expectPhisingTestCreated(phisingTestName);
  });
});
