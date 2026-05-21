import { expect, type Locator } from '@playwright/test';
import { CSI_BASE_URL, CSI_PENETRATION_TEST_PATH } from '../../config/csi';
import { BasePage } from '../BasePage';

export class CsiPenetrationTestPage extends BasePage {
  readonly requestPenetrationTestButton = this.page.getByRole('button', { name: 'Request Penetration Test' });
  readonly nextButton = this.page.getByRole('button', { name: 'Next' });
  readonly submitButton = this.page.getByRole('button', { name: 'Submit' });

  private penTestGrid(): Locator {
    return this.page.getByRole('grid').filter({
      has: this.page.getByRole('columnheader', { name: 'Status' }),
    });
  }

  /** Wizard markup uses `form#Form1` but is not always exposed as role=form in the a11y tree. */
  private penTestWizardForm(): Locator {
    return this.page.locator('form#Form1');
  }

  async openPenetrationTest() {
    await this.page.goto(`${CSI_BASE_URL}${CSI_PENETRATION_TEST_PATH}`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.requestPenetrationTestButton).toBeVisible({ timeout: 60_000 });
    await expect(this.requestPenetrationTestButton).toBeEnabled({ timeout: 15_000 });
  }

  async fillContactStepAndContinue(params: {
    contactName: string;
    email: string;
    phone: string;
  }): Promise<void> {
    await this.requestPenetrationTestButton.click();

    const contactNameField = this.page.getByRole('textbox', { name: 'Contact Person Name*' });
    await contactNameField.fill(params.contactName);

    const emailField = this.page.getByRole('textbox', { name: 'Email Address*' });
    await emailField.fill(params.email);

    const phoneField = this.page.getByRole('textbox', { name: 'Phone number' });
    await phoneField.click();
    await phoneField.fill('+1');
    await phoneField.click();
    await phoneField.fill(params.phone);

    await this.nextButton.click();
    await expect(this.page.getByRole('region', { name: 'Vulnerability Assessment (VA)' })).toBeVisible({
      timeout: 60_000,
    });
  }

  /** PT-001 step 2: VA targets, NPT text/number fields (recorded PT-001.txt). */
  private async fillQuestionnaireNumberAndTextFields(): Promise<void> {
    const vaRegion = this.page.getByRole('region', { name: 'Vulnerability Assessment (VA)' });
    await vaRegion.getByPlaceholder('Please Answer').fill('1');

    const nptRegion = this.page.getByRole('region', { name: 'Network Penetration Test (NPT)' });
    await nptRegion.getByRole('textbox', { name: 'Please Answer' }).fill('Yes');
    await nptRegion.getByRole('spinbutton').fill('1');
  }

  private questionnaireNextButton(): Locator {
    return this.penTestWizardForm().getByRole('button', { name: 'Next' });
  }

  /**
   * Each questionnaire question with choices uses `option_container` tiles (A., B., …).
   * Select the first option in every such question group.
   */
  private async selectFirstOptionForEachQuestion(): Promise<void> {
    const form = this.penTestWizardForm();
    await expect(form).toBeVisible({ timeout: 60_000 });

    await form.evaluate((root) => {
      const labels = root.querySelectorAll<HTMLLabelElement>('label[data-label].bold');
      for (const label of labels) {
        let container: Element | null = label.closest('div[data-container]');
        while (container && !container.querySelector('.option_container')) {
          container = container.parentElement?.closest('div[data-container]') ?? null;
        }
        if (!container) {
          continue;
        }
        const options = Array.from(container.querySelectorAll<HTMLElement>('.option_container'));
        if (options.length === 0) {
          continue;
        }
        const hasSelection = options.some((opt) => opt.classList.contains('option_container_select'));
        if (!hasSelection) {
          options[0].click();
        }
      }
    });

    await expect(this.questionnaireNextButton()).toBeEnabled({ timeout: 90_000 });
  }

  async fillAssessmentStepAndSubmit(): Promise<void> {
    await this.fillQuestionnaireNumberAndTextFields();
    await this.selectFirstOptionForEachQuestion();

    await this.questionnaireNextButton().click();
    await this.submitButton.click();

    await expect(this.page.getByText('You have successfully added', { exact: false })).toBeVisible({
      timeout: 120_000,
    });
  }

  /** PT-001: first grid row (top) shows Submitted status after success toast. */
  async expectFirstPenTestGridRowSubmitted(): Promise<void> {
    const grid = this.penTestGrid();
    await expect(grid).toBeVisible({ timeout: 60_000 });
    const firstSubmittedRow = grid.getByRole('row').filter({ hasText: 'Submitted' }).first();
    await expect(firstSubmittedRow).toBeVisible({ timeout: 60_000 });
  }

  async submitNewPenetrationTestRequest(params: {
    contactName: string;
    email: string;
    phone: string;
  }): Promise<void> {
    await this.fillContactStepAndContinue(params);
    await this.fillAssessmentStepAndSubmit();
    await this.expectFirstPenTestGridRowSubmitted();
  }
}
