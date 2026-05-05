import { expect, type Locator } from '@playwright/test';
import { CSI_BASE_URL } from '../../config/csi';
import { BasePage } from '../BasePage';

export class CsiPhisingPage extends BasePage {
  readonly firstTemplateSelectButton = this.page.getByRole('button', { name: 'Select this attack' }).first();
  readonly nextButton = this.page.getByRole('button', { name: 'Next', exact: true });
  readonly individualsRadio = this.page.getByRole('radio', { name: 'Individuals' });
  readonly userSearchInput = this.page.locator('#b20-b1-Input_search');
  readonly userSearchButton = this.page.getByRole('button', { name: 'Search' }).first();
  readonly testNameInput = this.page.getByRole('textbox', { name: 'Example: HSBC Phishing Test' });
  readonly startDateCombobox = this.page.getByRole('combobox', { name: 'Select a date.' }).first();
  readonly durationLabel = this.page.getByText('Duration', { exact: true });
  readonly distributeButton = this.page.getByRole('button', { name: 'Distribute' });

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
      const canGoNext = await nextMonthButton.isVisible().catch(() => false);
      if (!canGoNext) {
        break;
      }
      await nextMonthButton.click();
    }

    throw new Error(`Could not find tomorrow date cell in date picker: ${fullDateLabel}`);
  }

  private async selectDurationPreferringDay() {
    await expect(this.durationLabel).toBeVisible({ timeout: 15_000 });
    await this.durationLabel.click();

    const dayOption = this.page.getByRole('option', { name: /^day$/i }).first();
    if (await dayOption.isVisible().catch(() => false)) {
      await dayOption.click();
      return;
    }

    const options = this.page.getByRole('option');
    const count = await options.count();
    for (let i = 0; i < count; i += 1) {
      const option = options.nth(i);
      if (await option.isVisible().catch(() => false)) {
        await option.click();
        return;
      }
    }

    throw new Error('Duration options were not visible.');
  }

  private userRowByEmail(email: string): Locator {
    return this.page.locator('tr.table-row').filter({ has: this.page.getByRole('gridcell', { name: email }) });
  }

  async openPhisingTestCreation() {
    await this.page.goto(`${CSI_BASE_URL}/Avotech/phishingTestEdit?id=0`);
    await expect(this.firstTemplateSelectButton).toBeVisible({ timeout: 30_000 });
  }

  async selectFirstAttackTemplateAndContinue() {
    await this.firstTemplateSelectButton.click();
    await expect(this.nextButton).toBeVisible({ timeout: 15_000 });
    await this.nextButton.click();
  }

  async chooseIndividualsAndSelectLoginUser(loginEmail: string, searchToken: string) {
    await expect(this.individualsRadio).toBeVisible({ timeout: 30_000 });
    await this.individualsRadio.click();

    await expect(this.userSearchInput).toBeVisible({ timeout: 15_000 });
    await this.userSearchInput.click();
    await this.userSearchInput.fill(searchToken);
    await this.userSearchButton.click();

    const row = this.userRowByEmail(loginEmail);
    await expect(row).toBeVisible({ timeout: 30_000 });

    const rowCheckbox = row.locator('input[type="checkbox"].checkbox').first();
    await expect(rowCheckbox).toBeVisible();
    await rowCheckbox.check();

    await expect(this.nextButton).toBeVisible({ timeout: 15_000 });
    await this.nextButton.click();
  }

  async fillPhisingTestDetailsAndContinue(testName: string) {
    await expect(this.testNameInput).toBeVisible({ timeout: 30_000 });
    await this.testNameInput.click();
    await this.testNameInput.fill(testName);

    await expect(this.startDateCombobox).toBeVisible({ timeout: 15_000 });
    await this.startDateCombobox.click();
    await this.clickTomorrowInOpenDatepicker();

    await this.selectDurationPreferringDay();

    await expect(this.nextButton).toBeVisible({ timeout: 15_000 });
    await this.nextButton.click();
  }

  async finalizeAndDistribute() {
    await expect(this.nextButton).toBeVisible({ timeout: 30_000 });
    await this.nextButton.click();

    await expect(this.distributeButton).toBeVisible({ timeout: 30_000 });
    await this.distributeButton.click();
  }

  async expectPhisingTestCreated(testName: string) {
    await expect(this.page.getByText(testName, { exact: true })).toBeVisible({ timeout: 60_000 });
  }
}
