import * as os from 'os';
import { test } from '../../../fixtures/csi/testSetup';
import { csiTestEmail, csiTestPassword } from '../../../utils/csi/credentials';
import { utcDateBasedNumber } from '../../../utils/dateUtils';
import { csiPolicyDistributionDueInDays } from '../../../utils/csi/policyManagementTestData';
import { prependLineToDocx } from '../../../utils/csi/policyDocxPrepend';
import { csiDistributionUserSearchToken } from '../../../utils/csi/trainingTestData';

test.describe('CSI · Policy Management', () => {
  test.describe.configure({ timeout: 300_000 });

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

  test('PM-001 clone policy template, edit docx, configure distribution, submit for review', async ({
    csiPolicyManagementPage,
  }) => {
    const unique = utcDateBasedNumber();
    const loginEmail = csiTestEmail();
    const searchToken = csiDistributionUserSearchToken(loginEmail);
    const dueInDays = csiPolicyDistributionDueInDays();

    await csiPolicyManagementPage.openPolicyTemplateLibrary();
    await csiPolicyManagementPage.cloneFirstPolicyTemplate();
    await csiPolicyManagementPage.appendUniqueSuffixToPolicyTitle(unique);
    const policyTitle = (await csiPolicyManagementPage.policyTitleInput.inputValue()).trim();

    await csiPolicyManagementPage.fillPolicyReferenceNumber(unique);
    await csiPolicyManagementPage.selectOwnerSuperAdmin();
    const downloadPath = await csiPolicyManagementPage.downloadTemplateTo(os.tmpdir());

    const editedPath = csiPolicyManagementPage.buildEditedDocxPath(downloadPath, unique);
    await prependLineToDocx({ sourcePath: downloadPath, destPath: editedPath, line: unique });

    await csiPolicyManagementPage.uploadEditedDocx(editedPath);
    await csiPolicyManagementPage.expectDocxUploaded();
    await csiPolicyManagementPage.goToNextWizardStep();

    await csiPolicyManagementPage.waitForAcknowledgementSection();
    await csiPolicyManagementPage.selectAcknowledgementTypeCompulsory();
    await csiPolicyManagementPage.pickTomorrowAcknowledgementStartDate();
    await csiPolicyManagementPage.fillAcknowledgementDurationAndDue(dueInDays);
    await csiPolicyManagementPage.selectReviewNotRequiredNo();
    await csiPolicyManagementPage.fillReviewDueInDays(dueInDays);
    await csiPolicyManagementPage.searchIndividualsAndSelectLoginUser(loginEmail, searchToken);

    await csiPolicyManagementPage.submitForReview();
    await csiPolicyManagementPage.expectPolicyCreated();
    await csiPolicyManagementPage.expectOnViewPoliciesWithPendingPolicy(policyTitle);
  });
});
