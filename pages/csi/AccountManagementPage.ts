import { expect } from '@playwright/test';
import { CSI_BASE_URL } from '../../config/csi';
import { csiUserListSearchTokenFromEmail } from '../../utils/csi/userListSearch';
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

  /** IR-001: fill search from {@link csiUserListSearchTokenFromEmail} and run Search. */
  async searchUserListForReporterEmail(reporterEmail: string) {
    const token = csiUserListSearchTokenFromEmail(reporterEmail);
    await this.userNameSearchBox.click();
    await this.userNameSearchBox.fill(token);
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
}
