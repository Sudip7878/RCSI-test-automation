import { readFileSync } from 'node:fs';

import { expect, type Locator } from '@playwright/test';
import { CSI_BASE_URL } from '../../config/csi';
import {
  TR011_COURSE_REGISTERED_MESSAGE,
  TR011_QUIZ_FAILURE_MESSAGE,
  TR011_QUIZ_QUESTION_COUNT,
  TR011_VIDEO_AFTER_SEEK_SETTLE_MS,
  TR011_VIDEO_PLAY_SETTLE_MS,
  TR022_COURSE_CARD_INITIAL_WAIT_MS,
  TR022_MY_COURSE_TAB_SETTLE_MS,
  csiTrainingFirstCourseName,
  csiTrainingSecondCourseName,
} from '../../utils/csi/trainingTestData';
import { BasePage } from '../BasePage';

/** VirtualSelect: initial open + up to 2 retries if options do not render (TR-001). */
const COURSE_SEARCH_MAX_ATTEMPTS = 3;

export class CsiTrainingPage extends BasePage {
  readonly setupNewDistributionButton = this.page.getByRole('button', { name: 'Setup New Distribution' });
  readonly myCourseSearchBox = this.page.getByRole('searchbox', { name: 'Search course' });
  readonly nextButton = this.page.getByRole('button', { name: 'Next', exact: true });
  readonly distributeButton = this.page.getByRole('button', { name: 'Distribute' });
  readonly distributionViewRadio = this.page.getByRole('radio', { name: 'Distribution View' });

  private async safeSleep(ms: number) {
    if (this.page.isClosed()) {
      return;
    }
    await this.page.waitForTimeout(ms).catch(() => {});
  }

  private courseDistributionGrid() {
    return this.page.getByRole('grid').filter({
      has: this.page.getByRole('columnheader', { name: 'Course Name' }),
    });
  }

  private targetUserGrid() {
    return this.page.getByRole('grid').filter({
      has: this.page.getByRole('columnheader', { name: 'Email' }),
    });
  }

  private targetUserRowByEmail(email: string) {
    return this.targetUserGrid().getByRole('row').filter({
      has: this.page.getByRole('gridcell', { name: email }),
    });
  }

  private distributionStartDateCombobox() {
    return this.page.getByRole('combobox', { name: 'Select a date' });
  }

  private async openCourseSearchCombobox(courseSlotIndex: number): Promise<Locator> {
    const searchComboboxes = this.page
      .getByRole('combobox', { name: 'Select an option' })
      .filter({ has: this.page.getByText('Search...', { exact: true }) });
    const triggers = await searchComboboxes.all();
    if (triggers.length === 0) {
      throw new Error('Course search combobox not found.');
    }
    const trigger = courseSlotIndex === 0 ? triggers[0] : triggers[triggers.length - 1];
    await expect(trigger).toBeVisible({ timeout: 15_000 });
    await trigger.click();
    await this.safeSleep(500);
    return trigger;
  }

  private async fillTextboxNearLabel(labelText: string, value: string) {
    const label = this.page.getByText(labelText, { exact: true });
    await expect(label).toBeVisible({ timeout: 15_000 });
    const handle = await label.evaluateHandle((labelEl) => {
      let container: HTMLElement | null = labelEl.parentElement;
      while (container) {
        const input = container.querySelector(
          'input[type="text"]:not([disabled])',
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

  private async expectTrainingStatisticsLegendLabel(label: string) {
    const visible = await this.page.getByText('Training Statistics', { exact: true }).evaluate(
      (heading, text) => {
        const box = heading.closest('.training-stat') as HTMLElement | null;
        if (!box) {
          return false;
        }
        return Array.from(box.querySelectorAll('span')).some(
          (span) => span.textContent?.trim() === text,
        );
      },
      label,
    );
    expect(visible).toBe(true);
  }

  private async clickTodayInOpenDatepicker() {
    const calendar = this.page.getByRole('dialog');
    await expect(calendar).toBeVisible({ timeout: 15_000 });

    const today = new Date();
    const fullDateLabel = today.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const todayButton = calendar.getByRole('button', { name: fullDateLabel });
    if (await todayButton.isVisible().catch(() => false)) {
      await todayButton.click();
      return;
    }

    const todayShort = today.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const shortButton = calendar.getByRole('button', { name: todayShort });
    await expect(shortButton).toBeVisible({ timeout: 10_000 });
    await shortButton.click();
  }

  async openCourseDistribution() {
    await this.page.goto(`${CSI_BASE_URL}/CourseDistribution`);
    await expect(this.setupNewDistributionButton).toBeVisible({ timeout: 30_000 });
    await this.safeSleep(3000);
  }

  async startNewDistribution() {
    await expect(this.setupNewDistributionButton).toBeVisible();
    await this.setupNewDistributionButton.click();
    await expect(this.page.getByText('Distribution Rule Name', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  }

  /** 3s after fill so course VirtualSelect is not opened immediately (training flow). */
  async fillDistributionName(name: string) {
    await this.fillTextboxNearLabel('Distribution Rule Name', name);
    await this.safeSleep(3000);
  }

  /** Course step: `Search...` visible, then 3s for VirtualSelect to settle before opening. */
  private async waitForCourseSelectionStepReady() {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await expect(this.page.getByText('Distribution Rule Name', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.courseDistributionGrid()).toBeVisible({ timeout: 15_000 });

    const searchComboboxes = this.page
      .getByRole('combobox', { name: 'Select an option' })
      .filter({ has: this.page.getByText('Search...', { exact: true }) });
    const triggers = await searchComboboxes.all();
    expect(triggers.length).toBeGreaterThan(0);
    await expect(triggers[0]).toBeVisible({ timeout: 15_000 });
    await this.safeSleep(3000);
    await expect(triggers[0]).toBeVisible({ timeout: 10_000 });
  }


  /**
   * TR-024: Opens the first course Search... combobox, types the known course
   * title into the VirtualSelect internal search box to filter the list, then
   * clicks the matching option. Use this instead of selectCourseByVirtualSelectSearch
   * when the exact course title is already known, because VirtualSelect only
   * renders a visible subset of options and won't show an item unless you
   * type to filter for it.
   */
  async searchAndSelectDistributionCourseByTitle(courseTitle: string) {
    await this.waitForCourseSelectionStepReady();

    for (let attempt = 0; attempt < COURSE_SEARCH_MAX_ATTEMPTS; attempt += 1) {
      await this.openCourseSearchCombobox(0);

      const searchBox = this.page.getByRole('textbox', { name: 'Search' });
      const searchBoxVisible = await searchBox
        .waitFor({ state: 'visible', timeout: 5_000 })
        .then(() => true)
        .catch(() => false);

      if (!searchBoxVisible) {
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.safeSleep(300);
        continue;
      }

      await searchBox.fill(courseTitle);

      const option = this.page.getByRole('option', { name: courseTitle });
      const optionVisible = await option
        .waitFor({ state: 'visible', timeout: 5_000 })
        .then(() => true)
        .catch(() => false);

      if (optionVisible) {
        await option.click();
        return;
      }

      await this.page.keyboard.press('Escape').catch(() => {});
      await this.safeSleep(300);
    }

    throw new Error(`TR-024: course dropdown did not show option after search: ${courseTitle}`);
  }

  async selectCourseByVirtualSelectSearch(courseName: string, courseSlotIndex: number) {
    await this.waitForCourseSelectionStepReady();

    for (let attempt = 0; attempt < COURSE_SEARCH_MAX_ATTEMPTS; attempt += 1) {
      await this.openCourseSearchCombobox(courseSlotIndex);

      const options = await this.page.getByRole('option', { name: courseName }).all();
      for (const option of options) {
        if (await option.isVisible().catch(() => false)) {
          await option.click();
          return;
        }
      }

      await this.page.keyboard.press('Escape').catch(() => {});
      await this.safeSleep(200);
    }

    throw new Error(`Course list did not show option: ${courseName}`);
  }

  /** Visible course titles on the active My Course tab (distribution + self-registered lists). */
  private async readVisibleMyCourseCardTitles(): Promise<string[]> {
    return this.page.evaluate(() => {
      const listRoots = [
        document.querySelector('#MyCourseList_distribution .course-list'),
        document.querySelector('#MyCourseList_self .course-list'),
        document.querySelector('.list.course-list'),
      ].filter((node): node is Element => node !== null);

      const uniqueRoots = [...new Set(listRoots)];
      const titles: string[] = [];

      for (const list of uniqueRoots) {
        for (const card of Array.from(list.querySelectorAll('.course-card'))) {
          const titleSpan = card.querySelector(
            '.ThemeGrid_Width8 span.bold.OSFillParent',
          ) as HTMLElement | null;
          const title = titleSpan?.textContent?.replace(/\s+/g, ' ').trim();
          if (title) {
            titles.push(title);
          }
        }
      }

      return [...new Set(titles)];
    });
  }

  private normalizeCourseTitle(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private isCourseTitleExcluded(title: string, excluded: ReadonlySet<string>): boolean {
    const normalized = this.normalizeCourseTitle(title).toLowerCase();
    for (const entry of excluded) {
      if (this.normalizeCourseTitle(entry).toLowerCase() === normalized) {
        return true;
      }
    }
    return false;
  }

  private async selectFirstVisibleCourseOptionFromExpanded(
    combobox: Locator,
    excluded?: ReadonlySet<string>,
  ): Promise<string | null> {
    await expect(combobox).toHaveAttribute('aria-expanded', 'true', { timeout: 12_000 });
    await this.safeSleep(500);

    const listboxes = await this.page.getByRole('listbox').all();
    for (let index = listboxes.length - 1; index >= 0; index -= 1) {
      const options = await listboxes[index].getByRole('option').all();
      for (const option of options) {
        if (!(await option.isVisible().catch(() => false))) {
          continue;
        }
        const name = this.normalizeCourseTitle((await option.textContent()) ?? '');
        if (!name || (excluded && this.isCourseTitleExcluded(name, excluded))) {
          continue;
        }
        await option.click();
        return name;
      }
    }

    return combobox.evaluate((combo, excludedList) => {
      const excludedSet =
        excludedList === null
          ? null
          : new Set(
              (excludedList as string[]).map((entry) =>
                entry.replace(/\s+/g, ' ').trim().toLowerCase(),
              ),
            );
      const panelId = combo.getAttribute('aria-controls');
      const panel = panelId ? document.getElementById(panelId) : null;
      const roots: ParentNode[] = panel ? [panel, document.body] : [document.body];

      for (const root of roots) {
        const scrollArea = root.querySelector('.vscomp-options') as HTMLElement | null;
        if (scrollArea) {
          scrollArea.scrollTop = 0;
        }
        const options = Array.from(
          root.querySelectorAll('[role="option"], .vscomp-option'),
        ) as HTMLElement[];
        for (const el of options) {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') {
            continue;
          }
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) {
            continue;
          }
          const name = el.textContent?.replace(/\s+/g, ' ').trim() ?? '';
          if (!name || (excludedSet && excludedSet.has(name.toLowerCase()))) {
            continue;
          }
          el.click();
          return name;
        }
      }
      return null;
    }, excluded ? [...excluded] : null);
  }

  private prestoredFallbackCourseNames(courseSlotIndex: number): string[] {
    const first = csiTrainingFirstCourseName();
    const second = csiTrainingSecondCourseName();
    return courseSlotIndex === 0 ? [first, second] : [second, first];
  }

  private async trySelectCourseOptionByName(
    courseName: string,
    courseSlotIndex: number,
  ): Promise<string | null> {
    const target = this.normalizeCourseTitle(courseName).toLowerCase();

    return this.selectWithCourseDropdownRetries(courseSlotIndex, async (combobox) => {
      const options = await this.page.getByRole('option', { name: courseName }).all();
      for (const option of options) {
        if (await option.isVisible().catch(() => false)) {
          await option.click();
          return this.normalizeCourseTitle(courseName);
        }
      }

      return combobox.evaluate((combo, wanted) => {
        const panelId = combo.getAttribute('aria-controls');
        const panel = panelId ? document.getElementById(panelId) : null;
        const roots: ParentNode[] = panel ? [panel, document.body] : [document.body];

        for (const root of roots) {
          const optionNodes = Array.from(
            root.querySelectorAll('[role="option"], .vscomp-option'),
          ) as HTMLElement[];
          for (const el of optionNodes) {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') {
              continue;
            }
            const name = el.textContent?.replace(/\s+/g, ' ').trim() ?? '';
            if (name.toLowerCase() !== wanted) {
              continue;
            }
            el.click();
            return name;
          }
        }
        return null;
      }, target);
    });
  }

  private async selectWithCourseDropdownRetries(
    courseSlotIndex: number,
    pick: (combobox: Locator) => Promise<string | null>,
  ): Promise<string | null> {
    for (let openAttempt = 0; openAttempt < COURSE_SEARCH_MAX_ATTEMPTS; openAttempt += 1) {
      const combobox = await this.openCourseSearchCombobox(courseSlotIndex);
      const selected = await pick(combobox);
      if (selected) {
        return selected;
      }

      await this.page.keyboard.press('Escape').catch(() => {});
      await this.safeSleep(200);
    }

    return null;
  }

  /** TR-001: each status tab — settle before click, after click, then scrape cards. */
  private async activateMyCourseStatusTabAndReadTitles(tabLink: Locator): Promise<string[]> {
    await this.safeSleep(3000);
    await expect(tabLink).toBeVisible({ timeout: 15_000 });
    await tabLink.click();
    await this.safeSleep(5000);
    return this.readVisibleMyCourseCardTitles();
  }

  /**
   * TR-001: `/myCourse`, then Ongoing → Passed → Missed → Failed; union visible titles from each tab.
   */
  async openMyCourseAndCollectRegisteredCourseTitles(): Promise<string[]> {
    await this.page.goto(`${CSI_BASE_URL}/myCourse`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page.getByRole('link', { name: 'Ongoing', exact: true })).toBeVisible({
      timeout: 60_000,
    });

    const aggregated = new Set<string>();
    const statusTabLinks: Locator[] = [
      this.page.getByRole('link', { name: 'Ongoing', exact: true }),
      this.page.getByRole('link', { name: 'Passed', exact: true }),
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
   * TR-001: prefer first visible option not in `excluded`; else pre-stored courses from training.json; else any option.
   */
  async selectFirstVisibleCourseOptionNotIn(
    excluded: ReadonlySet<string>,
    courseSlotIndex: number,
  ): Promise<string> {
    await this.waitForCourseSelectionStepReady();

    const preferred = await this.selectWithCourseDropdownRetries(courseSlotIndex, (combobox) =>
      this.selectFirstVisibleCourseOptionFromExpanded(combobox, excluded),
    );
    if (preferred) {
      return preferred;
    }

    for (const courseName of this.prestoredFallbackCourseNames(courseSlotIndex)) {
      const fallback = await this.trySelectCourseOptionByName(courseName, courseSlotIndex);
      if (fallback) {
        return fallback;
      }
    }

    const anyCourse = await this.selectWithCourseDropdownRetries(courseSlotIndex, (combobox) =>
      this.selectFirstVisibleCourseOptionFromExpanded(combobox),
    );
    if (anyCourse) {
      return anyCourse;
    }

    throw new Error(
      `No VirtualSelect course option could be selected for slot ${courseSlotIndex}.`,
    );
  }

  /**
   * VirtualSelect renders only the currently-visible rows (virtual scrolling).
   * The scroll container is `.vscomp-options-container` (the element with max-height).
   * `.vscomp-options` itself uses transform: translate3d — setting scrollTop on it does nothing.
   * This method scrolls `.vscomp-options-container` one viewport-height at a time, waits for
   * VirtualSelect to re-render the new batch, then looks for the first option NOT in `excluded`.
   * Must be called while the dropdown is already expanded.
   */
  private async scrollVsDropdownAndPickNonExcluded(
    excluded: ReadonlySet<string>,
  ): Promise<string | null> {
    // The scrollable viewport is .vscomp-options-container, not .vscomp-options
    const scrollContainer = this.page
      .locator('.vscomp-dropbox-container')
      .last()
      .locator('.vscomp-options-container');

    if (!(await scrollContainer.isVisible().catch(() => false))) {
      return null;
    }

    const { scrollHeight, clientHeight } = await scrollContainer.evaluate((el: HTMLElement) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));

    // Nothing to scroll — caller already checked the only visible batch
    if (scrollHeight <= clientHeight) {
      return null;
    }

    const steps = Math.ceil(scrollHeight / Math.max(clientHeight, 1)) + 1;

    for (let step = 1; step <= steps; step++) {
      const nextTop = Math.min(step * clientHeight, scrollHeight);

      // Scroll and dispatch so VirtualSelect's listener fires even in headless mode
      await scrollContainer.evaluate((el: HTMLElement, top: number) => {
        el.scrollTop = top;
        el.dispatchEvent(new Event('scroll', { bubbles: true }));
      }, nextTop);
      await this.safeSleep(400);

      // Playwright locator pass — options inside the open listbox container
      const listbox = this.page.locator('.vscomp-dropbox-container').last();
      const options = await listbox.getByRole('option').all();
      for (const option of options) {
        if (!(await option.isVisible().catch(() => false))) {
          continue;
        }
        const name = this.normalizeCourseTitle((await option.textContent()) ?? '');
        if (!name || this.isCourseTitleExcluded(name, excluded)) {
          continue;
        }
        await option.click();
        return name;
      }

      // DOM evaluate pass — query from the listbox root to reach re-rendered options
      const found = await listbox.evaluate((root, excList) => {
        const excSet = new Set(
          (excList as string[]).map((e) => e.replace(/\s+/g, ' ').trim().toLowerCase()),
        );
        const opts = Array.from(
          root.querySelectorAll('[role="option"], .vscomp-option'),
        ) as HTMLElement[];
        for (const el of opts) {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') {
            continue;
          }
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) {
            continue;
          }
          const name = el.textContent?.replace(/\s+/g, ' ').trim() ?? '';
          if (!name || excSet.has(name.toLowerCase())) {
            continue;
          }
          el.click();
          return name;
        }
        return null;
      }, [...excluded]);

      if (found) {
        return found;
      }
    }

    return null;
  }

  /**
   * TR-004: same as selectFirstVisibleCourseOptionNotIn but enforces the exclusion set at every
   * fallback level — the prestored-course fallback skips any name already in `excluded`, the
   * last-resort fallback still passes `excluded`, and a VirtualSelect scroll-through is attempted
   * before falling to prestored names so that off-screen non-excluded options are not missed.
   */
  async selectFirstVisibleCourseOptionNotInStrict(
    excluded: ReadonlySet<string>,
    courseSlotIndex: number,
  ): Promise<string> {
    await this.waitForCourseSelectionStepReady();

    // Primary pass: check initially visible items, then scroll through if needed
    const preferred = await this.selectWithCourseDropdownRetries(
      courseSlotIndex,
      async (combobox) => {
        const quick = await this.selectFirstVisibleCourseOptionFromExpanded(combobox, excluded);
        if (quick) {
          return quick;
        }
        return this.scrollVsDropdownAndPickNonExcluded(excluded);
      },
    );
    if (preferred) {
      return preferred;
    }

    // Prestored-name fallback — skip any name that is itself excluded
    for (const courseName of this.prestoredFallbackCourseNames(courseSlotIndex)) {
      if (this.isCourseTitleExcluded(courseName, excluded)) {
        continue;
      }
      const fallback = await this.trySelectCourseOptionByName(courseName, courseSlotIndex);
      if (fallback) {
        return fallback;
      }
    }

    // Last-resort: scroll-through with exclusion still enforced
    const anyCourse = await this.selectWithCourseDropdownRetries(
      courseSlotIndex,
      async (combobox) => {
        const quick = await this.selectFirstVisibleCourseOptionFromExpanded(combobox, excluded);
        if (quick) {
          return quick;
        }
        return this.scrollVsDropdownAndPickNonExcluded(excluded);
      },
    );
    if (anyCourse) {
      return anyCourse;
    }

    throw new Error(
      `No VirtualSelect course option could be selected for slot ${courseSlotIndex} (all options in exclusion list or none visible).`,
    );
  }

  async goToNextWizardStep() {
    await expect(this.nextButton).toBeVisible();
    await this.nextButton.click();
  }

  async pickTodayDistributionStartDate(maxAttempts = 4) {
    const dateCombobox = this.distributionStartDateCombobox();
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
    const searchInput = this.page.getByRole('searchbox');
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
    await searchInput.click();
    await searchInput.fill(searchToken);

    const searchButtons = await this.page.getByRole('button', { name: 'Search' }).all();
    expect(searchButtons.length).toBeGreaterThan(0);
    await searchButtons[0].click();

    const row = this.targetUserRowByEmail(loginEmail);
    await expect(row).toBeVisible({ timeout: 30_000 });
    const checkbox = row.getByRole('checkbox');
    await expect(checkbox).toBeVisible();
    await checkbox.check();
  }

  async checkOptionalNotifySwitch() {
    const notifySwitch = this.page.getByRole('checkbox', { name: /Auto-enroll new employee/i });
    const isVisible = await notifySwitch.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!isVisible) {
      return;
    }
    await notifySwitch.check({ timeout: 3_000 }).catch(() => {});
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

  // ── TR-015: Training Admin sends manual reminder ──────────────────────────

  /**
   * TR-015: Navigates to Course Distribution and double-clicks the Distribution
   * View radio (matching the recorded dblclick behaviour) so the Distribution
   * Grid loads with the existing distributions.
   */
  async openCourseDistributionViewTab() {
    await this.page.goto(`${CSI_BASE_URL}/CourseDistribution`);
    await expect(this.distributionViewRadio).toBeVisible({ timeout: 30_000 });
    await this.distributionViewRadio.dblclick();
    // Wait for at least one distribution row to appear before proceeding
    await expect(
      this.page.getByRole('grid').getByRole('row').nth(1),
    ).toBeVisible({ timeout: 30_000 });
  }

  /**
   * TR-015: Clicks the Action cell (ellipsis popover) of the first row in the
   * Distribution View grid, then clicks "View Detail" from the opened popover.
   * The Action cell is the last gridcell in the first data row — matched by
   * empty text content (no ID selector per refactor rule), consistent with the
   * pattern used in searchDistributionAndOpenExtendSchedule.
   */
  async clickFirstDistributionRowActionAndViewDetail() {
    const firstDataRow = this.page.getByRole('grid').getByRole('row').nth(1);
    await expect(firstDataRow).toBeVisible({ timeout: 30_000 });
    await firstDataRow.getByRole('gridcell').filter({ hasText: /^$/ }).click();

    const viewDetailLink = this.page.getByRole('link', { name: /View Detail/ });
    await expect(viewDetailLink).toBeVisible({ timeout: 15_000 });
    await viewDetailLink.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * TR-015: On the distribution detail page, waits for the "Action" section
   * heading to confirm the page has loaded, clicks the "Send Reminder Email"
   * link (opens the reminder modal), then clicks the "Send Reminder Email"
   * confirm button, and asserts the "Successfully sent email" success message.
   */
  async sendManualReminderEmailAndExpectSuccess() {
    // "Action" is rendered as a div.btn-primary inside a [data-popover] trigger,
    // not a <button>, so getByRole('button') cannot reach it.
    // Scope to the .popover-top that contains the Action label to avoid ID selectors.
    const actionPopoverTrigger = this.page
      .locator('.popover-top')
      .filter({ has: this.page.locator('.btn-primary', { hasText: 'Action' }) });
    await expect(actionPopoverTrigger).toBeVisible({ timeout: 30_000 });
    await actionPopoverTrigger.click();

    await this.page.getByRole('link', { name: /Send Reminder Email/ }).click();

    const confirmButton = this.page.getByRole('button', { name: 'Send Reminder Email' });
    await expect(confirmButton).toBeVisible({ timeout: 15_000 });
    await confirmButton.click();

    await expect(this.page.getByText('Successfully sent email')).toBeVisible({ timeout: 30_000 });
  }

  // ── TR-017: Training Admin extends schedule for missed users ──────────────

  /**
   * TR-017: On My Course, waits for the card list to load, opens the Missed tab,
   * waits until at least one of the two missed courses is shown, then resolves the
   * "current missed course": the only one visible, or — when both are visible — the
   * one appearing first in the card list DOM order. Returns the resolved title.
   */
  async openMissedTabAndResolveCurrentMissedCourse(
    courseOne: string,
    courseTwo: string,
  ): Promise<string> {
    await this.openMyCourse();

    const missedTab = this.page.getByRole('link', { name: 'Missed' });
    await expect(missedTab).toBeVisible({ timeout: 60_000 });
    await missedTab.click();

    // Retry up to 3 times if the Missed tab content hasn't loaded.
    // .MISSED badge is the reliable signal — same rationale as openMyCoursePassedTab:
    // isVisible() checks instantly and ignores a timeout option, so waitFor is used.
    for (let attempt = 0; attempt < 3; attempt++) {
      const hasMissedContent = await this.page
        .locator('.course-list .MISSED')
        .first()
        .waitFor({ state: 'visible', timeout: 3_000 })
        .then(() => true)
        .catch(() => false);
      if (hasMissedContent) break;
      await missedTab.click();
    }

    const courseOneText = this.page.getByText(courseOne, { exact: true });
    const courseTwoText = this.page.getByText(courseTwo, { exact: true });
    await expect(courseOneText.or(courseTwoText).first()).toBeVisible({ timeout: 60_000 });

    const orderedTitles = await this.page
      .locator('.course-list .course-card .ThemeGrid_Width8 span.bold.OSFillParent')
      .allTextContents();

    for (const raw of orderedTitles) {
      const title = this.normalizeCourseTitle(raw);
      if (title === courseOne || title === courseTwo) {
        return title;
      }
    }

    throw new Error(
      `TR-017: neither "${courseOne}" nor "${courseTwo}" found in the Missed tab card list`,
    );
  }

  /**
   * TR-017: On the Course Distribution page, searches the distribution by name,
   * switches to Distribution View, asserts the row is listed, opens its row action
   * menu and clicks Extend Schedule. Search box is matched by role (no ID selector).
   */
  async searchDistributionAndOpenExtendSchedule(distributionName: string) {
    const searchBox = this.page.getByRole('searchbox').first();
    await expect(searchBox).toBeVisible({ timeout: 30_000 });
    await searchBox.click();
    await searchBox.fill(distributionName);

    await this.openDistributionView();

    const distributionRow = this.page.getByRole('row').filter({
      has: this.page.getByRole('gridcell', { name: distributionName }),
    });
    await expect(distributionRow).toBeVisible({ timeout: 30_000 });

    // The row's empty action gridcell holds the ellipsis action popover
    await distributionRow.getByRole('gridcell').filter({ hasText: /^$/ }).click();

    const extendScheduleLink = this.page.getByRole('link', { name: /Extend Schedule/ });
    await expect(extendScheduleLink).toBeVisible({ timeout: 15_000 });
    await extendScheduleLink.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** TR-017: assert both missed courses are present on the Extend Schedule page (presence only). */
  async expectExtendScheduleCoursesPresent(courseOne: string, courseTwo: string) {
    await expect(this.page.getByRole('button', { name: courseOne })).toBeVisible({
      timeout: 30_000,
    });
    await expect(this.page.getByRole('button', { name: courseTwo })).toBeVisible({
      timeout: 30_000,
    });
  }

  /**
   * TR-017: Opens the given course's date picker, selects the earliest enabled day
   * (nearest allowed date from today — past dates are disabled), confirms the
   * extension, and waits for the success message.
   */
  async extendCourseEndDateToEarliestAllowed(courseName: string) {
    const dateCombobox = this.page
      .getByLabel(courseName)
      .getByRole('combobox', { name: 'Select a date' });
    await expect(dateCombobox).toBeVisible({ timeout: 30_000 });
    await dateCombobox.click();

    // Disabled days carry .flatpickr-disabled; the first non-disabled day in DOM
    // order is the nearest allowed date from today.
    const openCalendar = this.page.locator('.flatpickr-calendar.open');
    await expect(openCalendar).toBeVisible({ timeout: 15_000 });
    const earliestEnabledDay = openCalendar
      .locator('.flatpickr-day:not(.flatpickr-disabled)')
      .first();
    await expect(earliestEnabledDay).toBeVisible({ timeout: 15_000 });
    await earliestEnabledDay.click();

    await this.page.getByRole('button', { name: 'Extend Schedule' }).click();

    const confirmButton = this.page.getByRole('button', { name: 'Confirm' });
    await expect(confirmButton).toBeVisible({ timeout: 15_000 });
    await confirmButton.click();

    await expect(this.page.getByText('Extended selected course end')).toBeVisible({
      timeout: 30_000,
    });
  }

  /** TR-017: navigate to My Course, click Ongoing with up to 3 retries at 3 s intervals, then assert the extended course is listed. */
  async openOngoingTabAndExpectCourse(courseName: string) {
    await this.openMyCourse();
    const ongoingTab = this.page.getByRole('link', { name: 'Ongoing', exact: true });
    await expect(ongoingTab).toBeVisible({ timeout: 60_000 });
    await ongoingTab.click();

    for (let attempt = 0; attempt < 3; attempt++) {
      const hasCard = await this.page
        .locator('.course-list .course-card')
        .first()
        .waitFor({ state: 'visible', timeout: 3_000 })
        .then(() => true)
        .catch(() => false);
      if (hasCard) break;
      await ongoingTab.click();
    }

    await expect(this.page.getByText(courseName, { exact: true }).first()).toBeVisible({
      timeout: 60_000,
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

  // ── TR-026: Super Admin views reports across orgs ─────────────────────────

  /**
   * TR-026: Opens the org VirtualSelect on the Course Report page, types to
   * filter, and selects the matching org option. After selection the report
   * data reloads; call downloadCourseReportPdf() next to wait for the export
   * button to re-enable before downloading.
   */
  async selectOrgOnCourseReport(orgName: string) {
    // Wait for the export button to be visible first — it is rendered as part of
    // the same async load cycle as the org selector, so its visibility confirms
    // the page chrome (including the VirtualSelect org dropdown) has been mounted.
    await expect(this.exportCourseReportPdfButton).toBeVisible({ timeout: 60_000 });

    const selectOrgTrigger = this.page.getByText('Select Organization', { exact: true });
    await expect(selectOrgTrigger).toBeVisible({ timeout: 60_000 });
    await selectOrgTrigger.click();

    const searchBox = this.page.getByRole('textbox', { name: 'Search' });
    await expect(searchBox).toBeVisible({ timeout: 10_000 });
    await searchBox.fill(orgName);

    const option = this.page.getByRole('option', { name: orgName });
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click();
  }

  /** TR-026: Clears the org selector so a new org can be selected. */
  async clearOrgSelectorOnCourseReport() {
    const clearButton = this.page.getByRole('button', { name: 'Clear button' });
    await expect(clearButton).toBeVisible({ timeout: 10_000 });
    await clearButton.click();
  }

  readonly managerViewRadio = this.page.getByRole('radio', { name: 'Manager View' });

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

  async openMyCourse() {
    await this.page.goto(`${CSI_BASE_URL}/myCourse`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  private myCourseCourseCards() {
    return this.page.locator('.course-card');
  }

  private async expectFirstMyCourseCardReady() {
    const firstCard = this.myCourseCourseCards().first();
    await expect(firstCard).toBeVisible({ timeout: 60_000 });
    await expect(firstCard.locator('span.bold.OSFillParent').first()).toBeVisible();
    await expect(firstCard.getByRole('button', { name: 'Start' })).toBeVisible();
  }

  private async hasVisibleMyCourseCard(): Promise<boolean> {
    return this.myCourseCourseCards()
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
  }

  readonly downloadPdfCertificationButton = this.page.getByRole('button', {
    name: 'Download the PDF Certification',
  });

  /**
   * TR-010: Passed tab → first course card View Certificate → image preview → PDF download
   * (recorded-steps/Training/TR-010.txt).
   */
  async downloadFirstPassedCourseCertificatePdf(): Promise<Buffer> {
    await this.openMyCoursePassedTab();

    const viewCertificate = this.myCourseCourseCards()
      .first()
      .getByRole('button', { name: 'View Certificate' });
    await expect(viewCertificate).toBeVisible({ timeout: 60_000 });
    await viewCertificate.click();
    await this.page.waitForLoadState('domcontentloaded');

    await expect(this.downloadPdfCertificationButton).toBeVisible({ timeout: 60_000 });
    const certificatePreviewImage = this.page.locator('img:not(.app-logo)').first();
    await expect(certificatePreviewImage).toBeAttached({ timeout: 60_000 });
    const downloadPromise = this.page.waitForEvent('download', { timeout: 120_000 });
    await this.downloadPdfCertificationButton.click();
    const download = await downloadPromise;
    const downloadedPath = await download.path();
    expect(downloadedPath, 'certificate PDF should be written to a temp path').toBeTruthy();
    return readFileSync(downloadedPath as string);
  }

  /**
   * TR-022: after `/myCourse` loads, at least one auto-assigned `.course-card` is visible.
   * If no card within 5s, click Ongoing tab then assert (recorded-steps/Training/TR-022.txt).
   */
  async expectTr022AutoAssignedCourseOnMyCourse() {
    await this.openMyCourse();

    const ongoingTab = this.page.getByRole('link', { name: 'Ongoing', exact: true });
    await expect(ongoingTab).toBeVisible({ timeout: 60_000 });

    const initialDeadline = Date.now() + TR022_COURSE_CARD_INITIAL_WAIT_MS;
    while (Date.now() < initialDeadline) {
      if (await this.hasVisibleMyCourseCard()) {
        await this.expectFirstMyCourseCardReady();
        return;
      }
      await this.safeSleep(250);
    }

    await ongoingTab.click();
    await this.safeSleep(TR022_MY_COURSE_TAB_SETTLE_MS);
    await this.expectFirstMyCourseCardReady();
  }

  private myCourseCardByTitle(courseName: string) {
    return this.page.locator('.course-card').filter({ hasText: courseName });
  }

  /** TR-011: Retake on Failed-tab course card (same action row pattern as Ongoing Start). */
  private retakeButtonOnCourseCard(courseName: string) {
    return this.myCourseCardByTitle(courseName).getByRole('button', { name: 'Retake' });
  }

  private startButtonOnCourseCard(courseName: string) {
    return this.myCourseCardByTitle(courseName).getByRole('button', { name: 'Start' });
  }

  /** TR-011: Failed tab — same settle pattern as TR-001 status tabs. */
  async openMyCourseFailedTab() {
    await this.openMyCourse();
    const failedTab = this.page.getByRole('link', { name: 'Failed', exact: true });
    await this.safeSleep(3000);
    await expect(failedTab).toBeVisible({ timeout: 60_000 });
    await failedTab.click();
    await this.safeSleep(5000);
    await expect(this.myCourseSearchBox).toBeVisible({ timeout: 30_000 });
  }

  /** TR-010 / TR-011: Passed tab — same settle pattern as TR-001 status tabs. */
  async openMyCoursePassedTab() {
    await this.openMyCourse();
    const passedTab = this.page.getByRole('link', { name: 'Passed', exact: true });
    await expect(passedTab).toBeVisible({ timeout: 60_000 });
    await passedTab.click();

    // Retry up to 3 times if the Passed tab content hasn't loaded.
    // Uses waitFor({ state: 'visible' }) rather than isVisible({ timeout }),
    // because isVisible() checks instantaneously and ignores the timeout option —
    // the loop would race through all retries before the tab has time to render.
    // .COMPLETED is checked (not generic .course-card) because cards from the
    // previously active tab remain in the DOM and would cause a generic card
    // check to pass immediately.
    for (let attempt = 0; attempt < 3; attempt++) {
      const hasPassedContent = await this.page
        .locator('.course-list .COMPLETED')
        .first()
        .waitFor({ state: 'visible', timeout: 3_000 })
        .then(() => true)
        .catch(() => false);
      if (hasPassedContent) break;
      await passedTab.click();
    }

    await this.safeSleep(TR022_MY_COURSE_TAB_SETTLE_MS);
  }

  /** TR-011: Ongoing tab — same settle pattern as TR-001 status tabs. */
  async openMyCourseOngoingTab() {
    await this.openMyCourse();
    const ongoingTab = this.page.getByRole('link', { name: 'Ongoing', exact: true });
    await this.safeSleep(3000);
    await expect(ongoingTab).toBeVisible({ timeout: 60_000 });
    await ongoingTab.click();
    await this.safeSleep(5000);
    await expect(this.myCourseSearchBox).toBeVisible({ timeout: 30_000 });
  }

  async searchMyCourseByCourseName(courseName: string) {
    await this.runMyCourseSearch(courseName);
    await expect(this.myCourseCardByTitle(courseName).first()).toBeVisible({ timeout: 60_000 });
  }

  private async runMyCourseSearch(courseName: string) {
    await expect(this.myCourseSearchBox).toBeVisible({ timeout: 30_000 });
    await this.myCourseSearchBox.click();
    await this.myCourseSearchBox.fill(courseName);
    await this.page.getByRole('button', { name: 'Search' }).click();
    await this.safeSleep(2000);
  }

  /** TR-011: search current tab; false when no `.course-card` matches. */
  async searchMyCourseByCourseNameIfPresent(courseName: string): Promise<boolean> {
    await this.runMyCourseSearch(courseName);
    return this.myCourseCardByTitle(courseName)
      .first()
      .isVisible({ timeout: 15_000 })
      .catch(() => false);
  }

  /**
   * TR-011: after Failed-tab search, true when Retake is on the course card
   * (recorded-steps/Training/TR-011.txt — Failed card action row).
   */
  async isRetakeVisibleOnFailedCourseCard(courseName: string): Promise<boolean> {
    const card = this.myCourseCardByTitle(courseName).first();
    if (!(await card.isVisible({ timeout: 15_000 }).catch(() => false))) {
      return false;
    }
    return this.retakeButtonOnCourseCard(courseName)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
  }

  async openMyCourseCardByTitle(courseName: string) {
    const card = this.myCourseCardByTitle(courseName).first();
    await expect(card).toBeVisible({ timeout: 60_000 });
    await card.getByText(courseName, { exact: true }).first().click();
  }

  /** TR-011: select card, Retake, registration message (recorded Failed-tab flow). */
  async retakeCourseOnFailedTab(courseName: string) {
    await this.openMyCourseCardByTitle(courseName);
    await this.retakeButtonOnCourseCard(courseName).first().click();
    await expect(this.page.getByText(TR011_COURSE_REGISTERED_MESSAGE)).toBeVisible({
      timeout: 60_000,
    });
  }

  /** TR-011: Ongoing card — Start on card, then Begin Course. */
  async startOngoingCourseFromVisibleCard(courseName: string) {
    const card = this.myCourseCardByTitle(courseName).first();
    await expect(card).toBeVisible({ timeout: 60_000 });
    await card.getByText(courseName, { exact: true }).first().click();
    await this.startButtonOnCourseCard(courseName).first().click();
    const beginCourse = this.page.getByRole('button', { name: 'Begin Course' });
    await expect(beginCourse).toBeVisible({ timeout: 60_000 });
    await beginCourse.click();
    await expect(this.page.locator('iframe[src*="player.vimeo.com"]')).toBeVisible({
      timeout: 60_000,
    });
  }

  async completeCourseAttemptAndFailQuiz() {
    await this.completeCourseVideoSection();
    await this.failCourseQuizIntentionally();
    await this.expectCourseQuizFailed();
    await this.openMyCourse();
  }

  /**
   * TR-011: when Retake is absent on Failed search results, fail once from Ongoing to seed Failed,
   * then Retake and run the main intentional-fail attempt.
   */
  async runTr011RetakeAndFailFlow(courseName: string) {
    await this.openMyCourseFailedTab();
    await this.searchMyCourseByCourseNameIfPresent(courseName);

    const hasRetakeOnFailed = await this.isRetakeVisibleOnFailedCourseCard(courseName);

    if (!hasRetakeOnFailed) {
      await this.openMyCourseOngoingTab();
      await this.searchMyCourseByCourseName(courseName);
      await this.startOngoingCourseFromVisibleCard(courseName);
      await this.completeCourseAttemptAndFailQuiz();

      await this.openMyCourseFailedTab();
      await this.searchMyCourseByCourseName(courseName);
      await expect(this.retakeButtonOnCourseCard(courseName).first()).toBeVisible({
        timeout: 60_000,
      });
    }

    await this.retakeCourseOnFailedTab(courseName);

    await this.openMyCourseOngoingTab();
    await this.searchMyCourseByCourseName(courseName);
    await this.startOngoingCourseFromVisibleCard(courseName);
    await this.completeCourseAttemptAndFailQuiz();
  }

  private courseVimeoFrame() {
    return this.page.frameLocator('iframe[src*="player.vimeo.com"]');
  }

  /**
   * TR-011: Play Vimeo lesson, seek near end, confirm Replay, advance to quiz.
   * Play/Replay live inside the Vimeo iframe — no element ids.
   */
  async completeCourseVideoSection() {
    const vimeo = this.courseVimeoFrame();
    const playButton = vimeo.getByRole('button', { name: 'Play' });
    await expect(playButton).toBeVisible({ timeout: 60_000 });
    await playButton.click();
    await this.safeSleep(TR011_VIDEO_PLAY_SETTLE_MS);

    await this.seekCourseVimeoVideoNearEnd(3);
    await this.safeSleep(TR011_VIDEO_AFTER_SEEK_SETTLE_MS);

    await expect(vimeo.getByRole('button', { name: 'Replay' })).toBeVisible({ timeout: 60_000 });
    await this.page.getByRole('button', { name: 'Next' }).click();
  }

  private async seekCourseVimeoVideoNearEnd(secondsBeforeEnd: number) {
    const video = this.courseVimeoFrame().locator('video');
    await expect(video).toBeVisible({ timeout: 60_000 });
    await video.evaluate(
      async (el, offset) => {
        const v = el as HTMLVideoElement;
        await new Promise<void>((resolve) => {
          if (v.readyState >= 1 && Number.isFinite(v.duration) && v.duration > 0) {
            resolve();
            return;
          }
          v.addEventListener('loadedmetadata', () => resolve(), { once: true });
          window.setTimeout(resolve, 15_000);
        });
        if (Number.isFinite(v.duration) && v.duration > offset) {
          v.currentTime = v.duration - offset;
        }
      },
      secondsBeforeEnd,
    );
  }

  private activeQuizForm() {
    return this.page.locator('form').filter({
      has: this.page.getByRole('button', { name: /Next Question|View Result/ }),
    });
  }

  /** TR-011: pick a known-wrong option visible on the current question (order varies). */
  private async selectWrongAnswerOnCurrentQuizQuestion() {
    const form = this.activeQuizForm();
    await expect(form).toBeVisible({ timeout: 60_000 });

    const denyOption = form.getByText(/Ensuring that no party can deny/i);
    if (await denyOption.first().isVisible().catch(() => false)) {
      await denyOption.first().click();
      return;
    }

    const availabilityRow = form
      .locator('div.display-flex.align-items-center')
      .filter({ hasText: /^Availability$/ });
    if (await availabilityRow.first().isVisible().catch(() => false)) {
      const checkbox = availabilityRow.first().getByRole('checkbox');
      if (!(await checkbox.isChecked())) {
        await checkbox.check();
      }
      return;
    }

    const falseOption = form.getByText('False', { exact: true });
    if (await falseOption.first().isVisible().catch(() => false)) {
      await falseOption.first().click();
      return;
    }

    throw new Error('TR-011: no recognized wrong-answer option on current quiz question');
  }

  /** TR-011: five intentional wrong answers; last step uses View Result twice. */
  async failCourseQuizIntentionally() {
    const beginQuiz = this.page.getByRole('button', { name: 'Begin Quiz' });
    await expect(beginQuiz).toBeVisible({ timeout: 60_000 });
    await beginQuiz.click();

    for (let index = 0; index < TR011_QUIZ_QUESTION_COUNT; index += 1) {
      await this.selectWrongAnswerOnCurrentQuizQuestion();
      const isLast = index === TR011_QUIZ_QUESTION_COUNT - 1;

      if (isLast) {
        await this.page.getByRole('button', { name: 'View Result' }).click();
        await expect(this.page.getByText('Incorrect.', { exact: true })).toBeVisible({
          timeout: 30_000,
        });
        await this.page.getByRole('button', { name: 'View Result' }).click();
      } else {
        await this.page.getByRole('button', { name: 'Next Question' }).click();
        await expect(this.page.getByText('Incorrect.', { exact: true })).toBeVisible({
          timeout: 30_000,
        });
        await this.page.getByRole('button', { name: 'Next Question' }).click();
      }
    }
  }

  async expectCourseQuizFailed() {
    await expect(this.page.getByText(TR011_QUIZ_FAILURE_MESSAGE)).toBeVisible({ timeout: 60_000 });
  }

  /** TR-033 visibility bundle (recorded-steps/Training/TR-033.txt). */
  async expectTr033ManagerDashboardSectionsVisible() {
    await expect(this.page.getByText('Cybersecurity Awareness Score')).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByText('Target Goal', { exact: true })).toBeVisible();
    await expect(this.page.getByText('Training Statistics', { exact: true })).toBeVisible();

    for (const label of ['Not Started', 'In Progress', 'Passed', 'Failed', 'Missed'] as const) {
      await this.expectTrainingStatisticsLegendLabel(label);
    }

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

  // --- TR-029: Super Admin creates course ---

  async navigateToCourseEdit() {
    await this.page.goto(`${CSI_BASE_URL}/courseLibrary`);
    await expect(
      this.page.getByRole('button', { name: '+ Create New Course', exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await this.page.getByRole('button', { name: '+ Create New Course', exact: true }).click();
    // Wait until the Course Code input (placeholder 'AT-00XX') is ready before interacting
    await expect(this.page.getByRole('textbox', { name: 'AT-00XX' })).toBeVisible({
      timeout: 30_000,
    });
  }

  async fillCourseCode(code: string) {
    const input = this.page.getByRole('textbox', { name: 'AT-00XX' });
    await input.click();
    await input.fill(code);
  }

  async fillCoursePassScore(score: string) {
    const label = this.page.getByText('Pass score', { exact: true });
    await expect(label).toBeVisible({ timeout: 15_000 });
    // Walk up the DOM from the label span to find the sibling number input
    const handle = await label.evaluateHandle((labelEl) => {
      let container: HTMLElement | null = labelEl.parentElement;
      while (container) {
        const input = container.querySelector(
          'input[type="number"]',
        ) as HTMLInputElement | null;
        if (input) return input;
        container = container.parentElement;
      }
      return null;
    });
    const element = handle.asElement();
    expect(element).not.toBeNull();
    await element!.click();
    await element!.fill(score);
    await handle.dispose();
  }

  async selectCourseFirstCategory() {
    const label = this.page.getByText('Category', { exact: true });
    await expect(label).toBeVisible({ timeout: 15_000 });
    // Walk up to find the nearest <select> and pick the first real category (index 1, skipping the placeholder)
    const handle = await label.evaluateHandle((labelEl) => {
      let container: HTMLElement | null = labelEl.parentElement;
      while (container) {
        const select = container.querySelector('select') as HTMLSelectElement | null;
        if (select) return select;
        container = container.parentElement;
      }
      return null;
    });
    const element = handle.asElement();
    expect(element).not.toBeNull();
    await element!.selectOption({ index: 1 });
    await handle.dispose();
  }

  async fillCourseTitleInLanguageSection(title: string) {
    // Scope to the Language 1 accordion to avoid any page-level 'Title' text collision
    const languageSection = this.page.locator('.lessonAccordion').first();
    const label = languageSection.getByText('Title', { exact: true });
    await expect(label).toBeVisible({ timeout: 15_000 });
    const handle = await label.evaluateHandle((labelEl) => {
      let container: HTMLElement | null = labelEl.parentElement;
      while (container) {
        const input = container.querySelector(
          'input[type="text"]',
        ) as HTMLInputElement | null;
        if (input) return input;
        container = container.parentElement;
      }
      return null;
    });
    const element = handle.asElement();
    expect(element).not.toBeNull();
    await element!.click();
    await element!.fill(title);
    await handle.dispose();
  }

  async fillCourseDescriptionInLanguageSection(description: string) {
    // Scope to the Language 1 accordion to avoid any page-level 'Description' text collision
    const languageSection = this.page.locator('.lessonAccordion').first();
    const label = languageSection.getByText('Description', { exact: true });
    await expect(label).toBeVisible({ timeout: 15_000 });
    const handle = await label.evaluateHandle((labelEl) => {
      let container: HTMLElement | null = labelEl.parentElement;
      while (container) {
        const textarea = container.querySelector(
          'textarea',
        ) as HTMLTextAreaElement | null;
        if (textarea) return textarea;
        container = container.parentElement;
      }
      return null;
    });
    const element = handle.asElement();
    expect(element).not.toBeNull();
    await element!.click();
    await element!.fill(description);
    await handle.dispose();
  }

  async uploadCourseCoverImage(imagePath: string) {
    // The file input is hidden inside the cover image drop-area; set files programmatically
    const fileInput = this.page.locator('.drop-area').first().locator('input[type="file"]');
    await fileInput.setInputFiles(imagePath);
  }

  async submitCourseFormNextStep() {
    const nextBtn = this.page.getByRole('button', { name: 'Next', exact: true });
    await expect(nextBtn).toBeVisible({ timeout: 15_000 });
    await nextBtn.click();
  }

  async publishCourse() {
    const publishBtn = this.page.getByRole('button', { name: 'Publish', exact: true });
    await expect(publishBtn).toBeVisible({ timeout: 30_000 });
    await publishBtn.click();
  }

  async searchCourseAndExpectTitleVisible(courseTitle: string) {
    await expect(this.myCourseSearchBox).toBeVisible({ timeout: 30_000 });
    await this.myCourseSearchBox.click();
    await this.myCourseSearchBox.fill(courseTitle);
    await this.page.getByRole('button', { name: 'Search' }).first().click();
    await expect(this.page.getByText(courseTitle, { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  }

  // --- TR-029 Version 2: lesson + quiz steps (inserted after Description, before Next) ---

  async addLessonAndSelectQuizType() {
    // "Add lessons" is the initial button inside the Language 1 accordion
    const addLessonsBtn = this.page
      .locator('.lessonAccordion')
      .first()
      .getByRole('button', { name: 'Add lessons' });
    await expect(addLessonsBtn).toBeVisible({ timeout: 15_000 });
    await addLessonsBtn.click();

    // After clicking "Add lessons", the "+ Add more lesson" button appears
    const addMoreBtn = this.page.getByRole('button', { name: '+ Add more lesson' });
    await expect(addMoreBtn).toBeVisible({ timeout: 15_000 });
    await addMoreBtn.click();

    // Select "Quiz" (value '1') from the lesson content type dropdown.
    // The dropdown is identified by its placeholder option "Add Lesson Content" without using its ID.
    const lessonDropdown = this.page
      .locator('select')
      .filter({ has: this.page.locator('option').filter({ hasText: 'Add Lesson Content' }) })
      .last();
    await expect(lessonDropdown).toBeVisible({ timeout: 15_000 });
    await lessonDropdown.selectOption('1');
  }

  async fillLessonName(name: string) {
    // The "Enter Lesson Name" placeholder uniquely identifies this textbox
    const input = this.page.getByRole('textbox', { name: 'Enter Lesson Name' });
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.click();
    await input.fill(name);
  }

  async fillQuizDetails(title: string, lengthMinutes: string, weight: string) {
    // Quiz Title — text input adjacent to "Quiz Title" label (walk up from label to find input)
    const quizTitleLabel = this.page.getByText('Quiz Title', { exact: true });
    await expect(quizTitleLabel).toBeVisible({ timeout: 15_000 });
    const titleHandle = await quizTitleLabel.evaluateHandle((labelEl) => {
      let container: HTMLElement | null = labelEl.parentElement;
      while (container) {
        const input = container.querySelector(
          'input[type="text"]',
        ) as HTMLInputElement | null;
        if (input) return input;
        container = container.parentElement;
      }
      return null;
    });
    const titleEl = titleHandle.asElement();
    expect(titleEl).not.toBeNull();
    await titleEl!.click();
    await titleEl!.fill(title);
    await titleHandle.dispose();

    // Quiz Length (In Minutes) — number input adjacent to its label
    const lengthLabel = this.page.getByText('Quiz Length (In Minutes)', { exact: true });
    const lengthHandle = await lengthLabel.evaluateHandle((labelEl) => {
      let container: HTMLElement | null = labelEl.parentElement;
      while (container) {
        const input = container.querySelector(
          'input[type="number"]',
        ) as HTMLInputElement | null;
        if (input) return input;
        container = container.parentElement;
      }
      return null;
    });
    const lengthEl = lengthHandle.asElement();
    expect(lengthEl).not.toBeNull();
    await lengthEl!.click();
    await lengthEl!.fill(lengthMinutes);
    await lengthHandle.dispose();

    // Quiz Weight — number input adjacent to "Quiz Weight" label
    // Using exact: true so "Question Weight" label is not matched
    const quizWeightLabel = this.page.getByText('Quiz Weight', { exact: true });
    const weightHandle = await quizWeightLabel.evaluateHandle((labelEl) => {
      let container: HTMLElement | null = labelEl.parentElement;
      while (container) {
        const input = container.querySelector(
          'input[type="number"]',
        ) as HTMLInputElement | null;
        if (input) return input;
        container = container.parentElement;
      }
      return null;
    });
    const weightEl = weightHandle.asElement();
    expect(weightEl).not.toBeNull();
    await weightEl!.click();
    await weightEl!.fill(weight);
    await weightHandle.dispose();
  }

  async fillQuizFirstQuestion(questionText: string, questionWeight: string) {
    // Scope to <label> elements only with a full-string regex to avoid matching the
    // "Question 1:" / "Question 2:" <span> nodes that Playwright also normalizes to "Question"
    const questionLabel = this.page.locator('label').filter({ hasText: /^Question$/ });
    await expect(questionLabel).toBeVisible({ timeout: 15_000 });
    const questionHandle = await questionLabel.evaluateHandle((labelEl) => {
      let container: HTMLElement | null = labelEl.parentElement;
      while (container) {
        const ta = container.querySelector('textarea') as HTMLTextAreaElement | null;
        if (ta) return ta;
        container = container.parentElement;
      }
      return null;
    });
    const questionEl = questionHandle.asElement();
    expect(questionEl).not.toBeNull();
    await questionEl!.click();
    await questionEl!.fill(questionText);
    await questionHandle.dispose();

    // "Question Weight" — number input adjacent to its label
    const qWeightLabel = this.page.getByText('Question Weight', { exact: true });
    const qWeightHandle = await qWeightLabel.evaluateHandle((labelEl) => {
      let container: HTMLElement | null = labelEl.parentElement;
      while (container) {
        const input = container.querySelector(
          'input[type="number"]',
        ) as HTMLInputElement | null;
        if (input) return input;
        container = container.parentElement;
      }
      return null;
    });
    const qWeightEl = qWeightHandle.asElement();
    expect(qWeightEl).not.toBeNull();
    await qWeightEl!.click();
    await qWeightEl!.fill(questionWeight);
    await qWeightHandle.dispose();
  }

  async fillQuizAnswers(firstAnswer: string, secondAnswer: string) {
    // Answer choices are identified by .question-choice containers, avoiding IDs
    const answerChoices = this.page.locator('.question-choice');

    const firstInput = answerChoices.first().locator('input[type="text"]');
    await expect(firstInput).toBeVisible({ timeout: 15_000 });
    await firstInput.click();
    await firstInput.fill(firstAnswer);

    // Add a second answer option, then fill it
    await this.page.getByRole('button', { name: '+ Add Answer' }).click();

    const secondInput = answerChoices.nth(1).locator('input[type="text"]');
    await expect(secondInput).toBeVisible({ timeout: 15_000 });
    await secondInput.click();
    await secondInput.fill(secondAnswer);
  }

  async finishQuizLesson() {
    await this.page.getByRole('button', { name: 'Finish' }).click();
  }

  // --- TR-029 Version 3: add Video lesson before clicking Finish ---

  async addVideoLesson(
    title: string,
    lengthMinutes: string,
    videoUrl: string,
    description: string,
  ) {
    // Select "Video" (value '0') from the FIRST visible "Add Lesson Content" dropdown,
    // identified by its placeholder option text without using element IDs
    const lessonDropdown = this.page
      .locator('select')
      .filter({ has: this.page.locator('option').filter({ hasText: 'Add Lesson Content' }) })
      .first();
    await expect(lessonDropdown).toBeVisible({ timeout: 15_000 });
    await lessonDropdown.selectOption('0');

    // Wait for the "2. VIDEO" accordion region before interacting with its fields
    const videoAccordion = this.page.getByRole('region', { name: '2. VIDEO' });
    await expect(videoAccordion).toBeVisible({ timeout: 15_000 });

    // Video Title — text input adjacent to "Video Title" label (DOM-walk from label)
    const videoTitleLabel = videoAccordion.getByText('Video Title', { exact: true });
    await expect(videoTitleLabel).toBeVisible({ timeout: 15_000 });
    const titleHandle = await videoTitleLabel.evaluateHandle((labelEl) => {
      let container: HTMLElement | null = labelEl.parentElement;
      while (container) {
        const input = container.querySelector(
          'input[type="text"]',
        ) as HTMLInputElement | null;
        if (input) return input;
        container = container.parentElement;
      }
      return null;
    });
    const titleEl = titleHandle.asElement();
    expect(titleEl).not.toBeNull();
    await titleEl!.dblclick();
    await titleEl!.fill(title);
    await titleHandle.dispose();

    // Video Length (In Minutes) — number input adjacent to its label
    const lengthLabel = videoAccordion.getByText('Video Length (In Minutes)', { exact: true });
    const lengthHandle = await lengthLabel.evaluateHandle((labelEl) => {
      let container: HTMLElement | null = labelEl.parentElement;
      while (container) {
        const input = container.querySelector(
          'input[type="number"]',
        ) as HTMLInputElement | null;
        if (input) return input;
        container = container.parentElement;
      }
      return null;
    });
    const lengthEl = lengthHandle.asElement();
    expect(lengthEl).not.toBeNull();
    await lengthEl!.click();
    await lengthEl!.fill(lengthMinutes);
    await lengthHandle.dispose();

    // Video Link — identified by its "https://..." placeholder (no ID used)
    const videoLinkInput = videoAccordion.getByRole('textbox', { name: 'https://' });
    await expect(videoLinkInput).toBeVisible({ timeout: 15_000 });
    await videoLinkInput.click();
    await videoLinkInput.fill(videoUrl);

    // Video Description — textarea adjacent to "Video Description" label
    const descLabel = videoAccordion.getByText('Video Description', { exact: true });
    const descHandle = await descLabel.evaluateHandle((labelEl) => {
      let container: HTMLElement | null = labelEl.parentElement;
      while (container) {
        const ta = container.querySelector('textarea') as HTMLTextAreaElement | null;
        if (ta) return ta;
        container = container.parentElement;
      }
      return null;
    });
    const descEl = descHandle.asElement();
    expect(descEl).not.toBeNull();
    await descEl!.click();
    await descEl!.fill(description);
    await descHandle.dispose();
  }

  // --- TR-032: Super Admin edits course ---

  async openCourseEditFromCard(courseTitle: string) {
    // Scope the "More Actions" click to the specific card that contains the course title
    const courseCard = this.page.locator('.course-card').filter({
      has: this.page.getByText(courseTitle, { exact: true }),
    });
    const moreActionsBtn = courseCard.getByText('More Actions', { exact: true });
    await expect(moreActionsBtn).toBeVisible({ timeout: 15_000 });
    await moreActionsBtn.click();

    // Wait for the Edit entry in the submenu then click it (exact match avoids "Edit (courseEditNew)")
    const editBtn = this.page.getByRole('button', { name: 'Edit', exact: true });
    await expect(editBtn).toBeVisible({ timeout: 15_000 });
    await editBtn.click();

    // Wait for the edit form URL and the Language 1 accordion before interacting with fields
    await this.page.waitForURL(/\/courseEdit/, { timeout: 30_000 });
    await expect(this.page.locator('.lessonAccordion').first()).toBeVisible({ timeout: 15_000 });
  }

  async openLessonEditorFromEdit() {
    const editLessonsBtn = this.page.getByRole('button', { name: 'Edit lessons' });
    await expect(editLessonsBtn).toBeVisible({ timeout: 15_000 });
    await editLessonsBtn.click();
    // Confirm the lesson editor opened by waiting for the Quiz Title label
    await expect(this.page.getByText('Quiz Title', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  async updateQuizTitleOnly(newTitle: string) {
    // Scope to the "1. QUIZ" region to avoid any stale or duplicate "Quiz Title" text
    const quizAccordion = this.page.getByRole('region', { name: '1. QUIZ' });
    const quizTitleLabel = quizAccordion.getByText('Quiz Title', { exact: true });
    await expect(quizTitleLabel).toBeVisible({ timeout: 15_000 });
    const titleHandle = await quizTitleLabel.evaluateHandle((labelEl) => {
      let container: HTMLElement | null = labelEl.parentElement;
      while (container) {
        const input = container.querySelector(
          'input[type="text"]',
        ) as HTMLInputElement | null;
        if (input) return input;
        container = container.parentElement;
      }
      return null;
    });
    const titleEl = titleHandle.asElement();
    expect(titleEl).not.toBeNull();
    await titleEl!.click();
    await titleEl!.fill(newTitle);
    await titleHandle.dispose();
  }

  // ── TR-024: Completed course re-assigned ─────────────────────────────────

  /**
   * Navigates to My Course → Passed tab, waits for the first course card,
   * verifies it carries a "Passed" status badge (no ID selector per refactor
   * rule — scoped to `.course-list`), and returns the course title for reuse
   * in the distribution step.
   */
  async openMyCoursePassedTabAndCaptureFirstCourseTitle(): Promise<string> {
    await this.openMyCoursePassedTab();

    const firstCard = this.page.locator('.course-list .course-card').first();
    await expect(firstCard).toBeVisible({ timeout: 30_000 });

    const titleSpan = firstCard.locator('span.bold.OSFillParent');
    const courseTitle = (await titleSpan.textContent())?.trim() ?? '';

    // Verify "Passed" badge in the same card without relying on an ID selector
    await expect(firstCard.locator('.COMPLETED').getByText('Passed')).toBeVisible({
      timeout: 10_000,
    });

    return courseTitle;
  }

  /**
   * After the Passed tab is already open, asserts that the card for the given
   * `courseTitle` is visible and its status badge reads "Passed".
   * Scoped to `.course-list` to avoid any ID-based selectors.
   */
  async expectCourseOnPassedTabByTitle(courseTitle: string) {
    const courseCard = this.page
      .locator('.course-list .course-card')
      .filter({ has: this.page.locator('span.bold.OSFillParent').filter({ hasText: courseTitle }) });

    await expect(courseCard).toBeVisible({ timeout: 30_000 });
    await expect(courseCard.locator('.COMPLETED').getByText('Passed')).toBeVisible({
      timeout: 10_000,
    });
  }

  // ── TR-020: User self-registers from library ──────────────────────────────

  /** Navigate to the course library and wait for cards to load. */
  async openCourseLibraryPage() {
    await this.page.goto(`${CSI_BASE_URL}/courseLibrary`);
    await expect(this.page.locator('.course-card').first()).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Finds the first course card with a "Get Course" button (paginating if
   * all visible courses on the current page are already registered), stores
   * the course title, clicks the button, and returns the title for later
   * assertion (recorded-steps/Training/TR-020.txt).
   */
  async findAndClickGetCourseCourse(): Promise<string> {
    // Safe upper-bound; the real max comes from the last pagination button
    const MAX_PAGES = 20;

    for (let i = 0; i < MAX_PAGES; i++) {
      await expect(this.page.locator('.course-card').first()).toBeVisible({ timeout: 15_000 });

      const firstUnregisteredCard = this.page
        .locator('.course-card')
        .filter({ has: this.page.getByRole('button', { name: 'Get Course' }) })
        .first();

      const found = await firstUnregisteredCard
        .isVisible({ timeout: 2_000 })
        .catch(() => false);

      if (found) {
        // Title lives in the card header (white bold text, 20 px)
        const titleSpan = firstUnregisteredCard.locator('.card-background-content span.bold.OSFillParent');
        const courseTitle = (await titleSpan.textContent())?.trim() ?? '';
        await firstUnregisteredCard.getByRole('button', { name: 'Get Course' }).click();
        return courseTitle;
      }

      // Every course on this page is already registered — try the next page
      const nextPageBtn = this.page.getByRole('button', { name: /go to next page/i });
      const isNextEnabled = await nextPageBtn.isEnabled().catch(() => false);
      if (!isNextEnabled) break;
      await nextPageBtn.click();
      await this.safeSleep(1_500);
    }

    throw new Error('TR-020: no unregistered course found in course library after checking all pages');
  }

  /**
   * Verifies the "successfully registered" success message and clicks
   * "Go to My Course" to navigate to the My Course page.
   */
  async expectCourseRegistrationSuccessAndGoToMyCourse() {
    await expect(
      this.page.getByText('You have successfully registered to this course.'),
    ).toBeVisible({ timeout: 30_000 });
    await this.page.getByRole('button', { name: 'Go to My Course' }).click();
  }

  /**
   * After landing on the My Course page, clicks the "Ongoing" tab and
   * verifies that the given course title is listed (scrolling is handled
   * automatically by Playwright's visibility assertion).
   */
  async clickOngoingTabAndExpectCourseTitle(courseTitle: string) {
    const ongoingLink = this.page.getByRole('link', { name: 'Ongoing', exact: true });
    await expect(ongoingLink).toBeVisible({ timeout: 30_000 });
    await ongoingLink.click();
    await expect(this.page.getByText(courseTitle, { exact: true })).toBeVisible({ timeout: 30_000 });
  }
}