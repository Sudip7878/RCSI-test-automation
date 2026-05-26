import * as os from 'os';
import { test } from '../../../fixtures/csi/testSetup';
import {
  csiTestEmail,
  csiTestPassword,
} from '../../../utils/csi/credentials';
import {
  csiOrgAPolicyId,
  csiOrgBPolicyId,
  csiPolicyDistributionDueInDays,
  csiPolicyUniqueSuffix,
  replacePolicyTitleLastToken,
} from '../../../utils/csi/policyManagementTestData';
import {
  csiOrgASystemOwnerTestEmail,
  csiOrgASystemOwnerTestPassword,
  csiOrgBSystemOwnerTestEmail,
  csiOrgBSystemOwnerTestPassword,
} from '../../../utils/csi/credentials';
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

  /**
   * PM-024: same published-policy major-update wizard as PM-026 through `Policy Updated` (no review / approve / version-2).
   * Needs `Update Version 1` on Published Policies (see {@link CsiPolicyManagementPage.clickFirstPublishedRowUpdateVersionOne}).
   */
  test.describe('PM-024 submit major policy update', () => {
    test('PM-024', async ({ csiPolicyManagementPage }) => {
      const newSuffix = csiPolicyUniqueSuffix();

      await csiPolicyManagementPage.gotoAvotechViewPolicies();
      await csiPolicyManagementPage.openPublishedPoliciesTab();
      await csiPolicyManagementPage.waitPublishedPoliciesGridSettled();
      await csiPolicyManagementPage.sortViewPoliciesByVersionColumn();
      await csiPolicyManagementPage.clickFirstPublishedRowUpdateVersionOne();

      await csiPolicyManagementPage.clickPolicyTitleBreadcrumbLink();
      const previousFull = (await csiPolicyManagementPage.policyTitleInput.inputValue()).trim();
      const newFullTitle = replacePolicyTitleLastToken(previousFull, newSuffix);
      await csiPolicyManagementPage.policyTitleInput.fill(newFullTitle);
      await csiPolicyManagementPage.clickPolicyTitleBreadcrumbLink();
      await csiPolicyManagementPage.clickPolicyUpdateWizardNextFirst();
      await csiPolicyManagementPage.clickPolicyUpdateWizardNextExact();

      await csiPolicyManagementPage.clickSubmitForReReview();
      await csiPolicyManagementPage.ensureMajorUpdateRadioChecked();
      await csiPolicyManagementPage.clickSubmitAfterReReviewMajorUpdate();
      await csiPolicyManagementPage.expectPolicyUpdatedToast();
    });
  });

  /**
   * PM-026: published policy version-1 update → re-review → approve/publish → version 2.
   * Needs a tenant row with `Update Version 1` on Published Policies (see `clickFirstPublishedRowUpdateVersionOne`).
   */
  test.describe('PM-026 policy update approval from Published Policies', () => {
    test('PM-026', async ({ csiPolicyManagementPage }) => {
      const newSuffix = csiPolicyUniqueSuffix();

      await csiPolicyManagementPage.gotoAvotechViewPolicies();
      await csiPolicyManagementPage.openPublishedPoliciesTab();
      await csiPolicyManagementPage.waitPublishedPoliciesGridSettled();
      await csiPolicyManagementPage.sortViewPoliciesByVersionColumn();
      await csiPolicyManagementPage.clickFirstPublishedRowUpdateVersionOne();

      await csiPolicyManagementPage.clickPolicyTitleBreadcrumbLink();
      const previousFull = (await csiPolicyManagementPage.policyTitleInput.inputValue()).trim();
      const newFullTitle = replacePolicyTitleLastToken(previousFull, newSuffix);
      await csiPolicyManagementPage.policyTitleInput.fill(newFullTitle);
      await csiPolicyManagementPage.clickPolicyTitleBreadcrumbLink();
      await csiPolicyManagementPage.clickPolicyUpdateWizardNextFirst();
      await csiPolicyManagementPage.clickPolicyUpdateWizardNextExact();

      await csiPolicyManagementPage.clickSubmitForReReview();
      await csiPolicyManagementPage.ensureMajorUpdateRadioChecked();
      await csiPolicyManagementPage.clickSubmitAfterReReviewMajorUpdate();
      await csiPolicyManagementPage.expectPolicyUpdatedToast();

      await csiPolicyManagementPage.searchViewPoliciesGrid(newFullTitle);
      await csiPolicyManagementPage.expectPolicyTitleVisibleInPublishedGrid(newFullTitle);
      await csiPolicyManagementPage.openReviewLinkForRowWithPolicyTitle(newFullTitle);

      await csiPolicyManagementPage.approvePublishThenSecondPublishExpectApprovalSent();

      await csiPolicyManagementPage.searchViewPoliciesGrid(newFullTitle);
      await csiPolicyManagementPage.expectPolicyTitleVisibleInPublishedGrid(newFullTitle);
      await csiPolicyManagementPage.sortViewPoliciesByVersionColumn();
      await csiPolicyManagementPage.expectPublishedRowVersionColumnIsExact(newFullTitle, '2');
    });
  });
});

test.describe('CSI · Policy Management — org policy isolation', () => {
  test.describe.configure({ timeout: 120_000 });

  /**
   * PM-031: Org A owner cannot open Org B policy detail and vice versa.
   * Policy ids in `data/csi/policyManagement.json` (recorded-steps/PolicyManagement/PM-031.txt).
   */
  test.describe('PM-031 cross-org PolicyDetail access denied', () => {
    test('PM-031', async ({ csiLoginPage, csiPolicyManagementPage }) => {
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

      await csiPolicyManagementPage.openPolicyDetail(csiOrgBPolicyId());
      await csiPolicyManagementPage.expectPolicyDetailNoPermissionMessage();

      await csiLoginPage.gotoHome();
      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiOrgBSystemOwnerTestEmail(),
        csiOrgBSystemOwnerTestPassword(),
      );
      await csiLoginPage.expectOnHome();

      await csiPolicyManagementPage.openPolicyDetail(csiOrgAPolicyId());
      await csiPolicyManagementPage.expectPolicyDetailNoPermissionMessage();
    });
  });
});
