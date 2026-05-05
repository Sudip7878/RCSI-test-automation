import { expect } from '@playwright/test';
import { CSI_BASE_URL } from '../../config/csi';
import { BasePage } from '../BasePage';

/** VirtualSelect: up to 3 opens of the search field if options never render. */
const COURSE_SEARCH_MAX_ATTEMPTS = 3;

export class CsiTrainingPage extends BasePage {
  readonly setupNewDistributionButton = this.page.getByRole('button', { name: 'Setup New Distribution' });
  readonly distributionNameInput = this.page.locator('#Input_name');
  readonly nextButton = this.page.getByRole('button', { name: 'Next' });
  readonly distributeButton = this.page.getByRole('button', { name: 'Distribute' });
  readonly distributionViewRadio = this.page.getByRole('radio', { name: 'Distribution View' });

  private async safeSleep(ms: number) {
    if (this.page.isClosed()) {
      return;
    }
    await this.page.waitForTimeout(ms).catch(() => {});
  }

  private async clickTodayInOpenDatepicker() {
    const calendar = this.page.locator('.flatpickr-calendar.open[role="dialog"]');
    await expect(calendar).toBeVisible({ timeout: 15_000 });

    const todayCell = calendar.locator('.flatpickr-day.today[role="button"]').first();
    if (await todayCell.isVisible().catch(() => false)) {
      await todayCell.click();
      return;
    }

    const today = new Date();
    const fullDateLabel = today.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const labelCell = calendar.locator(`.flatpickr-day[role="button"][aria-label="${fullDateLabel}"]`);
    await expect(labelCell.first()).toBeVisible({ timeout: 10_000 });
    await labelCell.first().click();
  }

  async openCourseDistribution() {
    await this.page.goto(`${CSI_BASE_URL}/CourseDistribution`);
    await expect(this.setupNewDistributionButton).toBeVisible({ timeout: 30_000 });
  }

  async startNewDistribution() {
    await expect(this.setupNewDistributionButton).toBeVisible();
    await this.setupNewDistributionButton.click();
    await expect(this.distributionNameInput).toBeVisible({ timeout: 30_000 });
  }

  async fillDistributionName(name: string) {
    await this.distributionNameInput.click();
    await this.distributionNameInput.fill(name);
  }

  /**
   * `courseSlotIndex`: 0 = first `Search...`, 1 = second (after first course is chosen).
   */
  async selectCourseByVirtualSelectSearch(courseName: string, courseSlotIndex: number) {
    const searchTriggers = this.page.getByText('Search...', { exact: true });
    for (let attempt = 0; attempt < COURSE_SEARCH_MAX_ATTEMPTS; attempt += 1) {
      const trigger =
        courseSlotIndex === 0 ? searchTriggers.first() : searchTriggers.last();
      await expect(trigger).toBeVisible({ timeout: 15_000 });
      await trigger.click();
      await this.safeSleep(250);

      const option = this.page.getByRole('option', { name: courseName }).first();
      const ready = await option.isVisible().catch(() => false);
      if (ready) {
        await option.click();
        return;
      }
    }

    throw new Error(`Course list did not show option: ${courseName}`);
  }

  async goToNextWizardStep() {
    await expect(this.nextButton).toBeVisible();
    await this.nextButton.click();
  }

  async pickTodayDistributionStartDate(maxAttempts = 4) {
    const dateCombobox = this.page.getByRole('combobox', { name: 'Select a date' }).first();
    await expect(dateCombobox).toBeVisible({ timeout: 15_000 });

    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        await dateCombobox.click();
        await this.clickTodayInOpenDatepicker();
        return;
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts - 1) {
          throw lastError;
        }
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.safeSleep(400);
      }
    }
  }

  async searchUsersAndSelectRowByEmail(loginEmail: string, searchToken: string) {
    const userSearchInput = this.page.locator('input[id*="Input_search"]').first();
    await expect(userSearchInput).toBeVisible({ timeout: 15_000 });
    await userSearchInput.click();
    await userSearchInput.fill(searchToken);

    await this.page.getByRole('button', { name: 'Search' }).first().click();

    const emailCell = this.page.getByRole('gridcell', { name: loginEmail });
    await expect(emailCell).toBeVisible({ timeout: 30_000 });

    const row = this.page.locator('tr.table-row').filter({ has: emailCell });
    const rowCheckbox = row.locator('td input[type="checkbox"].checkbox').first();
    await expect(rowCheckbox).toBeVisible();
    await rowCheckbox.check();
  }

  async checkOptionalNotifySwitch() {
    const sw = this.page.locator('#Switch1').first();
    const isVisible = await sw.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!isVisible) {
      return;
    }
    await sw.check({ timeout: 3_000 }).catch(() => {});
  }

  async submitDistribute() {
    await expect(this.distributeButton).toBeVisible({ timeout: 30_000 });
    await this.distributeButton.click();
    await this.page.waitForURL(/\/CourseDistribution/, { timeout: 60_000 });
  }

  async openDistributionView() {
    await expect(this.distributionViewRadio).toBeVisible({ timeout: 30_000 });
    await this.distributionViewRadio.click();
  }

  async expectDistributionListed(distributionName: string) {
    await expect(this.page.getByRole('gridcell', { name: distributionName })).toBeVisible({
      timeout: 30_000,
    });
  }
}
