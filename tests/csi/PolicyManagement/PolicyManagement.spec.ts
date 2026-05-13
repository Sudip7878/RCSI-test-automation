import * as os from 'os';
import { test } from '../../../fixtures/csi/testSetup';
import {
  csiTestEmail,
  csiTestPassword,
} from '../../../utils/csi/credentials';
import {
  csiPolicyDistributionDueInDays,
  csiPolicyUniqueSuffix,
} from '../../../utils/csi/policyManagementTestData';
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

  test.describe('PM-001 clone policy template, edit docx, configure distribution, submit for review', () => {
    test('PM-001', async ({
      csiPolicyManagementPage,
    }) => {
      const unique = csiPolicyUniqueSuffix();
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

  test.describe('PM-010 approve first Pending For Approval policy from View Policies', () => {
    test('PM-010', async ({
      csiPolicyManagementPage,
    }) => {
      await csiPolicyManagementPage.openViewPolicies();
      await csiPolicyManagementPage.openReviewForFirstPendingForApproval();
      await csiPolicyManagementPage.approveAndPublishExpectApprovalSent();
    });
  });

  /**
   * PM-016: Owner = Super Admin; acknowledger = `CSI_TEST_EMAIL` via {@link csiTestEmail} (same as root beforeEach).
   * Distribute-now, then MyPolicies → To be Acknowledged → search by suffix → acknowledge.
   */
  test.describe('PM-016 distribute-now policy and acknowledger completes acknowledgement from MyPolicies', () => {
    test('PM-016', async ({ csiPolicyManagementPage }) => {
      const unique = csiPolicyUniqueSuffix();
      const acknowledgerEmail = csiTestEmail();
      const acknowledgerSearchToken = csiDistributionUserSearchToken(acknowledgerEmail);
      const dueInDays = csiPolicyDistributionDueInDays();

      await csiPolicyManagementPage.openPolicyTemplateLibrary();
      await csiPolicyManagementPage.cloneFirstPolicyTemplate();
      await csiPolicyManagementPage.appendUniqueSuffixToPolicyTitle(unique);

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
      await csiPolicyManagementPage.checkDistributePolicyNowRadio();
      await csiPolicyManagementPage.fillAcknowledgementDurationAndDue(dueInDays);
      await csiPolicyManagementPage.selectReviewNotRequiredNo();
      await csiPolicyManagementPage.fillReviewDueInDays(dueInDays);
      await csiPolicyManagementPage.searchIndividualsAndSelectAcknowledgerUser(
        acknowledgerEmail,
        acknowledgerSearchToken,
      );
      await csiPolicyManagementPage.publishPolicyFromWizard();
      await csiPolicyManagementPage.expectPolicyPublished();

      await csiPolicyManagementPage.gotoMyPolicies();
      await csiPolicyManagementPage.openToBeAcknowledgedTab();
      await csiPolicyManagementPage.waitForAcknowledgementPolicyCardsAfterTab();
      await csiPolicyManagementPage.searchMyPoliciesByPolicySuffix(unique);
      await csiPolicyManagementPage.clickViewOnFirstMyPoliciesAcknowledgementCard();
      await csiPolicyManagementPage.completePolicyAcknowledgementExpectSuccess();
    });
  });
});
