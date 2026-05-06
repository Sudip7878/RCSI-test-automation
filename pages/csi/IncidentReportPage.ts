import { expect } from '@playwright/test';
import { CSI_BASE_URL, CSI_INCIDENT_REPORT_DASHBOARD_PATH } from '../../config/csi';
import { BasePage } from '../BasePage';

export class CsiIncidentReportPage extends BasePage {
  readonly addNewIncidentButton = this.page.getByRole('button', { name: 'Add New Incident' });
  readonly gradingOfVictimSelect = this.page.getByLabel('Grading Of Victim');
  readonly numberOfImpactedPeopleSelect = this.page.getByLabel('Number Of Impacted People');
  readonly interruptionSelect = this.page.getByLabel('Interruption of Critical Business Operation');
  readonly incidentTypeSelect = this.page.getByLabel('Incident Type');
  readonly dataLeakageSelect = this.page.getByLabel('Data Leakage');
  readonly descriptionInput = this.page.getByRole('textbox', { name: 'Description*' });
  readonly affectedSystemsInput = this.page.getByRole('textbox', { name: 'Affected Systems*' });
  readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  readonly successMessage = this.page.getByText('Incident Reported Successfully');

  async openDashboard() {
    await this.page.goto(`${CSI_BASE_URL}${CSI_INCIDENT_REPORT_DASHBOARD_PATH}`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.addNewIncidentButton).toBeVisible({ timeout: 60_000 });
  }

  async startNewIncidentForm() {
    await expect(this.addNewIncidentButton).toBeVisible();
    await this.addNewIncidentButton.click();
    await expect(this.gradingOfVictimSelect).toBeVisible({ timeout: 60_000 });
  }

  /** Native `<select>` rows: match option text, not positional index (IR-005). */
  async fillMandatoryDropdowns() {
    await this.gradingOfVictimSelect.selectOption({ label: 'General Staff' });
    await this.numberOfImpactedPeopleSelect.selectOption({ label: 'Single Department' });
    await this.interruptionSelect.selectOption({ label: 'Non-production' });
    await this.incidentTypeSelect.selectOption({ label: 'Data Leaked' });
    await this.dataLeakageSelect.selectOption({ label: 'General / No Leakage' });
  }

  async fillDescriptionAndAffectedSystems(description: string, affectedSystems: string) {
    await this.descriptionInput.click();
    await this.descriptionInput.fill(description);
    await this.affectedSystemsInput.click();
    await this.affectedSystemsInput.fill(affectedSystems);
    await this.affectedSystemsInput.blur();
  }

  /** IR-005: up to 3 Save clicks if success text does not appear (15s wait each attempt). */
  async saveUntilSuccessVisible() {
    await expect(this.saveButton).toBeVisible({ timeout: 15_000 });

    const successAppeared = () =>
      this.successMessage
        .waitFor({ state: 'visible', timeout: 15_000 })
        .then(() => true)
        .catch(() => false);

    await this.saveButton.click();
    if (await successAppeared()) {
      return;
    }

    await this.saveButton.click();
    if (await successAppeared()) {
      return;
    }

    await this.saveButton.click();
    await expect(this.successMessage).toBeVisible({ timeout: 15_000 });
  }
}
