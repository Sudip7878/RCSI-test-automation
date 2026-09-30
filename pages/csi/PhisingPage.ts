import { expect } from '@playwright/test';
import { CSI_BASE_URL } from '../../config/csi';
import {
  CSI_PH024_LANDING_PAGE_HOST,
  PH011_ENGAGEMENT_POLL_INTERVAL_MS,
  PH011_ENGAGEMENT_POLL_TIMEOUT_MS,
  PH011_TEST_DURATION_OPTION_NAME,
  PH011_ZERO_ENGAGEMENT_STAT_LABELS,
  PH014_COMPLETED_TAB_SETTLE_MS,
  PH014_TAB_BEFORE_CLICK_MS,
  csiPh011ScheduleTimeHHmm,
  csiPhisingUserSearchToken,
} from '../../utils/csi/phisingTestData';
import { BasePage } from '../BasePage';

export class CsiPhisingPage extends BasePage {
  readonly firstTemplateSelectButton = this.page.getByRole('button', { name: 'Select this attack' }).first();
  readonly nextButton = this.page.getByRole('button', { name: 'Next', exact: true });
  readonly individualsTab = this.page.getByRole('tab', { name: 'Individuals', exact: true });
  readonly distributeButton = this.page.getByRole('button', { name: 'Distribute' });

  private async safeSleep(ms: number) {
    if (this.page.isClosed()) {
      return;
    }
    await this.page.waitForTimeout(ms).catch(() => {});
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

  private campaignScheduleDateCombobox() {
    return this.page.getByRole('combobox', { name: 'Select a date.' });
  }

  private async clickFirstVisibleListboxOption() {
    const expanded = this.page.getByRole('combobox', { expanded: true });
    await expect(expanded).toBeVisible({ timeout: 12_000 });

    const clicked = await expanded.evaluate((combo) => {
      const panelId = combo.getAttribute('aria-controls');
      const panel = panelId ? document.getElementById(panelId) : null;
      const roots: ParentNode[] = panel ? [panel, document.body] : [document.body];

      for (const root of roots) {
        const options = Array.from(root.querySelectorAll('[role="option"]')) as HTMLElement[];
        for (const el of options) {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') {
            continue;
          }
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) {
            continue;
          }
          el.click();
          return true;
        }
      }
      return false;
    });
    expect(clicked).toBe(true);
  }

  private async clickDateInOpenDatepicker(date: Date) {
    const calendar = this.page.getByRole('dialog');
    await expect(calendar).toBeVisible({ timeout: 15_000 });

    const fullDateLabel = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const fullButton = calendar.getByRole('button', { name: fullDateLabel });
    if (await fullButton.isVisible().catch(() => false)) {
      await fullButton.click();
      return;
    }

    const shortLabel = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const shortButton = calendar.getByRole('button', { name: shortLabel });
    await expect(shortButton).toBeVisible({ timeout: 15_000 });
    await shortButton.click();
  }

  private async clickTomorrowInOpenDatepicker() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await this.clickDateInOpenDatepicker(tomorrow);
  }

  private async clickTodayInOpenDatepicker() {
    await this.clickDateInOpenDatepicker(new Date());
  }

  private async clickNDaysAheadInOpenDatepicker(days: number) {
    const target = new Date();
    target.setDate(target.getDate() + days);
    await this.clickDateInOpenDatepicker(target);
  }

  private async selectDurationPreferringDay() {
    const durationTrigger = this.page.getByText('Duration', { exact: true });
    await expect(durationTrigger).toBeVisible({ timeout: 15_000 });
    await durationTrigger.click();

    const dayOptions = await this.page.getByRole('option', { name: /^day$/i }).all();
    for (const option of dayOptions) {
      if (await option.isVisible().catch(() => false)) {
        await option.click();
        return;
      }
    }

    await this.clickFirstVisibleListboxOption();
  }

  /**
   * Fills the Test Duration field regardless of whether the form renders it as a number
   * input (e.g. PH-003: `<input type="number" id="Input_duration">`) or as a dropdown.
   * When the number input is present it fills the value `1`; otherwise it falls back to
   * {@link selectDurationPreferringDay}.
   */
  private async fillTestDurationInput() {
    const numberInput = this.page.locator('#Input_duration');
    if (await numberInput.isVisible().catch(() => false)) {
      await numberInput.fill('1');
      return;
    }
    await this.selectDurationPreferringDay();
  }

  /** PH-011: time input beside “Schedule time” text (plain text, not an associated label — getByLabel fails). */
  private async fillPh011ScheduleTimeNearLabel(value: string) {
    const label = this.page.getByText('Schedule time', { exact: true });
    await expect(label).toBeVisible({ timeout: 15_000 });
    const handle = await label.evaluateHandle((labelEl) => {
      let container: HTMLElement | null = labelEl.parentElement;
      while (container) {
        const input = container.querySelector('input[type="time"]:not([disabled])');
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

  /** PH-011: duration combobox (placeholder “Duration”), not the Timezone combobox. */
  private ph011TestDurationCombobox() {
    return this.page.getByRole('combobox', { name: 'Select an option' }).filter({
      has: this.page.getByText('Duration', { exact: true }),
    });
  }

  /** PH-011: set Schedule time to two minutes after the current clock. */
  private async setPh011ScheduleTimeTwoMinutesFromNow() {
    await this.fillPh011ScheduleTimeNearLabel(csiPh011ScheduleTimeHHmm());
  }

  /** PH-011: Test Duration = 1 day (accessible name on option; not PH-001’s bare `day`). */
  private async selectPh011TestDuration() {
    const combobox = this.ph011TestDurationCombobox();
    await expect(combobox).toBeVisible({ timeout: 15_000 });
    await combobox.click();

    const listbox = this.page.getByRole('listbox');
    const oneDayOption = listbox.getByRole('option', {
      name: PH011_TEST_DURATION_OPTION_NAME,
      exact: true,
    });
    await expect(oneDayOption).toBeVisible({ timeout: 15_000 });
    await oneDayOption.click();
  }

  /**
   * PH-011: test name, today’s date, schedule time +2 min, duration 1 day.
   * Does not change {@link fillPhisingTestDetailsAndContinue} used by PH-001 / CrossCutting.
   */
  async fillPhishingTestDetailsAndContinueForPh011(testName: string) {
    const testNameInput = this.page.getByRole('textbox', {
      name: /Example: HSBC Phishing Test/i,
    });
    await expect(testNameInput).toBeVisible({ timeout: 30_000 });
    await testNameInput.click();
    await testNameInput.fill(testName);

    const dateCombobox = this.campaignScheduleDateCombobox();
    await expect(dateCombobox).toBeVisible({ timeout: 15_000 });
    await dateCombobox.click();
    await this.clickTodayInOpenDatepicker();

    await this.setPh011ScheduleTimeTwoMinutesFromNow();
    await this.selectPh011TestDuration();

    await expect(this.nextButton).toBeVisible({ timeout: 15_000 });
    await this.nextButton.click();
  }

  /** PH-011: same as {@link finalizeAndDistribute} — kept separate so PH-011 flow can diverge. */
  private async finalizeAndDistributeForPh011() {
    await expect(this.nextButton).toBeVisible({ timeout: 30_000 });
    await this.nextButton.click();

    await expect(this.distributeButton).toBeVisible({ timeout: 30_000 });
    await this.distributeButton.click();
  }

  /**
   * PH-011: after Distribute the app navigates to the test detail view (stats visible).
   * Does not use {@link expectPhisingTestCreated} or list → View detail navigation.
   */
  async expectPh011DetailPageReadyAfterDistribute(testName: string) {
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page.getByText(testName, { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(this.phishingStatScoreBox('Email sent')).toBeVisible({ timeout: 60_000 });
  }

  /** PH-011: create, distribute, wait for auto-redirect to detail page (recorded-steps/Phising/PH-011.txt). */
  async createAndDistributePhishingTestForPh011(params: {
    targetEmail: string;
    testName: string;
    searchToken?: string;
  }) {
    const searchToken = params.searchToken ?? csiPhisingUserSearchToken(params.targetEmail);

    await this.openPhisingTestCreation();
    await this.selectFirstAttackTemplateAndContinue();
    await this.chooseIndividualsAndSelectLoginUser(params.targetEmail, searchToken);
    await this.fillPhishingTestDetailsAndContinueForPh011(params.testName);
    await this.finalizeAndDistributeForPh011();
    await this.expectPh011DetailPageReadyAfterDistribute(params.testName);
  }

  private async openVirtualSelectByDisplayValue(displayValue: string) {
    const combobox = this.page.getByRole('combobox', { name: 'Select an option' }).filter({
      has: this.page.getByText(displayValue, { exact: true }),
    });
    await expect(combobox).toBeVisible({ timeout: 15_000 });
    await combobox.click();
    await this.safeSleep(250);
  }

  private async openCourseComboboxNearSection(sectionLabel: 'Link click action' | 'Landing page action') {
    const sectionHeading = this.page.getByText(sectionLabel, { exact: true });
    await expect(sectionHeading).toBeVisible({ timeout: 15_000 });
    const opened = await sectionHeading.evaluate((heading) => {
      let container: HTMLElement | null = heading.parentElement;
      while (container) {
        const combobox = container.querySelector('[role="combobox"]') as HTMLElement | null;
        if (combobox) {
          const toggle =
            (combobox.querySelector('.vscomp-toggle-button') as HTMLElement | null) ?? combobox;
          toggle.click();
          return true;
        }
        container = container.parentElement;
      }
      return false;
    });
    expect(opened).toBe(true);
    await this.safeSleep(250);
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

  private async fillPh024RichTextParagraph(text: string) {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      for (const frame of this.page.frames()) {
        const paragraphs = await frame.getByRole('paragraph').all();
        if (paragraphs.length === 0) {
          continue;
        }
        await paragraphs[0].click();
        const editor = frame.getByLabel(/Rich Text Area/i);
        if ((await editor.count()) > 0) {
          await editor.fill(text);
          return;
        }
      }
      await this.safeSleep(500);
    }
    throw new Error('PH-024: rich text editor frame not found.');
  }

  private async selectPh024SendingEmailDomain(domain: string) {
    const domainCombobox = this.page
      .getByRole('combobox')
      .filter({ has: this.page.getByRole('option', { name: domain }) });
    await expect(domainCombobox).toBeVisible({ timeout: 15_000 });
    await domainCombobox.selectOption({ label: domain });
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
    await expect(this.individualsTab).toBeVisible({ timeout: 30_000 });
    await this.individualsTab.click();

    const searchInput = this.page.getByRole('searchbox');
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
    await searchInput.click();
    await searchInput.fill(searchToken);

    const searchButtons = await this.page.getByRole('button', { name: 'Search' }).all();
    expect(searchButtons.length).toBeGreaterThan(0);
    await searchButtons[0].click();
    await this.safeSleep(2000);

    const row = this.targetUserRowByEmail(loginEmail);
    await expect(row).toBeVisible({ timeout: 30_000 });
    const checkbox = row.getByRole('checkbox');
    await expect(checkbox).toBeVisible();
    await checkbox.check();

    await expect(this.nextButton).toBeVisible({ timeout: 15_000 });
    await this.nextButton.click();
  }

  async fillPhisingTestDetailsAndContinue(
    testName: string,
    options?: { scheduleStartToday?: boolean },
  ) {
    const testNameInput = this.page.getByRole('textbox', {
      name: /Example: HSBC Phishing Test/i,
    });
    await expect(testNameInput).toBeVisible({ timeout: 30_000 });
    await testNameInput.click();
    await testNameInput.fill(testName);

    const dateCombobox = this.campaignScheduleDateCombobox();
    await expect(dateCombobox).toBeVisible({ timeout: 15_000 });
    await dateCombobox.click();
    if (options?.scheduleStartToday) {
      await this.clickTodayInOpenDatepicker();
    } else {
      await this.clickTomorrowInOpenDatepicker();
    }

    await this.fillTestDurationInput();

    await expect(this.nextButton).toBeVisible({ timeout: 15_000 });
    await this.nextButton.click();
  }

  async createAndDistributePhishingTestFromTemplate(params: {
    targetEmail: string;
    testName: string;
    scheduleStartToday?: boolean;
    searchToken?: string;
  }) {
    const searchToken = params.searchToken ?? csiPhisingUserSearchToken(params.targetEmail);

    await this.openPhisingTestCreation();
    await this.selectFirstAttackTemplateAndContinue();
    await this.chooseIndividualsAndSelectLoginUser(params.targetEmail, searchToken);
    await this.fillPhisingTestDetailsAndContinue(params.testName, {
      scheduleStartToday: params.scheduleStartToday,
    });
    await this.finalizeAndDistribute();
    await this.expectPhisingTestCreated(params.testName);
  }

  private phishingTestListGrid() {
    return this.page.getByRole('grid').filter({
      has: this.page.getByRole('columnheader', { name: 'Name' }),
    });
  }

  async openPhishingTestList() {
    await this.page.goto(`${CSI_BASE_URL}/phishingTest`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async openPhishingTestViewDetail(testName: string) {
    const row = this.phishingTestListGrid()
      .getByRole('row')
      .filter({
        has: this.page.getByRole('gridcell', { name: testName }),
      })
      .first();
    await expect(row).toBeVisible({ timeout: 60_000 });
    await row.getByRole('button', { name: 'View detail' }).click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  private phishingStatScoreBox(statLabel: string) {
    return this.page.locator('.score-box').filter({
      has: this.page.getByText(statLabel, { exact: true }),
    });
  }

  private async expectPhishingStatShowsZeroPercent(statLabel: string) {
    const box = this.phishingStatScoreBox(statLabel);
    await expect(box).toBeVisible({ timeout: 30_000 });
    await expect(box.locator('span.bold').first()).toHaveText(/\(\s*0\s*%\)/);
  }

  private async expectPh011ZeroEngagementStats() {
    for (const label of PH011_ZERO_ENGAGEMENT_STAT_LABELS) {
      await this.expectPhishingStatShowsZeroPercent(label);
    }
  }

  /**
   * PH-011: poll every 5 minutes for up to 20 minutes; fail if opened/clicked/submitted exceed 0%.
   */
  async expectPh011IgnoredPhishingEngagementStats(
    pollIntervalMs = PH011_ENGAGEMENT_POLL_INTERVAL_MS,
    pollTimeoutMs = PH011_ENGAGEMENT_POLL_TIMEOUT_MS,
  ) {
    const deadline = Date.now() + pollTimeoutMs;

    await this.expectPh011ZeroEngagementStats();

    while (Date.now() < deadline) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        break;
      }
      await this.safeSleep(Math.min(pollIntervalMs, remainingMs));
      if (Date.now() >= deadline) {
        break;
      }
      await this.page.reload();
      await this.page.waitForLoadState('domcontentloaded');
      await this.expectPh011ZeroEngagementStats();
    }
  }

  async finalizeAndDistribute() {
    await expect(this.nextButton).toBeVisible({ timeout: 30_000 });
    await this.nextButton.click();

    await expect(this.distributeButton).toBeVisible({ timeout: 30_000 });
    await this.distributeButton.click();
  }

  /**
   * PH-008: fills test name, sets schedule start date to day 7 of the inclusive window
   * (today + 6 days), and selects duration. Differs from {@link fillPhisingTestDetailsAndContinue}
   * only in the schedule date offset.
   */
  async fillPhisingTestDetailsAndContinueForPh008(testName: string) {
    const testNameInput = this.page.getByRole('textbox', {
      name: /Example: HSBC Phishing Test/i,
    });
    await expect(testNameInput).toBeVisible({ timeout: 30_000 });
    await testNameInput.click();
    await testNameInput.fill(testName);

    const dateCombobox = this.campaignScheduleDateCombobox();
    await expect(dateCombobox).toBeVisible({ timeout: 15_000 });
    await dateCombobox.click();
    // Schedule start date: 7-day window inclusive of today means today + 6 days
    await this.clickNDaysAheadInOpenDatepicker(6);

    await this.fillTestDurationInput();

    await expect(this.nextButton).toBeVisible({ timeout: 15_000 });
    await this.nextButton.click();
  }

  /**
   * PH-008: the review/settings step that precedes Distribute exposes a "Delayed course rule"
   * section. Select "After a specific date", fill in the pre-computed `delayedDate`
   * (YYYY-MM-DD, today + 6 days = day 7 inclusive), then proceed through Next → Distribute.
   */
  async finalizeWithDelayedCourseRuleAndDistribute(delayedDate: string) {
    const afterSpecificDateRadio = this.page.getByRole('radio', { name: 'After a specific date' });
    await expect(afterSpecificDateRadio).toBeVisible({ timeout: 30_000 });
    await afterSpecificDateRadio.check();

    // Date textbox becomes visible after the radio is selected
    const dateTextbox = this.page.getByRole('textbox', { name: 'Date' });
    await expect(dateTextbox).toBeVisible({ timeout: 15_000 });
    await dateTextbox.fill(delayedDate);

    await expect(this.nextButton).toBeVisible({ timeout: 15_000 });
    await this.nextButton.click();

    await expect(this.distributeButton).toBeVisible({ timeout: 30_000 });
    await this.distributeButton.click();
  }

  async expectPhisingTestCreated(testName: string) {
    await expect(this.page.getByText(testName, { exact: true })).toBeVisible({ timeout: 60_000 });
  }

  async openPhishingDashboard() {
    await this.page.goto(`${CSI_BASE_URL}/phishingDashboard`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  private phishingCourseCards() {
    return this.page.locator('.course-card');
  }

  async openPhishingCourse() {
    await this.page.goto(`${CSI_BASE_URL}/phishingCourse`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async openPhishingCourseCompletedTab() {
    await this.openPhishingCourse();
    const completedTab = this.page.getByRole('link', { name: 'Completed', exact: true });
    await expect(completedTab).toBeVisible({ timeout: 60_000 });
    await this.safeSleep(PH014_TAB_BEFORE_CLICK_MS);
    await completedTab.click();
    await this.safeSleep(PH014_COMPLETED_TAB_SETTLE_MS);
  }

  /**
   * PH-014: Completed tab — first course card shows Passed and View Certificate (presence only;
   * recorded-steps/Phising/PH-014.txt).
   */
  async expectPh014CompletedPassedCourseWithViewCertificate() {
    await this.openPhishingCourseCompletedTab();

    const firstCard = this.phishingCourseCards().first();
    await expect(firstCard).toBeVisible({ timeout: 60_000 });

    const passedStatus = firstCard.getByText('Passed', { exact: true });
    await expect(passedStatus).toBeVisible({ timeout: 60_000 });
    await passedStatus.click();

    await expect(firstCard.getByRole('button', { name: 'View Certificate' })).toBeVisible({
      timeout: 60_000,
    });
  }

  async expectPh020PhishingDashboardSectionsVisible() {
    await expect(this.page.getByText('Phishing Resistance Score')).toBeVisible({ timeout: 60_000 });
    await expect(this.page.getByText('Organization performance')).toBeVisible();
    await expect(this.page.getByText('Target Goal', { exact: true })).toBeVisible();
    await expect(this.page.getByText('Phishing Resistance Summary')).toBeVisible();

    await expect(this.page.getByRole('columnheader', { name: 'Test name' })).toBeVisible();
    await expect(this.page.getByRole('columnheader', { name: 'Users number' })).toBeVisible();
    await expect(this.page.getByRole('columnheader', { name: /Clicked Rate/ })).toBeVisible();
    await expect(this.page.getByRole('columnheader', { name: /Submit Rate/ })).toBeVisible();
    await expect(this.page.getByRole('columnheader', { name: /Training Progress/ })).toBeVisible();

    await expect(this.page.getByText('Test Conducted')).toBeVisible();
    await expect(this.page.getByText('Upcoming Test')).toBeVisible();
    await expect(this.page.getByText('Test In Progress')).toBeVisible();
    await expect(this.page.getByText('Completed', { exact: true })).toBeVisible();

    await expect(this.page.getByText('Most Deadly Segments')).toBeVisible();
    await expect(this.page.getByText('Most Vulnerable Employees')).toBeVisible();

    await expect(this.page.getByRole('columnheader', { name: 'User', exact: true })).toBeVisible();
    await expect(this.page.getByRole('columnheader', { name: 'Opened Email' })).toBeVisible();
    await expect(this.page.getByRole('columnheader', { name: 'Clicked Link' })).toBeVisible();
    await expect(this.page.getByRole('columnheader', { name: 'Submitted Data' })).toBeVisible();
  }

  async openPh024NewEmailTemplateEditor() {
    await this.page.goto(
      `${CSI_BASE_URL}/phishingTemplateEdit?id=0&type=TEMPLATE&ai_enabled=false`,
    );
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page.getByRole('textbox', { name: /Email Display Name/ })).toBeVisible({
      timeout: 60_000,
    });
  }

  /** PH-021: navigate directly to the phishing dashboard (Avotech org scoped). */
  private async openPh021PhishingDashboard() {
    await this.page.goto(`${CSI_BASE_URL}/Avotech/phishingDashboard`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * PH-021: open the org selector by clicking its trigger text (either the "Select Organization"
   * placeholder on first open, or the currently selected org name on subsequent switches),
   * search for orgName, click the matching option, then wait for the report DOM to update.
   */
  private async ph021OpenOrgSelectorAndPick(triggerText: string, orgName: string) {
    await this.page.getByText(triggerText).click();

    const search = this.page.getByRole('textbox', { name: 'Search' });
    await expect(search).toBeVisible({ timeout: 10_000 });
    await search.fill(orgName);

    const option = this.page.getByRole('option', { name: orgName, exact: true });
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click();

    // Wait for the report structure to re-render after the org switch
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * PH-021: verify that the core phishing report sections are visible for the currently
   * selected org. Mirrors the section structure checked in {@link expectPh020PhishingDashboardSectionsVisible}.
   */
  private async expectPh021ReportSectionsVisible() {
    await expect(this.page.getByText('Phishing Resistance Score')).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByText('Organization performance')).toBeVisible({ timeout: 15_000 });
    await expect(this.page.getByText('Phishing Resistance Summary')).toBeVisible({ timeout: 15_000 });
    await expect(this.page.getByRole('columnheader', { name: 'Test name' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(this.page.getByRole('columnheader', { name: 'Users number' })).toBeVisible({
      timeout: 15_000,
    });
  }

  /**
   * PH-021: Super Admin selects Org A in the phishing report org selector, verifies report
   * sections are visible, then switches to Org B and repeats the visibility check
   * (recorded-steps/Phising/PH-021.txt).
   */
  async expectPh021SuperAdminViewsResultsAcrossOrgs(orgAName: string, orgBName: string) {
    await this.openPh021PhishingDashboard();

    // Org A (Avotech) is pre-selected by default on this URL — verify sections immediately
    await this.expectPh021ReportSectionsVisible();

    // Switch to Org B and verify again
    await this.ph021OpenOrgSelectorAndPick(orgAName, orgBName);
    await this.expectPh021ReportSectionsVisible();
  }

  async createAndPublishPh024EmailTemplate(params: {
    uniqueSuffix: string;
    landingPageHost?: string;
  }): Promise<void> {
    const s = params.uniqueSuffix;
    const landingHost = params.landingPageHost ?? CSI_PH024_LANDING_PAGE_HOST;

    await this.openPh024NewEmailTemplateEditor();

    await this.page.getByRole('textbox', { name: /Email Display Name/ }).fill(`TestDisplay${s}`);
    await this.page.getByRole('textbox', { name: /Email Subject/ }).fill(`TestSubject${s}`);
    await this.page.getByRole('checkbox', { name: /Template content/ }).check();

    await this.fillTextboxNearLabel('Actual Sending Email', `test${s}`);
    await this.selectPh024SendingEmailDomain('avotech.com');
    await this.page.getByRole('textbox', { name: /Reply-to email/ }).fill(`test${s}@test.com`);

    await this.fillPh024RichTextParagraph(`Test Paragraph ${s}`);

    await this.page.getByText('Phishing Landing Page', { exact: true }).click();
    const landingUrlField = this.page.getByRole('textbox', { name: /^https:\/\// });
    await expect(landingUrlField).toBeVisible({ timeout: 15_000 });
    await landingUrlField.fill(landingHost);

    await this.page.getByText('Phishing Training', { exact: true }).click();

    const savePreview = this.page.getByRole('button', { name: 'Save & Preview' });
    await expect(savePreview).toBeVisible({ timeout: 30_000 });
    await savePreview.click();
    await this.safeSleep(3000);

    await expect(this.nextButton).toBeVisible({ timeout: 30_000 });
    await this.nextButton.click();
    await expect(this.page.getByText('Type of Template')).toBeVisible({ timeout: 60_000 });

    await this.fillTextboxNearLabel('Title', `Title${s}`, true);
    await this.safeSleep(3000);

    await this.openVirtualSelectByDisplayValue('Location');
    await this.clickFirstVisibleListboxOption();

    await this.openVirtualSelectByDisplayValue('Category');
    await this.clickFirstVisibleListboxOption();

    await this.openVirtualSelectByDisplayValue('Language');
    await this.clickFirstVisibleListboxOption();

    await this.fillTextboxNearLabel('Description', `Description ${s}`, true);

    await expect(this.nextButton).toBeVisible({ timeout: 15_000 });
    await this.nextButton.click();

    await this.safeSleep(3000);
    await this.openCourseComboboxNearSection('Link click action');
    await this.clickFirstVisibleListboxOption();
    await this.openCourseComboboxNearSection('Landing page action');
    await this.clickFirstVisibleListboxOption();

    await expect(this.nextButton).toBeVisible({ timeout: 15_000 });
    await this.nextButton.click();

    const publish = this.page.getByRole('button', { name: 'Publish' });
    await expect(publish).toBeVisible({ timeout: 30_000 });
    await publish.click();

    await expect(this.page.getByText('Record updated.', { exact: true })).toBeVisible({
      timeout: 60_000,
    });

    const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(this.page.getByText(new RegExp(`Title\\s*${escaped}`, 'i'))).toBeVisible({
      timeout: 60_000,
    });
  }
}
