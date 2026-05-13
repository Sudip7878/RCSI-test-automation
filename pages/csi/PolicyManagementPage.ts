import { expect, type Locator } from '@playwright/test';
import * as path from 'path';
import { CSI_BASE_URL } from '../../config/csi';
import { BasePage } from '../BasePage';

export class CsiPolicyManagementPage extends BasePage {
  readonly policyTitleInput = this.page.getByRole('textbox', { name: 'Policy Title*' });
  readonly referenceNumberInput = this.page.getByRole('textbox', { name: 'Reference Number*' });
  readonly ownerSelect = this.page.getByLabel('Owner');
  readonly downloadTemplateButton = this.page.getByRole('button', { name: /Download and modify template/i });
  /** Wizard footer: `justify-content-space-between` row → `button[type=button].btn-primary` with label Next. */
  readonly nextButton = this.page
    .locator('div.display-flex.justify-content-space-between > div.display-flex')
    .locator('button[type="button"].btn-primary')
    .filter({ hasText: 'Next' });
  readonly userSearchInput = this.page.locator('#b29-b1-Input_search');
  readonly userSearchButton = this.page.getByRole('button', { name: 'Search' }).first();
  readonly submitForReviewButton = this.page.getByRole('button', { name: 'Submit for Review' });
  /** PM-016: shown beside Submit for Review on the final wizard step when publishing without review. */
  readonly publishPolicyWizardButton = this.page.getByRole('button', { name: 'Publish' });
  readonly acknowledgementDropdown = this.page.locator('#Acknowledgement_Dropdown');

  private async clickTomorrowInOpenDatepicker() {
    const calendar = this.page.locator('.flatpickr-calendar.open[role="dialog"]');
    await expect(calendar).toBeVisible({ timeout: 15_000 });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const fullDateLabel = tomorrow.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const labelCell = calendar
        .locator(`.flatpickr-day[role="button"][aria-label="${fullDateLabel}"]`)
        .first();
      if (await labelCell.isVisible().catch(() => false)) {
        await labelCell.click();
        return;
      }

      const nextMonthButton = calendar.locator('.flatpickr-next-month').first();
      if (await nextMonthButton.isVisible().catch(() => false)) {
        await nextMonthButton.click();
      } else {
        break;
      }
    }

    throw new Error(`Could not select tomorrow in date picker: ${fullDateLabel}`);
  }

  private userRowByEmail(email: string): Locator {
    return this.page.locator('tr.table-row').filter({ has: this.page.getByRole('gridcell', { name: email }) });
  }

  private async policyFileInput(): Promise<Locator> {
    const idInputs = this.page.locator('#FileName_Input');
    if ((await idInputs.count()) > 0) {
      const first = idInputs.first();
      const isFile = await first.evaluate((el) => (el as unknown as HTMLInputElement).type === 'file');
      if (isFile) {
        return first;
      }
    }
    return this.page.locator('input[type="file"]').first();
  }

  async openPolicyTemplateLibrary() {
    await this.page.goto(`${CSI_BASE_URL}/PolicyTemplateLibrary`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page.locator('.list .card').first()).toBeVisible({ timeout: 60_000 });
  }

  async cloneFirstPolicyTemplate() {
    const firstCard = this.page.locator('.list .card').first();
    await expect(firstCard).toBeVisible({ timeout: 30_000 });

    const actionsHeader = firstCard.locator('.osui-submenu__header').filter({ hasText: 'Actions' });
    await expect(actionsHeader).toBeVisible({ timeout: 15_000 });
    await actionsHeader.click();

    const cloneByButtonRole = firstCard.getByRole('button', { name: /Clone Template/i });
    const cloneByHref = firstCard
      .locator('a[href*="CreateNewPolicy"]')
      .filter({ hasText: /Clone\s+Template/i })
      .first();
    const clone = cloneByButtonRole.or(cloneByHref);

    await expect(clone).toBeVisible({ timeout: 20_000 });
    await clone.click();

    await expect(this.policyTitleInput).toBeVisible({ timeout: 60_000 });
  }

  async appendUniqueSuffixToPolicyTitle(uniqueSuffix: string) {
    await expect(this.policyTitleInput).toBeVisible();
    await this.policyTitleInput.click();
    const current = (await this.policyTitleInput.inputValue()).trimEnd();
    await this.policyTitleInput.fill(`${current} ${uniqueSuffix}`);
  }

  async fillPolicyReferenceNumber(referenceNumber: string) {
    await expect(this.referenceNumberInput).toBeVisible();
    await this.referenceNumberInput.click();
    await this.referenceNumberInput.fill(referenceNumber);
  }

  async selectOwnerSuperAdmin() {
    await expect(this.ownerSelect).toBeVisible({ timeout: 15_000 });
    await this.ownerSelect.selectOption({ label: 'Super Admin' });
  }

  /** Save download with `suggestedFilename()` under `targetDir`. */
  async downloadTemplateTo(targetDir: string): Promise<string> {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 120_000 });
    await expect(this.downloadTemplateButton).toBeVisible({ timeout: 30_000 });
    await this.downloadTemplateButton.click();
    const download = await downloadPromise;
    const rawName = download.suggestedFilename() || 'template.docx';
    const safeBase = path.basename(rawName.replace(/[/\\]/g, '_'));
    const downloadPath = path.join(targetDir, safeBase);
    await download.saveAs(downloadPath);
    return downloadPath;
  }

  async uploadEditedDocx(absolutePath: string) {
    const fileInput = await this.policyFileInput();
    await expect(fileInput).toBeAttached({ timeout: 15_000 });
    await fileInput.setInputFiles(absolutePath);
  }

  async expectDocxUploaded() {
    await expect(this.page.getByText('Uploaded', { exact: true })).toBeVisible({ timeout: 60_000 });
  }

  private async clickWizardPrimaryNext() {
    const btn = this.nextButton.last();
    await btn.scrollIntoViewIfNeeded();
    try {
      await btn.click({ timeout: 10_000 });
    } catch {
      await btn.click({ force: true });
    }
  }

  async goToNextWizardStep() {
    await this.clickWizardPrimaryNext();
  }

  async waitForAcknowledgementSection() {
    await expect(this.acknowledgementDropdown).toBeVisible({ timeout: 60_000 });
  }

  async selectAcknowledgementTypeCompulsory() {
    await expect(this.acknowledgementDropdown).toBeVisible({ timeout: 15_000 });
    await this.acknowledgementDropdown.selectOption({ label: 'Compulsory' });
  }

  async pickTomorrowAcknowledgementStartDate() {
    const dateCombo = this.page.getByRole('combobox', { name: /Select a date/i }).first();
    await expect(dateCombo).toBeVisible({ timeout: 15_000 });
    await dateCombo.click();
    await this.clickTomorrowInOpenDatepicker();
  }

  /** PM-016: immediate distribution instead of scheduled start (replaces {@link pickTomorrowAcknowledgementStartDate}). */
  async checkDistributePolicyNowRadio() {
    await this.page
      .getByRole('radio', { name: 'I want to distribute this Policy now' })
      .check({ timeout: 15_000 });
  }

  async fillAcknowledgementDurationAndDue(dueInDays: number) {
    await this.page.locator('#Dropdown_Duration').selectOption({ label: 'Days' });
    const dueIn = this.page.locator('#Input_DueDateIn');
    await expect(dueIn).toBeVisible({ timeout: 10_000 });
    await dueIn.click();
    await dueIn.fill(String(dueInDays));
  }

  async selectReviewNotRequiredNo() {
    await this.page.getByRole('radio', { name: 'No', exact: true }).check();
  }

  async fillReviewDueInDays(dueInDays: number) {
    await this.page.locator('#Dropdown5_reviewduein').selectOption({ label: 'Days' });
    const review = this.page.locator('#Input_Review');
    await expect(review).toBeVisible({ timeout: 10_000 });
    await review.click();
    await review.fill(String(dueInDays));
  }

  async searchIndividualsAndSelectLoginUser(loginEmail: string, searchToken: string) {
    await expect(this.userSearchInput).toBeVisible({ timeout: 30_000 });
    await this.userSearchInput.click();
    await this.userSearchInput.fill(searchToken);
    await this.userSearchButton.click();

    const row = this.userRowByEmail(loginEmail);
    await expect(row).toBeVisible({ timeout: 30_000 });
    const checkbox = row.locator('input[type="checkbox"].checkbox').first();
    await expect(checkbox).toBeVisible();
    await checkbox.check();

    await this.clickWizardPrimaryNext();
  }

  /**
   * PM-016: same grid search/select as {@link searchIndividualsAndSelectLoginUser} but kept separate so PM-001
   * stays unchanged and this path can diverge if the acknowledger selection rules change.
   */
  async searchIndividualsAndSelectAcknowledgerUser(acknowledgerEmail: string, searchToken: string) {
    await expect(this.userSearchInput).toBeVisible({ timeout: 30_000 });
    await this.userSearchInput.click();
    await this.userSearchInput.fill(searchToken);
    await this.userSearchButton.click();

    const row = this.userRowByEmail(acknowledgerEmail);
    await expect(row).toBeVisible({ timeout: 30_000 });
    const checkbox = row.locator('input[type="checkbox"].checkbox').first();
    await expect(checkbox).toBeVisible();
    await checkbox.check();

    await this.clickWizardPrimaryNext();
  }

  private async safeSleep(ms: number) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async gotoMyPolicies() {
    await this.page.goto(`${CSI_BASE_URL}/MyPolicies`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Tab label includes a dynamic count, e.g. `To be Acknowledged (1)`. */
  async openToBeAcknowledgedTab() {
    const tab = this.page.getByText(/To be Acknowledged\s*\(\d+\)/);
    await expect(tab).toBeVisible({ timeout: 60_000 });
    await tab.click();
  }

  /** PM-016: allow policy cards to render after switching to the pending-acknowledgement list. */
  async waitForAcknowledgementPolicyCardsAfterTab() {
    await this.safeSleep(3000);
  }

  /** PM-016: filter MyPolicies list by substring (same value appended to policy title in the wizard). */
  async searchMyPoliciesByPolicySuffix(suffix: string) {
    const search = this.page.getByRole('searchbox', { name: 'Search policies' });
    await expect(search).toBeVisible({ timeout: 30_000 });
    await search.click();
    await search.fill(suffix);
    await this.page.getByRole('button', { name: 'Search' }).click();
  }

  async clickViewOnFirstMyPoliciesAcknowledgementCard() {
    const firstCard = this.page.locator('div.list div.card').first();
    await expect(firstCard).toBeVisible({ timeout: 60_000 });
    const view = firstCard.getByRole('button', { name: 'View' });
    await expect(view).toBeVisible({ timeout: 30_000 });
    await view.click();
  }

  async completePolicyAcknowledgementExpectSuccess() {
    const acknowledgePolicy = this.page.getByRole('button', { name: 'Acknowledge Policy' });
    await expect(acknowledgePolicy).toBeVisible({ timeout: 60_000 });
    await acknowledgePolicy.click();

    await this.safeSleep(3000);
    const acknowledge = this.page.getByRole('button', { name: 'Acknowledge' });
    await expect(acknowledge).toBeVisible({ timeout: 30_000 });
    await acknowledge.click();

    await expect(this.page.getByText('Acknowledgment has been made')).toBeVisible({ timeout: 60_000 });
  }

  async submitForReview() {
    await expect(this.submitForReviewButton).toBeVisible({ timeout: 60_000 });
    await this.submitForReviewButton.click();
  }

  /** PM-016: use Publish instead of {@link submitForReview} when the UI offers both on the same step. */
  async publishPolicyFromWizard() {
    await expect(this.submitForReviewButton).toBeVisible({ timeout: 60_000 });
    await expect(this.publishPolicyWizardButton).toBeVisible({ timeout: 15_000 });
    await this.publishPolicyWizardButton.click();
  }

  async expectPolicyCreated() {
    await expect(this.page.getByText('Policy Created', { exact: true })).toBeVisible({ timeout: 120_000 });
  }

  /** PM-016: success toast after {@link publishPolicyFromWizard}. */
  async expectPolicyPublished() {
    await expect(this.page.getByText('Policy is created successfully.', { exact: true })).toBeVisible({
      timeout: 120_000,
    });
  }

  async expectOnViewPoliciesWithPendingPolicy(policyTitle: string) {
    await this.page.waitForURL(/\/ViewPolicies/i, { timeout: 120_000 });
    const titleCell = this.page.getByRole('gridcell', { name: policyTitle });
    await expect(titleCell).toBeVisible({ timeout: 60_000 });
    const row = this.page.locator('tr.table-row').filter({ has: titleCell });
    await expect(row.getByRole('gridcell', { name: /Pending For Approval/i })).toBeVisible({
      timeout: 30_000,
    });
  }

  async openViewPolicies() {
    await this.page.goto(`${CSI_BASE_URL}/ViewPolicies`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page.locator('table.table[role="grid"]')).toBeVisible({ timeout: 60_000 });
  }

  /** PM-010: walk `tbody tr.table-row` top-down; first ● Pending For Approval → status cell + Review link. */
  async openReviewForFirstPendingForApproval() {
    const grid = this.page.locator('table.table[role="grid"]');
    await expect(grid).toBeVisible({ timeout: 60_000 });
    const pendingLabel = '● Pending For Approval';
    const rows = grid.locator('tbody tr.table-row');
    const n = await rows.count();
    for (let i = 0; i < n; i += 1) {
      const row = rows.nth(i);
      const statusCell = row.getByRole('gridcell', { name: pendingLabel });
      if ((await statusCell.count()) === 0) {
        continue;
      }
      await statusCell.click();
      await row.getByRole('link', { name: 'Review' }).click();
      return;
    }
    throw new Error('No table row with status Pending For Approval');
  }

  async approveAndPublishExpectApprovalSent() {
    const approve = this.page.getByRole('button', { name: 'Approve and Publish' });
    await expect(approve).toBeVisible({ timeout: 60_000 });
    await approve.click();
    await expect(this.page.getByText('Approval Sent')).toBeVisible({ timeout: 60_000 });
  }

  private viewPoliciesTable(): Locator {
    return this.page.locator('table.table[role="grid"]');
  }

  private publishedPolicyRowByTitle(policyTitle: string): Locator {
    return this.viewPoliciesTable().locator('tbody tr.table-row').filter({ hasText: policyTitle.trim() }).first();
  }

  /** PM-026: View Policies screen (OutSystems `/Avotech/ViewPolicies`). */
  async gotoAvotechViewPolicies() {
    await this.page.goto(`${CSI_BASE_URL}/Avotech/ViewPolicies`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.viewPoliciesTable()).toBeVisible({ timeout: 60_000 });
  }

  /** Tab label includes a dynamic count, e.g. `Published Policies (52)`. */
  async openPublishedPoliciesTab() {
    const tab = this.page.getByRole('tab', { name: /Published Policies\s*\(\d+\)/ });
    await expect(tab).toBeVisible({ timeout: 60_000 });
    await tab.click();
  }

  /** PM-026: allow the published-policy grid to populate after tab switch. */
  async waitPublishedPoliciesGridSettled() {
    await this.safeSleep(3000);
  }

  async sortViewPoliciesByVersionColumn() {
    const grid = this.viewPoliciesTable();
    await grid.getByRole('columnheader', { name: 'Version' }).click();
    await this.safeSleep(500);
  }

  /**
   * PM-026: first row (top → bottom) with an `Update Version 1` control on Published Policies.
   * Requires at least one published policy still on version 1 with a pending update in the tenant.
   */
  async clickFirstPublishedRowUpdateVersionOne() {
    const grid = this.viewPoliciesTable();
    const link = grid.getByRole('link').filter({ hasText: /Update Version\s*1/i }).first();
    await expect(link).toBeVisible({ timeout: 60_000 });
    await link.click();
  }

  async clickPolicyTitleBreadcrumbLink() {
    const link = this.page.locator('#policyTitle').getByRole('link');
    await expect(link).toBeVisible({ timeout: 60_000 });
    await link.click();
  }

  async clickPolicyUpdateWizardNextFirst() {
    const next = this.page.getByRole('button', { name: 'Next' }).first();
    await expect(next).toBeVisible({ timeout: 60_000 });
    await next.click();
  }

  async clickPolicyUpdateWizardNextExact() {
    await this.safeSleep(3000);
    const next = this.page.getByRole('button', { name: 'Next', exact: true });
    await expect(next).toBeVisible({ timeout: 60_000 });
    await next.click();
  }

  async clickSubmitForReReview() {
    const btn = this.page.getByRole('button', { name: 'Submit for Re-Review' });
    await expect(btn).toBeVisible({ timeout: 60_000 });
    await btn.click();
  }

  async ensureMajorUpdateRadioChecked() {
    const radio = this.page.getByRole('radio', { name: 'Major Update' });
    await expect(radio).toBeVisible({ timeout: 30_000 });
    await radio.check();
  }

  async clickSubmitAfterReReviewMajorUpdate() {
    const submit = this.page.getByRole('button', { name: 'Submit', exact: true });
    await expect(submit).toBeVisible({ timeout: 30_000 });
    await submit.click();
  }

  async expectPolicyUpdatedToast() {
    await expect(this.page.getByText('Policy Updated')).toBeVisible({ timeout: 120_000 });
  }

  /** View Policies grid search (same control name as MyPolicies). */
  async searchViewPoliciesGrid(query: string) {
    const search = this.page.getByRole('searchbox', { name: 'Search policies' });
    await expect(search).toBeVisible({ timeout: 30_000 });
    await search.fill(query);
    await this.page.getByRole('button', { name: 'Search' }).first().click();
    await expect(this.viewPoliciesTable()).toBeVisible({ timeout: 30_000 });
  }

  async openReviewLinkForRowWithPolicyTitle(policyTitle: string) {
    const row = this.publishedPolicyRowByTitle(policyTitle);
    await expect(row).toBeVisible({ timeout: 30_000 });
    await row.getByRole('link', { name: 'Review' }).click();
  }

  /**
   * PM-026: after Approve and Publish, a second Publish step appears before the Approval Sent toast
   * (differs from {@link approveAndPublishExpectApprovalSent} used by PM-010).
   */
  async approvePublishThenSecondPublishExpectApprovalSent() {
    const approve = this.page.getByRole('button', { name: 'Approve and Publish' });
    await expect(approve).toBeVisible({ timeout: 60_000 });
    await approve.click();
    const publish = this.page.getByRole('button', { name: 'Publish' });
    await expect(publish).toBeVisible({ timeout: 60_000 });
    await publish.click();
    await expect(this.page.getByText('Approval Sent')).toBeVisible({ timeout: 60_000 });
  }

  async expectPolicyTitleVisibleInPublishedGrid(policyTitle: string) {
    await expect(this.publishedPolicyRowByTitle(policyTitle)).toBeVisible({ timeout: 30_000 });
  }

  /** Version column is the 3rd column (Date, Policy, Version). */
  async expectPublishedRowVersionColumnIs(policyTitle: string, versionText: string) {
    const row = this.publishedPolicyRowByTitle(policyTitle);
    await expect(row).toBeVisible({ timeout: 30_000 });
    const versionCell = row.locator('td').nth(2);
    await expect(versionCell).toContainText(versionText, { timeout: 15_000 });
  }

  buildEditedDocxPath(downloadPath: string, uniqueSuffix: string): string {
    const parsed = path.parse(downloadPath);
    return path.join(parsed.dir, `${parsed.name}_${uniqueSuffix}${parsed.ext || '.docx'}`);
  }
}
