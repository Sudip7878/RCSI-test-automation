import { expect, type Locator } from '@playwright/test';
import { CSI_BASE_URL, CSI_CYBER_INSURANCE_PATH } from '../../config/csi';
import { BasePage } from '../BasePage';

export class CsiCyberInsurancePage extends BasePage {
  readonly applyNowButton = this.page.getByRole('button', { name: 'Apply Now' });
  readonly editFormButton = this.page.getByRole('button', { name: 'Edit Form' });
  readonly permissionDeniedMessage = this.page.getByText(
    "You don't have permissions to view this screen.",
  );

  private insuranceMain(): Locator {
    return this.page.getByRole('main');
  }

  private async safeSleep(ms: number) {
    await this.page.waitForTimeout(ms);
  }

  async openCyberInsurance(): Promise<void> {
    await this.page.goto(`${CSI_BASE_URL}${CSI_CYBER_INSURANCE_PATH}`);
    await this.page.waitForLoadState('domcontentloaded');
    await this.safeSleep(5_000);
  }

  /** CI-009: `/CyberInsurance` must show the no-access message (no 5s Apply/Edit wait). */
  async openCyberInsuranceAndExpectPermissionDenied(): Promise<void> {
    await this.page.goto(`${CSI_BASE_URL}${CSI_CYBER_INSURANCE_PATH}`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.permissionDeniedMessage).toBeVisible({ timeout: 60_000 });
  }

  private businessDescriptionField(main: Locator): Locator {
    return main.locator('#TextArea_businessDescription');
  }

  private addressField(main: Locator): Locator {
    return main.locator('#Input_addess');
  }

  async openApplicationForm(): Promise<void> {
    const main = this.insuranceMain();
    const descriptionField = this.businessDescriptionField(main);

    if (await descriptionField.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return;
    }

    const applyVisible = await this.applyNowButton.isVisible({ timeout: 5_000 }).catch(() => false);
    if (applyVisible) {
      await this.applyNowButton.click();
    } else {
      await expect(this.editFormButton).toBeVisible({ timeout: 60_000 });
      await this.editFormButton.click();
    }
    await expect(descriptionField).toBeVisible({ timeout: 60_000 });
  }

  private async selectYesForAllRadioGroupsIn(container: Locator): Promise<void> {
    const groups = container.getByRole('radiogroup');
    const count = await groups.count();
    for (let i = 0; i < count; i++) {
      await groups.nth(i).getByRole('radio', { name: 'Yes', exact: true }).check();
    }
  }

  async fillBasicInformationAndContinue(params: {
    businessDescription: string;
    address: string;
  }): Promise<void> {
    const main = this.insuranceMain();
    const descriptionField = this.businessDescriptionField(main);
    const addressField = this.addressField(main);

    await expect(descriptionField).toBeVisible({ timeout: 60_000 });
    await descriptionField.fill(params.businessDescription);
    await addressField.fill(params.address);

    const eligibility = main.filter({ hasText: 'Eligibility Confirmation' });
    await this.selectYesForAllRadioGroupsIn(eligibility);

    await main.getByRole('button', { name: 'Next' }).click();
    await expect(main.getByText('Are you planning to install')).toBeVisible({ timeout: 60_000 });
  }

  async fillQuestionnaireAndSubmit(): Promise<void> {
    const main = this.insuranceMain();
    const questionnaire = main.filter({ hasText: 'Are you planning to install' });
    await this.selectYesForAllRadioGroupsIn(questionnaire);
    await main.getByRole('button', { name: 'Submit' }).click();
    await expect(this.page.getByText('Your Proposal Form Has Been Submitted')).toBeVisible({
      timeout: 120_000,
    });
  }

  async submitInsuranceApplication(params: {
    businessDescription: string;
    address: string;
  }): Promise<void> {
    await this.openApplicationForm();
    await this.fillBasicInformationAndContinue(params);
    await this.fillQuestionnaireAndSubmit();
  }
}
