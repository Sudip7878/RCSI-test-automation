import { expect, type Locator } from '@playwright/test';
import { CSI_BASE_URL } from '../../config/csi';
import { CSI_PH024_LANDING_PAGE_HOST } from '../../utils/csi/phisingTestData';
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

  private async safeSleep(ms: number) {
    if (this.page.isClosed()) {
      return;
    }
    await this.page.waitForTimeout(ms).catch(() => {});
  }

  private async clickFirstVisibleVscompOption() {
    const options = this.page.getByRole('option');
    await expect(options.first()).toBeAttached({ timeout: 15_000 });
    const count = await options.count();
    for (let i = 0; i < count; i += 1) {
      const opt = options.nth(i);
      if (await opt.isVisible().catch(() => false)) {
        await opt.click();
        return;
      }
    }
    throw new Error('PH-024: no visible VirtualSelect option.');
  }

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

  async openPhishingDashboard() {
    await this.page.goto(`${CSI_BASE_URL}/phishingDashboard`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** PH-020: dashboard widgets and grids (recorded-steps/Phising/PH-020.txt). */
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

  private async openPh024DropdownByDataBlock(widget: string) {
    const root = this.page.locator(`[data-block="${widget}"]`).first();
    await expect(root).toBeVisible({ timeout: 15_000 });
    await root.locator('.vscomp-toggle-button').first().click();
    await this.safeSleep(250);
  }

  /**
   * PH-024: new template wizard through Publish. `uniqueSuffix` from {@link csiPh024UniqueSuffix}.
   * Location / category / language / both course dropdowns: first visible option only (recorded-steps/Phising/PH-024.txt).
   */
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

    await this.page.locator('#Input_sender_email').fill(`test${s}`);
    await this.page.getByRole('textbox', { name: /Reply-to email/ }).fill(`test${s}@test.com`);

    const rte = this.page.locator('iframe[title="Rich Text Area"]').first().contentFrame();
    const editable = rte.locator('[contenteditable="true"]').first();
    await editable.click({ timeout: 15_000 }).catch(async () => {
      await rte.getByRole('paragraph').first().click();
    });
    await editable.fill(`Test Paragraph ${s}`);

    await this.page.getByText('Phishing Landing Page', { exact: true }).click();
    const landingUrlField = this.page.getByRole('textbox', { name: /^https:\/\// });
    await expect(landingUrlField).toBeVisible({ timeout: 15_000 });
    await landingUrlField.fill(landingHost);

    await this.page.getByText('Phishing Training', { exact: true }).click();

    const savePreview = this.page.getByRole('button', { name: 'Save & Preview' });
    await expect(savePreview).toBeVisible({ timeout: 30_000 });
    await savePreview.click();

    await expect(this.nextButton).toBeVisible({ timeout: 30_000 });
    await this.nextButton.click();

    const titleInput = this.page.locator('#Input_name2');
    await expect(titleInput).toBeVisible({ timeout: 30_000 });
    await titleInput.fill(`Title${s}`);
    await this.safeSleep(3000);

    // Let Location / Category / Language VirtualSelects mount before opening.
    await this.safeSleep(3000);
    await this.openPh024DropdownByDataBlock('Search.DropDown_Location');
    await this.clickFirstVisibleVscompOption();

    await this.openPh024DropdownByDataBlock('Search.DropDown_PhishingCategroy');
    await this.clickFirstVisibleVscompOption();

    await this.openPh024DropdownByDataBlock('Search.DropDown_Language');
    await this.clickFirstVisibleVscompOption();

    await this.page.locator('#TextArea_description').fill(`Description ${s}`);

    await expect(this.nextButton).toBeVisible({ timeout: 15_000 });
    await this.nextButton.click();

    const courseToggles = this.page.locator('[data-block="Search.DropDown_Course"] .vscomp-toggle-button');
    await expect(courseToggles.first()).toBeVisible({ timeout: 30_000 });
    // Let Link click action + Landing page course dropdowns finish mounting.
    await this.safeSleep(3000);
    await courseToggles.nth(0).click();
    await this.clickFirstVisibleVscompOption();
    await courseToggles.nth(1).click();
    await this.clickFirstVisibleVscompOption();

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
