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
      const isFile = await first.evaluate((el) => (el as { type: string }).type === 'file');
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

  async submitForReview() {
    await expect(this.submitForReviewButton).toBeVisible({ timeout: 60_000 });
    await this.submitForReviewButton.click();
  }

  async expectPolicyCreated() {
    await expect(this.page.getByText('Policy Created', { exact: true })).toBeVisible({ timeout: 120_000 });
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

  buildEditedDocxPath(downloadPath: string, uniqueSuffix: string): string {
    const parsed = path.parse(downloadPath);
    return path.join(parsed.dir, `${parsed.name}_${uniqueSuffix}${parsed.ext || '.docx'}`);
  }
}
