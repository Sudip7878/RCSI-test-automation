import { expect } from '@playwright/test';
import { CSI_BASE_URL, CSI_ORGANIZATION_DETAIL_PATH } from '../../config/csi';
import { BasePage } from '../BasePage';

export class CsiAccountManagementPage extends BasePage {
  readonly addNewUserButton = this.page.getByRole('button', { name: /Add New User/i });
  readonly manuallyEnterEachUserButton = this.page.getByRole('button', {
    name: /Manually enter each User/i,
  });
  readonly firstNameInput = this.page.getByRole('textbox', { name: 'First Name*' });
  readonly lastNameInput = this.page.getByRole('textbox', { name: 'Last Name*' });
  readonly emailInput = this.page.getByRole('textbox', { name: 'Email*' });
  readonly createNewUserButton = this.page.getByRole('button', { name: 'Create New User' });
  readonly userNameSearchBox = this.page.getByRole('searchbox', { name: 'Enter user name' });
  readonly userSearchButton = this.page.getByRole('button', { name: 'Search' });
  readonly excelUploadButton = this.page.getByRole('button', { name: /Excel Upload/i });
  readonly downloadTemplateButton = this.page.getByRole('button', { name: 'Download Template' });
  readonly editOrganizationDetailsButton = this.page.getByRole('button', { name: 'Edit Details' });
  readonly changeMfaRuleButton = this.page.getByRole('button', { name: 'Change MFA Rule' });
  readonly saveOrganizationChangesButton = this.page.getByRole('button', { name: 'Save Changes' });

  async openUserList() {
    await this.page.goto(`${CSI_BASE_URL}/userList`);
    await expect(this.addNewUserButton).toBeVisible({ timeout: 30_000 });
  }

  async startAddUserManually() {
    await expect(this.addNewUserButton).toBeVisible();
    await this.addNewUserButton.click();
    await expect(this.manuallyEnterEachUserButton).toBeVisible({ timeout: 30_000 });
    await this.manuallyEnterEachUserButton.click();
    await expect(this.firstNameInput).toBeVisible({ timeout: 30_000 });
  }

  async fillNewUserIdentity(params: { firstName: string; lastName: string; emailLocalPart: string }) {
    await expect(this.firstNameInput).toBeVisible();
    await this.firstNameInput.click();
    await this.firstNameInput.fill(params.firstName);

    await this.lastNameInput.click();
    await this.lastNameInput.fill(params.lastName);

    await this.emailInput.click();
    await this.emailInput.fill(params.emailLocalPart);
  }

  /** Role table: `td[data-header="Assign to Role"]` checkboxes; first two rows only. */
  async checkFirstTwoRoleAssignments() {
    const roleGrid = this.page.locator('table[role="grid"]').filter({
      has: this.page.locator('thead th', { hasText: 'Role name' }),
    });
    await expect(roleGrid).toBeVisible({ timeout: 30_000 });

    const rows = roleGrid.locator('tbody tr.table-row');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < 2; i += 1) {
      const checkbox = rows
        .nth(i)
        .locator('td[data-header="Assign to Role"] input[type="checkbox"]');
      await expect(checkbox).toBeVisible();
      await checkbox.check();
    }
  }

  async submitCreateNewUser() {
    await expect(this.createNewUserButton).toBeVisible();
    await this.createNewUserButton.click();
  }

  async expectUserCreatedSuccess() {
    await expect(this.page.getByText('You have successfully added')).toBeVisible({ timeout: 60_000 });
  }

  /** IR-001: `/userList` with search box ready (recorded flow). */
  async openUserListWithSearchReady() {
    await this.page.goto(`${CSI_BASE_URL}/userList`);
    await expect(this.userNameSearchBox).toBeVisible({ timeout: 30_000 });
  }

  /** IR-001: user list search box — full email (not first-name token). */
  async searchUserListByEmail(email: string) {
    await this.userNameSearchBox.click();
    await this.userNameSearchBox.fill(email.trim());
    await this.userSearchButton.click();
  }

  async expectUserGridShowsEmail(email: string) {
    await expect(this.page.getByRole('gridcell', { name: email })).toBeVisible({ timeout: 60_000 });
  }

  userTableRowForEmail(email: string) {
    return this.page.locator('tr.table-row').filter({
      has: this.page.getByRole('gridcell', { name: email }),
    });
  }

  /** Actions column ellipsis for the row that matches `email` in the user grid. */
  async openUserRowActionsMenu(email: string) {
    const row = this.userTableRowForEmail(email);
    await expect(row).toBeVisible();
    await row.locator('i.fa-ellipsis-v').click();
  }

  async openChangeRoleFromActionsMenu() {
    await this.page.getByRole('link', { name: /Change role/i }).click();
  }

  /**
   * IR-001: in the role grid, ensure the Incident Reporter row’s assignment checkbox is checked
   * (idempotent if already checked).
   */
  async ensureIncidentReporterRoleChecked() {
    const roleRow = this.page.locator('tr.table-row').filter({
      has: this.page.getByRole('gridcell', { name: 'Incident Reporter' }),
    });
    await expect(roleRow).toBeVisible({ timeout: 30_000 });
    const checkbox = roleRow.locator('input[type="checkbox"]').first();
    await expect(checkbox).toBeVisible();
    if (!(await checkbox.isChecked())) {
      await checkbox.check();
    }
  }

  async confirmRoleChange() {
    await this.page.getByRole('button', { name: 'Confirm Role' }).click();
  }

  async expectRecordUpdatedSuccess() {
    await expect(this.page.getByText('Record updated.')).toBeVisible({ timeout: 60_000 });
  }

  /** AM-027: open "+ Add New User" then enter "Excel Upload" modal flow. */
  async startAddUsersByExcelUpload() {
    await expect(this.addNewUserButton).toBeVisible({ timeout: 30_000 });
    await this.addNewUserButton.click();
    await expect(this.excelUploadButton).toBeVisible({ timeout: 30_000 });
    await this.excelUploadButton.click();
    await expect(this.downloadTemplateButton).toBeVisible({ timeout: 30_000 });
  }

  /** AM-027: download XLSX template and persist to caller-provided absolute path. */
  async downloadBulkImportTemplateTo(targetPath: string): Promise<string> {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 120_000 });
    await this.downloadTemplateButton.click();
    const download = await downloadPromise;
    await download.saveAs(targetPath);
    return targetPath;
  }

  async uploadCompletedTemplate(absolutePath: string) {
    await this.page.getByText('Upload completed template').click();
    const input = this.page.locator('input[type="file"]').last();
    await expect(input).toBeAttached({ timeout: 15_000 });
    await input.setInputFiles(absolutePath);
  }

  async continueAfterTemplateUpload() {
    const continueButton = this.page.getByRole('button', { name: 'Continue' });
    await expect(continueButton).toBeEnabled({ timeout: 30_000 });
    await continueButton.click();
  }

  /** AM-027: only require at least one visible `OK` status in the validation step. */
  async collectValidatedBulkUploadEmails(
    rows: ReadonlyArray<{ firstName: string; lastName: string; email: string }>,
  ): Promise<string[]> {
    await expect(this.page.getByText('OK').first()).toBeVisible({ timeout: 30_000 });
    return rows.map((row) => row.email);
  }

  async importBulkUsers() {
    await this.page.getByRole('button', { name: 'Import Users' }).click();
  }

  async expectBulkImportQueuedMessage() {
    await expect(
      this.page.getByText(
        'New users are being added to the platform. This may take a few moments — please refresh the page shortly to view the updated results.',
      ),
    ).toBeVisible({ timeout: 60_000 });
  }

  async waitAndOpenUserListAfterBulkImport(waitMs = 3_000) {
    await this.page.waitForTimeout(waitMs);
    await this.openUserListWithSearchReady();
  }

  /**
   * AM-027: wait for imported users in the grid; if any are still missing, reload twice (async import),
   * then require at least one expected email to be visible.
   */
  async expectUserGridShowsEmails(emails: ReadonlyArray<string>) {
    expect(emails.length).toBeGreaterThan(0);

    const allGridEmailsVisible = async (): Promise<boolean> => {
      for (const email of emails) {
        const cell = this.page.getByRole('gridcell', { name: email });
        if (!(await cell.isVisible().catch(() => false))) {
          return false;
        }
      }
      return true;
    };

    const waitUntilAllVisible = async (overallMs: number): Promise<boolean> => {
      const deadline = Date.now() + overallMs;
      while (Date.now() < deadline) {
        if (await allGridEmailsVisible()) {
          return true;
        }
        await this.page.waitForTimeout(500);
      }
      return false;
    };

    const assertAllVisibleStrict = async () => {
      for (const email of emails) {
        await expect(this.page.getByRole('gridcell', { name: email })).toBeVisible();
      }
    };

    if (await waitUntilAllVisible(60_000)) {
      await assertAllVisibleStrict();
      return;
    }

    for (let i = 0; i < 2; i += 1) {
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await expect(this.userNameSearchBox).toBeVisible({ timeout: 30_000 });
      if (await waitUntilAllVisible(60_000)) {
        await assertAllVisibleStrict();
        return;
      }
    }

    let anyVisible = false;
    for (const email of emails) {
      if (await this.page.getByRole('gridcell', { name: email }).isVisible().catch(() => false)) {
        anyVisible = true;
        break;
      }
    }
    expect(
      anyVisible,
      `After 2 reloads, at least one imported email should appear; checked: ${emails.join(', ')}`,
    ).toBe(true);
  }

  /** AM-045: organization MFA settings screen. */
  async openOrganizationDetail() {
    await this.page.goto(`${CSI_BASE_URL}${CSI_ORGANIZATION_DETAIL_PATH}`);
    await expect(this.editOrganizationDetailsButton).toBeVisible({ timeout: 60_000 });
    await this.page.waitForTimeout(3_000);
  }

  async startEditOrganizationDetails() {
    await expect(this.editOrganizationDetailsButton).toBeVisible();
    await this.editOrganizationDetailsButton.click();
    await expect(this.changeMfaRuleButton).toBeVisible({ timeout: 30_000 });
    await this.page.waitForTimeout(3_000);
  }

  async openChangeMfaRule() {
    await expect(this.changeMfaRuleButton).toBeVisible();
    await this.changeMfaRuleButton.click();
  }

  async selectMfaRuleRequiredForSomeRoles() {
    const radio = this.page.getByRole('radio', { name: /Required for some Roles/i });
    await expect(radio).toBeAttached({ timeout: 30_000 });
    await expect(radio).toBeVisible({ timeout: 30_000 });
    await radio.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(3_000);
    await radio.click({ timeout: 15_000 });
    await expect(radio).toBeChecked({ timeout: 10_000 });
  }

  async selectMfaRuleNotMandatory() {
    const radio = this.page.getByRole('radio', { name: /Not Mandatory/i });
    await expect(radio).toBeVisible({ timeout: 30_000 });
    await radio.scrollIntoViewIfNeeded();
    await radio.click({ timeout: 15_000 });
    await expect(radio).toBeChecked({ timeout: 10_000 });
  }

  /**
   * AM-045: MFA role list row — checkbox adjacent to role label (avoid hardcoded OutSystems checkbox ids).
   */
  async ensureIncidentReporterMfaCheckboxChecked() {
    const row = this.page.locator('div.vertical-align.flex-direction-row').filter({
      has: this.page.getByText('Incident Reporter', { exact: true }),
    });
    await expect(row.first()).toBeVisible({ timeout: 30_000 });
    const checkbox = row.locator('input[type="checkbox"]').first();
    await expect(checkbox).toBeVisible();
    if (!(await checkbox.isChecked())) {
      await checkbox.check();
    }
  }

  async submitMfaRoleSelection() {
    const submit = this.page.getByRole('button', { name: 'Submit' }).first();
    await expect(submit).toBeVisible({ timeout: 15_000 });
    await submit.click();
  }

  async saveOrganizationDetailChanges() {
    await expect(this.saveOrganizationChangesButton).toBeVisible({ timeout: 30_000 });
    await this.page.waitForTimeout(3_000);
    await this.saveOrganizationChangesButton.click();
  }

  async expectOrganizationChangesSaved() {
    await expect(this.page.getByText('Changes saved successfully')).toBeVisible({ timeout: 60_000 });
  }
}
