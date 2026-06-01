import { expect } from '@playwright/test';
import { CSI_BASE_URL } from '../../config/csi';
import { CSI_PH024_LANDING_PAGE_HOST } from '../../utils/csi/phisingTestData';
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

    const tomorrowButton = calendar.getByRole('button', { name: fullDateLabel });
    if (await tomorrowButton.isVisible().catch(() => false)) {
      await tomorrowButton.click();
      return;
    }

    const tomorrowShort = tomorrow.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const shortButton = calendar.getByRole('button', { name: tomorrowShort });
    await expect(shortButton).toBeVisible({ timeout: 15_000 });
    await shortButton.click();
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

    const row = this.targetUserRowByEmail(loginEmail);
    await expect(row).toBeVisible({ timeout: 30_000 });
    const checkbox = row.getByRole('checkbox');
    await expect(checkbox).toBeVisible();
    await checkbox.check();

    await expect(this.nextButton).toBeVisible({ timeout: 15_000 });
    await this.nextButton.click();
  }

  async fillPhisingTestDetailsAndContinue(testName: string) {
    const testNameInput = this.page.getByRole('textbox', {
      name: /Example: HSBC Phishing Test/i,
    });
    await expect(testNameInput).toBeVisible({ timeout: 30_000 });
    await testNameInput.click();
    await testNameInput.fill(testName);

    const dateCombobox = this.campaignScheduleDateCombobox();
    await expect(dateCombobox).toBeVisible({ timeout: 15_000 });
    await dateCombobox.click();
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

  async openPhishingDashboard() {
    await this.page.goto(`${CSI_BASE_URL}/phishingDashboard`);
    await this.page.waitForLoadState('domcontentloaded');
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
