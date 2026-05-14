import { readFileSync } from 'node:fs';

import { expect, type Locator } from '@playwright/test';
import { CSI_BASE_URL } from '../../config/csi';
import { BasePage } from '../BasePage';

/** VirtualSelect: initial open + up to 2 retries if options do not render (TR-001). */
const COURSE_SEARCH_MAX_ATTEMPTS = 3;

export class CsiTrainingPage extends BasePage {
  readonly setupNewDistributionButton = this.page.getByRole('button', { name: 'Setup New Distribution' });
  readonly distributionNameInput = this.page.locator('#Input_name');
  readonly nextButton = this.page.getByRole('button', { name: 'Next', exact: true });
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
    await this.safeSleep(3000);
  }

  async startNewDistribution() {
    await expect(this.setupNewDistributionButton).toBeVisible();
    await this.setupNewDistributionButton.click();
    await expect(this.distributionNameInput).toBeVisible({ timeout: 30_000 });
  }

  /** 3s after fill so course VirtualSelect is not opened immediately (training flow). */
  async fillDistributionName(name: string) {
    await this.distributionNameInput.click();
    await this.distributionNameInput.fill(name);
    await this.safeSleep(3000);
  }

  /** Course step: `Search...` visible, then 3s for VirtualSelect to settle before opening. */
  private async waitForCourseSelectionStepReady() {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await expect(this.distributionNameInput).toBeVisible({ timeout: 15_000 });

    const searchTriggers = this.page.getByText('Search...', { exact: true });
    await expect(searchTriggers.first()).toBeVisible({ timeout: 15_000 });
    await this.safeSleep(3000);
    await expect(searchTriggers.first()).toBeVisible({ timeout: 10_000 });
  }

  /** `courseSlotIndex`: 0 = first `Search...`, 1 = second slot. */
  async selectCourseByVirtualSelectSearch(courseName: string, courseSlotIndex: number) {
    await this.waitForCourseSelectionStepReady();

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

  private static readonly myCourseCardTitleSelector =
    '.ThemeGrid_Width8 span.bold.OSFillParent[style*="font-size: 20px"], .ThemeGrid_Width8 span.bold.OSFillParent[style*="font-size:20px"]';

  /** Visible course titles under manager + self-registered lists for the active My Course tab. */
  private async readVisibleMyCourseCardTitlesFromDom(): Promise<string[]> {
    return await this.page.$$eval(
      '#MyCourseList_distribution [data-block="Training.MyCourseBlock"], #MyCourseList_self [data-block="Training.MyCourseBlock"]',
      (blocks, sel) => {
        const out: string[] = [];
        for (const block of blocks) {
          let el = block.querySelector(sel);
          if (!el) {
            el = block.querySelector('.ThemeGrid_Width8 span.bold.OSFillParent');
          }
          const t = el?.textContent?.replace(/\s+/g, ' ').trim();
          if (t) {
            out.push(t);
          }
        }
        return out;
      },
      CsiTrainingPage.myCourseCardTitleSelector,
    );
  }

  /** TR-001: each status tab — settle before click, after click, then scrape cards (same page). */
  private async activateMyCourseStatusTabAndReadTitles(tabLink: Locator): Promise<string[]> {
    await this.safeSleep(3000);
    await expect(tabLink).toBeVisible({ timeout: 15_000 });
    await tabLink.click();
    await this.safeSleep(5000);
    return this.readVisibleMyCourseCardTitlesFromDom();
  }

  /**
   * TR-001: `/myCourse`, then Ongoing → Passed → Missed → Failed; union visible titles from each tab.
   */
  async openMyCourseAndCollectRegisteredCourseTitles(): Promise<string[]> {
    await this.page.goto(`${CSI_BASE_URL}/myCourse`);
    await this.page.waitForLoadState('domcontentloaded');
    // Breadcrumb also exposes "My Course" (plain span); page title uses `span.bold`.
    await expect(this.page.locator('span.bold', { hasText: /^My Course$/ })).toBeVisible({
      timeout: 60_000,
    });

    const aggregated = new Set<string>();
    const statusTabLinks: Locator[] = [
      this.page.getByRole('link', { name: 'Ongoing', exact: true }),
      this.page.getByRole('link', { name: 'Passed', exact: true }),
      // Accessible name often includes a trailing help icon (e.g. `Missed `).
      this.page.getByRole('link', { name: /^Missed\b/ }).first(),
      this.page.getByRole('link', { name: 'Failed', exact: true }),
    ];

    for (const link of statusTabLinks) {
      const batch = await this.activateMyCourseStatusTabAndReadTitles(link);
      for (const t of batch) {
        const s = t.trim();
        if (s) {
          aggregated.add(s);
        }
      }
    }

    return [...aggregated];
  }

  /**
   * TR-001 V2: pick the first visible VirtualSelect option in list order that is not in `excluded`
   * (not by fixed index). Closes dropdown and retries opening up to {@link COURSE_SEARCH_MAX_ATTEMPTS} times.
   */
  async selectFirstVisibleCourseOptionNotIn(
    excluded: ReadonlySet<string>,
    courseSlotIndex: number,
  ): Promise<string> {
    await this.waitForCourseSelectionStepReady();

    const searchTriggers = this.page.getByText('Search...', { exact: true });
    const trigger =
      courseSlotIndex === 0 ? searchTriggers.first() : searchTriggers.last();

    for (let openAttempt = 0; openAttempt < COURSE_SEARCH_MAX_ATTEMPTS; openAttempt += 1) {
      await expect(trigger).toBeVisible({ timeout: 15_000 });
      await trigger.click();
      await this.safeSleep(300);

      const options = this.page.getByRole('option');
      const count = await options.count();

      for (let i = 0; i < count; i += 1) {
        const opt = options.nth(i);
        if (!(await opt.isVisible().catch(() => false))) {
          continue;
        }
        const name = (await opt.textContent())?.replace(/\s+/g, ' ').trim() ?? '';
        if (!name || excluded.has(name)) {
          continue;
        }
        await opt.click();
        return name;
      }

      await this.page.keyboard.press('Escape').catch(() => {});
      await this.safeSleep(200);
    }

    throw new Error(
      `No VirtualSelect option found outside excluded set for slot ${courseSlotIndex}: ${[...excluded].join(', ')}`,
    );
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

  readonly exportCourseReportPdfButton = this.page.getByRole('button', { name: 'Export Page to PDF' });

  async openCourseReport() {
    await this.page.goto(`${CSI_BASE_URL}/CourseReport`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * TR-025: wait until the export control is visible, then enabled (report data finished loading).
   */
  async expectCourseReportExportReady() {
    await expect(this.exportCourseReportPdfButton).toBeVisible({ timeout: 60_000 });
    await expect(this.exportCourseReportPdfButton).toBeEnabled({ timeout: 120_000 });
  }

  async downloadCourseReportPdf(): Promise<Buffer> {
    await this.expectCourseReportExportReady();
    const downloadPromise = this.page.waitForEvent('download', { timeout: 120_000 });
    await this.exportCourseReportPdfButton.click();
    const download = await downloadPromise;
    const downloadedPath = await download.path();
    expect(downloadedPath, 'course report PDF should be written to a temp path').toBeTruthy();
    return readFileSync(downloadedPath as string);
  }

  readonly managerViewRadio = this.page.getByRole('radio', { name: 'Manager View' });
  readonly trainingStatisticBox = this.page.locator('#TrainingStatisticBox');

  async openCourseDashboard() {
    await this.page.goto(`${CSI_BASE_URL}/courseDashboard`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** TR-033: recorded 5s settle after switching to Manager View before asserting sections. */
  async switchToManagerViewAndSettle() {
    await expect(this.managerViewRadio).toBeVisible({ timeout: 60_000 });
    await this.managerViewRadio.click();
    await this.safeSleep(5000);
  }

  /** TR-033 visibility bundle (recorded-steps/Training/TR-033.txt). */
  async expectTr033ManagerDashboardSectionsVisible() {
    await expect(this.page.getByText('Cybersecurity Awareness Score')).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByText('Target Goal', { exact: true })).toBeVisible();
    await expect(this.page.getByText('Training Statistics')).toBeVisible();

    const stats = this.trainingStatisticBox;
    await expect(stats.getByText('Not Started')).toBeVisible();
    await expect(stats.getByText('In Progress')).toBeVisible();
    await expect(stats.getByText('Passed')).toBeVisible();
    await expect(stats.getByText('Failed')).toBeVisible();
    await expect(stats.getByText('Missed')).toBeVisible();

    await expect(this.page.getByText('Course Distribution', { exact: true })).toBeVisible();
    await expect(this.page.getByText('Most Active Employees')).toBeVisible();

    await expect(this.page.getByRole('columnheader', { name: 'User' })).toBeVisible();
    await expect(this.page.getByRole('columnheader', { name: 'Courses' })).toBeVisible();
    await expect(this.page.getByRole('columnheader', { name: 'Passed' })).toBeVisible();
    await expect(this.page.getByRole('columnheader', { name: 'Failed' })).toBeVisible();

    await expect(this.page.getByText('Employee activities')).toBeVisible();
    await expect(this.page.getByText('Users who missed course')).toBeVisible();
    await expect(this.page.getByText('Groups you managed')).toBeVisible();
  }
}

