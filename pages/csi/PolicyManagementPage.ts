import { expect, type Locator } from '@playwright/test';
import * as path from 'path';
import { CSI_BASE_URL, CSI_POLICY_DETAIL_PATH } from '../../config/csi';
import { BasePage } from '../BasePage';

export class CsiPolicyManagementPage extends BasePage {
  readonly policyTitleInput = this.page.getByRole('textbox', { name: 'Policy Title*' });
  readonly referenceNumberInput = this.page.getByRole('textbox', { name: 'Reference Number*' });
  readonly ownerSelect = this.page.getByLabel('Owner');
  readonly downloadTemplateButton = this.page.getByRole('button', { name: /Download and modify template/i });
  readonly wizardNextButton = this.page.getByRole('button', { name: 'Next', exact: true });
  readonly submitForReviewButton = this.page.getByRole('button', { name: 'Submit for Review' });
  /** PM-016: shown beside Submit for Review on the final wizard step when publishing without review. */
  readonly publishPolicyWizardButton = this.page.getByRole('button', { name: 'Publish' });

  private async safeSleep(ms: number) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private policyRecipientsGrid() {
    return this.page.getByRole('grid').filter({
      has: this.page.getByRole('columnheader', { name: 'Email' }),
    });
  }

  private viewPoliciesGrid() {
    return this.page.getByRole('grid').filter({
      has: this.page.getByRole('columnheader', { name: 'Policy' }),
    });
  }

  private policyRowByTitle(policyTitle: string): Locator {
    return this.viewPoliciesGrid().getByRole('row').filter({
      has: this.page.getByRole('gridcell', { name: policyTitle }),
    });
  }

  private recipientRowByEmail(email: string): Locator {
    return this.policyRecipientsGrid().getByRole('row').filter({
      has: this.page.getByRole('gridcell', { name: email }),
    });
  }

  private async fillTextboxNearLabel(labelText: string, value: string, exactLabel = false) {
    const label = this.page.getByText(labelText, { exact: exactLabel });
    await expect(label).toBeVisible({ timeout: 15_000 });
    const handle = await label.evaluateHandle((labelEl) => {
      let container: HTMLElement | null = labelEl.parentElement;
      while (container) {
        const input = container.querySelector(
          'input[type="text"]:not([disabled]), input[type="search"]:not([disabled]), textarea:not([disabled])',
        );
        if (input) {
          return input;
        }
        container = container.parentElement;
      }
      return null;
    });
    const element = handle.asElement();
    expect(element).not.toBeNull();
    await element!.fill(value);
    await handle.dispose();
  }

  private async fillNumberNearLabel(labelText: string, value: string) {
    const label = this.page.getByText(labelText);
    await expect(label).toBeVisible({ timeout: 15_000 });
    const handle = await label.evaluateHandle((labelEl) => {
      let container: HTMLElement | null = labelEl.parentElement;
      while (container) {
        const input = container.querySelector(
          'input[type="number"]:not([disabled])',
        ) as HTMLInputElement | null;
        if (input) {
          return input;
        }
        container = container.parentElement;
      }
      return null;
    });
    const element = handle.asElement();
    expect(element).not.toBeNull();
    await element!.fill(value);
    await handle.dispose();
  }

  private async selectNativeDropdownNearText(anchorText: string, optionLabel: string) {
    const anchor = this.page.getByText(anchorText);
    await expect(anchor).toBeVisible({ timeout: 15_000 });
    const selected = await anchor.evaluate((anchorEl, label) => {
      let container: HTMLElement | null = anchorEl.parentElement;
      while (container) {
        const select = container.querySelector('select:not([disabled])') as HTMLSelectElement | null;
        if (select) {
          const option = Array.from(select.options).find((opt) => opt.textContent?.trim() === label);
          if (option) {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        container = container.parentElement;
      }
      return false;
    }, optionLabel);
    expect(selected).toBe(true);
  }

  private async clickTomorrowInOpenDatepicker() {
    const calendar = this.page.getByRole('dialog');
    await expect(calendar).toBeVisible({ timeout: 15_000 });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const fullDateLabel = tomorrow.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const labelCell = calendar.getByRole('button', { name: fullDateLabel });
      if (await labelCell.isVisible().catch(() => false)) {
        await labelCell.click();
        return;
      }

      const nextMonth = calendar.getByRole('button', { name: /next month/i });
      if (await nextMonth.isVisible().catch(() => false)) {
        await nextMonth.click();
      } else {
        break;
      }
    }

    throw new Error(`Could not select tomorrow in date picker: ${fullDateLabel}`);
  }

  private async policyFileInputHandle() {
    const anchor = this.page.getByText('Create Your Own Policy', { exact: true });
    await expect(anchor).toBeVisible({ timeout: 15_000 });
    return anchor.evaluateHandle((anchorEl) => {
      let container: HTMLElement | null = anchorEl.parentElement;
      while (container) {
        const input = container.querySelector('input[type="file"]') as HTMLInputElement | null;
        if (input) {
          return input;
        }
        container = container.parentElement;
      }
      return null;
    });
  }

  private async clickRecipientsSearchButton() {
    const part2 = this.page.getByText('Part 2', { exact: true });
    await expect(part2).toBeVisible({ timeout: 15_000 });
    const clicked = await part2.evaluate((el) => {
      let node: HTMLElement | null = el as HTMLElement;
      while (node) {
        const button = Array.from(node.querySelectorAll('button')).find(
          (btn) => btn.textContent?.trim() === 'Search',
        );
        if (button) {
          button.click();
          return true;
        }
        node = node.parentElement;
      }
      return false;
    });
    expect(clicked).toBe(true);
  }

  private async clickWizardPrimaryNext() {
    const buttons = await this.wizardNextButton.all();
    const btn = buttons[buttons.length - 1] ?? this.wizardNextButton;
    await btn.scrollIntoViewIfNeeded();
    try {
      await btn.click({ timeout: 10_000 });
    } catch {
      await btn.click({ force: true });
    }
  }

  /** PM-031: direct navigation to policy detail (cross-org access check). */
  async openPolicyDetail(policyId: number) {
    await this.page.goto(`${CSI_BASE_URL}${CSI_POLICY_DETAIL_PATH}?PolicyId=${policyId}`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectPolicyDetailNoPermissionMessage() {
    await expect(
      this.page.getByText("You don't have permissions to view this screen.", { exact: true }),
    ).toBeVisible({ timeout: 60_000 });
  }

  async openPolicyTemplateLibrary() {
    await this.page.goto(`${CSI_BASE_URL}/PolicyTemplateLibrary`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page.getByRole('button', { name: 'Preview' }).first()).toBeVisible({ timeout: 60_000 });
  }

  async cloneFirstPolicyTemplate() {
    const actionsMenus = await this.page.getByRole('menuitem', { name: 'Actions' }).all();
    expect(actionsMenus.length).toBeGreaterThan(0);
    await actionsMenus[0].click();

    const clone = this.page.getByRole('button', { name: /Clone Template/i });
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
    const handle = await this.policyFileInputHandle();
    const element = handle.asElement();
    expect(element).not.toBeNull();
    await element!.setInputFiles(absolutePath);
    await handle.dispose();
  }

  async expectDocxUploaded() {
    await expect(this.page.getByText('Uploaded', { exact: true })).toBeVisible({ timeout: 60_000 });
  }

  async goToNextWizardStep() {
    await this.clickWizardPrimaryNext();
  }

  async waitForAcknowledgementSection() {
    await expect(this.page.getByLabel(/Acknowledgement Type/i)).toBeVisible({ timeout: 60_000 });
  }

  async selectAcknowledgementTypeCompulsory() {
    await this.page.getByLabel(/Acknowledgement Type/i).selectOption({ label: 'Compulsory' });
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
    await this.selectNativeDropdownNearText('(iii) Select the Due Date of the Policy.', 'Days');
    await this.fillNumberNearLabel('(iii) Select the Due Date of the Policy.', String(dueInDays));
  }

  async selectReviewNotRequiredNo() {
    await this.page.getByRole('radio', { name: 'No', exact: true }).check();
  }

  async fillReviewDueInDays(dueInDays: number) {
    await this.selectNativeDropdownNearText('How often would you like to Re-review this policy?', 'Days');
    await this.fillNumberNearLabel('How often would you like to Re-review this policy?', String(dueInDays));
  }

  async searchIndividualsAndSelectLoginUser(loginEmail: string, searchToken: string) {
    await expect(this.page.getByText('Recipients:', { exact: true })).toBeVisible({ timeout: 30_000 });
    await this.fillTextboxNearLabel('Recipients:', searchToken);
    await this.clickRecipientsSearchButton();

    const row = this.recipientRowByEmail(loginEmail);
    await expect(row).toBeVisible({ timeout: 30_000 });
    await row.getByRole('checkbox').check();

    await this.clickWizardPrimaryNext();
  }

  /**
   * PM-016: same grid search/select as {@link searchIndividualsAndSelectLoginUser} but kept separate so PM-001
   * stays unchanged and this path can diverge if the acknowledger selection rules change.
   */
  async searchIndividualsAndSelectAcknowledgerUser(acknowledgerEmail: string, searchToken: string) {
    await expect(this.page.getByText('Recipients:', { exact: true })).toBeVisible({ timeout: 30_000 });
    await this.fillTextboxNearLabel('Recipients:', searchToken);
    await this.clickRecipientsSearchButton();

    const row = this.recipientRowByEmail(acknowledgerEmail);
    await expect(row).toBeVisible({ timeout: 30_000 });
    await row.getByRole('checkbox').check();

    await this.clickWizardPrimaryNext();
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
    const viewButtons = await this.page.getByRole('button', { name: 'View' }).all();
    expect(viewButtons.length).toBeGreaterThan(0);
    await viewButtons[0].click();
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
    const row = this.policyRowByTitle(policyTitle);
    await expect(row).toBeVisible({ timeout: 60_000 });
    await expect(row.getByRole('gridcell', { name: /Pending For Approval/i })).toBeVisible({
      timeout: 30_000,
    });
  }

  async openViewPolicies() {
    await this.page.goto(`${CSI_BASE_URL}/ViewPolicies`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.viewPoliciesGrid()).toBeVisible({ timeout: 60_000 });
  }

  /** PM-010: walk policy rows top-down; first ● Pending For Approval → status cell + Review link. */
  async openReviewForFirstPendingForApproval() {
    const grid = this.viewPoliciesGrid();
    await expect(grid).toBeVisible({ timeout: 60_000 });
    const pendingLabel = '● Pending For Approval';
    const rows = await grid.getByRole('row').all();
    for (const row of rows) {
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

  /** PM-026: View Policies screen (OutSystems `/Avotech/ViewPolicies`). */
  async gotoAvotechViewPolicies() {
    await this.page.goto(`${CSI_BASE_URL}/Avotech/ViewPolicies`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.viewPoliciesGrid()).toBeVisible({ timeout: 60_000 });
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
    const grid = this.viewPoliciesGrid();
    await grid.getByRole('columnheader', { name: 'Version' }).click();
    await this.safeSleep(500);
  }

  /**
   * PM-026: first row (top → bottom) with an `Update Version 1` control on Published Policies.
   * Requires at least one published policy still on version 1 with a pending update in the tenant.
   */
  async clickFirstPublishedRowUpdateVersionOne() {
    const grid = this.viewPoliciesGrid();
    const link = grid.getByRole('link', { name: /Update Version\s*1/i }).first();
    await expect(link).toBeVisible({ timeout: 60_000 });
    await link.click();
  }

  async clickPolicyTitleBreadcrumbLink() {
    const label = this.page.getByText('Policy Title', { exact: true });
    await expect(label).toBeVisible({ timeout: 60_000 });
    const clicked = await label.evaluate((el) => {
      const box =
        (el.closest('.template-info-box') as HTMLElement | null) ??
        (el.closest('[id="policyTitle"]') as HTMLElement | null);
      const link = box?.querySelector('a[data-link]') as HTMLElement | null;
      if (link) {
        link.click();
        return true;
      }
      return false;
    });
    expect(clicked).toBe(true);
  }

  async clickPolicyUpdateWizardNextFirst() {
    const nextButtons = await this.page.getByRole('button', { name: 'Next' }).all();
    expect(nextButtons.length).toBeGreaterThan(0);
    await nextButtons[0].click();
  }

  async clickPolicyUpdateWizardNextExact() {
    await this.safeSleep(3000);
    await expect(this.wizardNextButton).toBeVisible({ timeout: 60_000 });
    await this.wizardNextButton.click();
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
    const searchButtons = await this.page.getByRole('button', { name: 'Search' }).all();
    expect(searchButtons.length).toBeGreaterThan(0);
    await searchButtons[0].click();
    await expect(this.viewPoliciesGrid()).toBeVisible({ timeout: 30_000 });
  }

  async openReviewLinkForRowWithPolicyTitle(policyTitle: string) {
    const row = this.policyRowByTitle(policyTitle);
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
    await expect(this.policyRowByTitle(policyTitle)).toBeVisible({ timeout: 30_000 });
  }

  async expectPublishedRowVersionColumnIs(policyTitle: string, versionText: string) {
    const row = this.policyRowByTitle(policyTitle);
    await expect(row).toBeVisible({ timeout: 30_000 });
    await expect(row.getByRole('gridcell', { name: versionText })).toBeVisible({ timeout: 15_000 });
  }

  /**
   * PM-026: assert the Version column only. Substring match on e.g. `2` also hits date, policy title,
   * and the `Update Version 2` action cell in the same row.
   */
  async expectPublishedRowVersionColumnIsExact(policyTitle: string, versionText: string) {
    const row = this.policyRowByTitle(policyTitle);
    await expect(row).toBeVisible({ timeout: 30_000 });
    await expect(row.getByRole('gridcell', { name: versionText, exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  buildEditedDocxPath(downloadPath: string, uniqueSuffix: string): string {
    const parsed = path.parse(downloadPath);
    return path.join(parsed.dir, `${parsed.name}_${uniqueSuffix}${parsed.ext || '.docx'}`);
  }
}
