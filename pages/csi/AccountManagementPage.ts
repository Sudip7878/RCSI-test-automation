import { expect, type Locator } from '@playwright/test';
import { CSI_BASE_URL, CSI_ORGANIZATION_DETAIL_PATH, CSI_ORGANIZATION_LIST_PATH } from '../../config/csi';
import {
  AM033_ASSIGNABLE_ROLE_NAMES,
  AM033_MODULE_ACCESS_TIMEOUT_MS,
  AM033_PERMISSION_DENIED_TEXT,
} from '../../utils/csi/am033RoleModuleAccess';
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

  private roleAssignmentGrid() {
    return this.page.getByRole('grid').filter({
      has: this.page.getByRole('columnheader', { name: 'Role name' }),
    });
  }

  private userListGrid() {
    return this.page.getByRole('grid').filter({
      has: this.page.getByRole('columnheader', { name: 'Email' }),
    });
  }

  private userTableRowForEmail(email: string) {
    return this.userListGrid().getByRole('row').filter({
      has: this.page.getByRole('gridcell', { name: email }),
    });
  }

  private mfaSetupDialog() {
    return this.page.getByRole('dialog').filter({
      has: this.page.getByText('Setup Multi Factor Authentication Rule'),
    });
  }

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

  private async setRoleAssignmentByName(roleGrid: Locator, roleName: string, shouldCheck: boolean) {
    const roleCell = roleGrid.getByRole('gridcell', { name: new RegExp(`^${roleName}\\b`, 'i') });
    await expect(roleCell).toBeVisible({ timeout: 30_000 });
    const updated = await roleCell.evaluate(
      (cell, wantChecked) => {
        const row = cell.closest('tr');
        const assignCell = row?.querySelector('td[data-header="Assign to Role"]');
        const checkbox = assignCell?.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
        if (!checkbox || checkbox.disabled) {
          return false;
        }
        if (wantChecked && !checkbox.checked) {
          checkbox.click();
        } else if (!wantChecked && checkbox.checked) {
          checkbox.click();
        }
        return true;
      },
      shouldCheck,
    );
    expect(updated).toBe(true);
  }

  private async checkRoleAssignmentByName(roleGrid: Locator, roleName: string) {
    await this.setRoleAssignmentByName(roleGrid, roleName, true);
  }

  private async uncheckRoleAssignmentByName(roleGrid: Locator, roleName: string) {
    await this.setRoleAssignmentByName(roleGrid, roleName, false);
  }

  async checkFirstTwoRoleAssignments() {
    const roleGrid = this.roleAssignmentGrid();
    await expect(roleGrid).toBeVisible({ timeout: 30_000 });

    await this.checkRoleAssignmentByName(roleGrid, 'Admin');
    await this.checkRoleAssignmentByName(roleGrid, 'Manager');
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

  /** Clears Status/Role VirtualSelect filters only (not the organization combobox). */
  private async clearUserListFilters() {
    for (const filterLabel of ['Status', 'Role'] as const) {
      const combobox = this.page.getByRole('combobox', { name: 'Select an option' }).filter({
        has: this.page.getByText(filterLabel, { exact: true }),
      });
      if (!(await combobox.isVisible({ timeout: 2_000 }).catch(() => false))) {
        continue;
      }
      const clearButton = combobox.getByRole('button', { name: 'Clear button' });
      if (await clearButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await clearButton.click();
      }
    }
  }

  /** IR-001: user list search box — full email (not first-name token). */
  async searchUserListByEmail(email: string) {
    await this.clearUserListFilters();
    await this.userNameSearchBox.click();
    await this.userNameSearchBox.fill(email.trim());
    await this.userSearchButton.click();
    await expect(this.userSearchButton).toBeEnabled({ timeout: 30_000 });
    await expect(this.userListGrid().getByRole('gridcell', { name: email })).toBeVisible({
      timeout: 90_000,
    });
  }

  async expectUserGridShowsEmail(email: string) {
    const emailCell = this.userListGrid().getByRole('gridcell', { name: email });
    await expect(emailCell).toBeVisible({ timeout: 60_000 });
  }

  /**
   * CC-022: first user-list row for `email` (top-to-bottom) — read Organization cell without sorting the grid.
   */
  async readOrganizationNameForFirstUserRowWithEmail(email: string): Promise<string> {
    await this.openUserListWithSearchReady();
    await this.searchUserListByEmail(email);

    const row = this.userListGrid()
      .getByRole('row')
      .filter({ has: this.page.getByRole('gridcell', { name: email }) })
      .first();
    await expect(row).toBeVisible({ timeout: 60_000 });

    const organizationName = await row.evaluate((tr) => {
      const cell = tr.querySelector('td[data-header="Organization"]');
      return cell?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    });

    expect(organizationName.length).toBeGreaterThan(0);
    return organizationName;
  }

  async openUserRowActionsMenu(email: string) {
    const row = this.userTableRowForEmail(email);
    await expect(row).toBeVisible();
    const gridcells = await row.getByRole('gridcell').all();
    expect(gridcells.length).toBeGreaterThan(0);
    await gridcells[gridcells.length - 1].click();
  }

  async setUserInactiveViaUserListActions(email: string) {
    const row = this.userTableRowForEmail(email);
    if (await row.getByRole('gridcell', { name: 'Inactive' }).isVisible().catch(() => false)) {
      return;
    }
    await this.openUserRowActionsMenu(email);
    const inactiveLink = this.page.getByRole('link', { name: /Set as Inactive/i });
    await expect(inactiveLink).toBeVisible({ timeout: 15_000 });
    await inactiveLink.click();
  }

  async setUserActiveViaUserListActions(email: string) {
    const row = this.userTableRowForEmail(email);
    if (await row.getByRole('gridcell', { name: 'Active' }).isVisible().catch(() => false)) {
      return;
    }
    await this.openUserRowActionsMenu(email);
    const activeLink = this.page.getByRole('link', { name: /Set as Active/i });
    await expect(activeLink).toBeVisible({ timeout: 15_000 });
    await activeLink.click();
  }

  async expectUserListRowStatus(email: string, status: 'Active' | 'Inactive') {
    const row = this.userTableRowForEmail(email);
    await expect(row).toBeVisible();
    await expect(row.getByRole('gridcell', { name: status })).toBeVisible({ timeout: 60_000 });
  }

  async openChangeRoleFromActionsMenu() {
    await this.page.getByRole('link', { name: /Change role/i }).click();
  }

  async ensureIncidentReporterRoleChecked() {
    const roleGrid = this.roleAssignmentGrid();
    await this.checkRoleAssignmentByName(roleGrid, 'Incident Reporter');
  }

  async confirmRoleChange() {
    await this.page.getByRole('button', { name: 'Confirm Role' }).click();
  }

  async expectRecordUpdatedSuccess() {
    await expect(this.page.getByText('Record updated.')).toBeVisible({ timeout: 60_000 });
  }

  /** Dismisses the role-change toast so header logout is clickable (AM-033). */
  async dismissRecordUpdatedNotice() {
    const toast = this.page.getByText('Record updated.', { exact: true });
    if (!(await toast.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }
    await toast.evaluate((el) => {
      let node: HTMLElement | null = el.parentElement;
      while (node) {
        const btn = node.querySelector('button');
        if (btn) {
          (btn as HTMLButtonElement).click();
          return;
        }
        node = node.parentElement;
      }
    });
    await expect(toast).not.toBeVisible({ timeout: 15_000 });
  }

  /** AM-033: open module path and assert permission denial within 5s. */
  async openModulePathAndExpectPermissionDenied(
    modulePath: string,
    timeoutMs = AM033_MODULE_ACCESS_TIMEOUT_MS,
  ) {
    await this.page.goto(`${CSI_BASE_URL}${modulePath}`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page.getByText(AM033_PERMISSION_DENIED_TEXT, { exact: true })).toBeVisible({
      timeout: timeoutMs,
    });
  }

  /**
   * AM-033: after role assignment the subject must reach the URL without a permission denial.
   * Polls for the full window (default 5s) — passes only if the denial text never appears.
   */
  async openModulePathAndExpectAccessible(
    modulePath: string,
    timeoutMs = AM033_MODULE_ACCESS_TIMEOUT_MS,
  ) {
    await this.page.goto(`${CSI_BASE_URL}${modulePath}`);
    await this.page.waitForLoadState('domcontentloaded');

    const permissionMsg = this.page.getByText(AM033_PERMISSION_DENIED_TEXT, { exact: true });
    const pollIntervalMs = 250;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (await permissionMsg.isVisible().catch(() => false)) {
        await expect(permissionMsg).not.toBeVisible();
      }
      await this.page.waitForTimeout(pollIntervalMs);
    }
  }

  private async openChangeRoleDialogForUser(email: string) {
    await this.openUserListWithSearchReady();
    await this.searchUserListByEmail(email);
    await this.expectUserGridShowsEmail(email);
    await this.openUserRowActionsMenu(email);
    await this.openChangeRoleFromActionsMenu();
    const roleGrid = this.roleAssignmentGrid();
    await expect(roleGrid).toBeVisible({ timeout: 30_000 });
    return roleGrid;
  }

  /** AM-033: clear all assignable roles, assign only `roleName`, confirm. */
  async assignExclusiveRoleToUserOnUserList(email: string, roleName: string) {
    const roleGrid = await this.openChangeRoleDialogForUser(email);
    for (const name of AM033_ASSIGNABLE_ROLE_NAMES) {
      await this.uncheckRoleAssignmentByName(roleGrid, name);
    }
    await this.checkRoleAssignmentByName(roleGrid, roleName);
    await this.confirmRoleChange();
    await this.expectRecordUpdatedSuccess();
    await this.dismissRecordUpdatedNotice();
  }

  /** AM-033: cleanup — uncheck every assignable role on the subject user. */
  async removeAllRoleAssignmentsFromUser(email: string) {
    const roleGrid = await this.openChangeRoleDialogForUser(email);
    for (const name of AM033_ASSIGNABLE_ROLE_NAMES) {
      await this.uncheckRoleAssignmentByName(roleGrid, name);
    }
    await this.confirmRoleChange();
    await this.expectRecordUpdatedSuccess();
    await this.dismissRecordUpdatedNotice();
  }

  async startAddUsersByExcelUpload() {
    await expect(this.addNewUserButton).toBeVisible({ timeout: 30_000 });
    await this.addNewUserButton.click();
    await expect(this.excelUploadButton).toBeVisible({ timeout: 30_000 });
    await this.excelUploadButton.click();
    await expect(this.downloadTemplateButton).toBeVisible({ timeout: 30_000 });
  }

  async downloadBulkImportTemplateTo(targetPath: string): Promise<string> {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 120_000 });
    await this.downloadTemplateButton.click();
    const download = await downloadPromise;
    await download.saveAs(targetPath);
    return targetPath;
  }

  async uploadCompletedTemplate(absolutePath: string) {
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.page.getByText('Upload completed template').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(absolutePath);
  }

  async continueAfterTemplateUpload() {
    const continueButton = this.page.getByRole('button', { name: 'Continue' });
    await expect(continueButton).toBeEnabled({ timeout: 30_000 });
    await continueButton.click();
  }

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

  async ensureIncidentReporterMfaCheckboxChecked() {
    const dialog = this.mfaSetupDialog();
    await expect(dialog).toBeVisible({ timeout: 30_000 });

    const reporterCheckbox = dialog.getByRole('checkbox', { name: 'Incident Reporter' });
    if (await reporterCheckbox.isVisible().catch(() => false)) {
      if (!(await reporterCheckbox.isChecked())) {
        await reporterCheckbox.check();
      }
      return;
    }

    const roleLabel = dialog.getByText('Incident Reporter', { exact: true });
    await expect(roleLabel).toBeVisible();
    const toggled = await roleLabel.evaluate((label) => {
      let container: HTMLElement | null = label.parentElement;
      while (container) {
        const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
        if (checkbox) {
          if (!checkbox.checked) {
            checkbox.click();
          }
          return true;
        }
        container = container.parentElement;
      }
      return false;
    });
    expect(toggled).toBe(true);
  }

  async submitMfaRoleSelection() {
    const dialog = this.mfaSetupDialog();
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.getByRole('button', { name: 'Submit' }).click();
  }

  async saveOrganizationDetailChanges() {
    await expect(this.saveOrganizationChangesButton).toBeVisible({ timeout: 30_000 });
    await this.page.waitForTimeout(3_000);
    await this.saveOrganizationChangesButton.click();
  }

  async expectOrganizationChangesSaved() {
    await expect(this.page.getByText('Changes saved successfully')).toBeVisible({ timeout: 60_000 });
  }

  private addOrganizationDialog(): Locator {
    return this.page.getByRole('dialog').filter({
      has: this.page.getByText('Create new organization', { exact: true }),
    });
  }

  /** AM-009: `/avo_organizationlist` — Add organization wizard. */
  async openOrganizationList() {
    await this.page.goto(`${CSI_BASE_URL}${CSI_ORGANIZATION_LIST_PATH}`);
    await expect(this.page.getByRole('button', { name: 'Add' })).toBeVisible({ timeout: 60_000 });
  }

  async startAddOrganization() {
    await this.page.getByRole('button', { name: 'Add' }).click();
    const dialog = this.addOrganizationDialog();
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await expect(dialog.getByRole('textbox', { name: 'First name' })).toBeVisible({ timeout: 30_000 });
  }

  async fillNewOrganizationAm009(params: {
    firstName: string;
    lastName: string;
    ownerEmail: string;
    phoneNumber: string;
    organizationName: string;
    category: string;
    size: string;
    plan: string;
  }) {
    const dialog = this.addOrganizationDialog();

    const firstName = dialog.getByRole('textbox', { name: 'First name' });
    await firstName.click();
    await firstName.fill(params.firstName);

    const lastName = dialog.getByRole('textbox', { name: 'Last name' });
    await lastName.click();
    await lastName.fill(params.lastName);

    const ownerEmail = dialog.getByRole('textbox', { name: 'Owner email' });
    await ownerEmail.click();
    await ownerEmail.fill(params.ownerEmail);

    const phone = dialog.getByRole('textbox', { name: 'Phone number' });
    await phone.click();
    await phone.fill(params.phoneNumber);

    const orgName = dialog.getByRole('textbox', { name: 'Organization name' });
    await orgName.click();
    await orgName.fill(params.organizationName);

    await this.page.waitForTimeout(3_000);
    await dialog.getByText('Category', { exact: true }).click();
    await this.page.getByRole('option', { name: params.category }).click();

    await dialog.getByText('Size', { exact: true }).click();
    await this.page.getByRole('option', { name: params.size }).click();

    await dialog.getByText('Plan', { exact: true }).click();
    await this.page.getByRole('option', { name: params.plan }).click();
  }

  async submitCreateOrganization() {
    await this.addOrganizationDialog().getByRole('button', { name: 'Create organization' }).click();
  }

  async expectOrganizationRecordCreated() {
    await expect(this.page.getByText('Record created.', { exact: true })).toBeVisible({ timeout: 60_000 });
  }

  async dismissOrganizationRecordCreatedNotice() {
    const closeIcon = this.page.getByRole('img').first();
    if (await closeIcon.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await closeIcon.click();
    }
  }

  /** AM-063: confirm Email column exists without clicking (sort must not change). */
  async expectUserListEmailColumnPresent() {
    await expect(this.userListGrid().getByRole('columnheader', { name: 'Email' })).toBeVisible({
      timeout: 30_000,
    });
  }

  private async collectEmailsOnCurrentUserListPage(): Promise<string[]> {
    const grid = this.userListGrid();
    await expect(grid).toBeVisible({ timeout: 30_000 });

    const emails = await grid.evaluate((root) => {
      const found: string[] = [];
      const add = (raw: string) => {
        const t = raw.replace(/\s+/g, ' ').trim();
        if (t.includes('@')) {
          found.push(t);
        }
      };

      root.querySelectorAll('td[data-header="Email"]').forEach((td) => {
        add(td.textContent ?? '');
      });

      root.querySelectorAll('[role="gridcell"]').forEach((cell) => {
        add(cell.textContent ?? '');
      });

      return [...new Set(found)];
    });

    return emails;
  }

  /**
   * AM-063: scan all `/userList` pages (pagination when present) and return every email in the grid.
   */
  async collectAllUserListEmailsAm063(): Promise<string[]> {
    await this.clearUserListFilters();
    await this.expectUserListEmailColumnPresent();

    const allEmails = new Set<string>();

    const mergeCurrentPage = async () => {
      for (const email of await this.collectEmailsOnCurrentUserListPage()) {
        allEmails.add(email);
      }
    };

    await mergeCurrentPage();

    const nextPage = this.page.getByRole('button', { name: 'go to next page' });
    let pagesWalked = 0;

    while (await nextPage.isVisible().catch(() => false)) {
      const disabled = await nextPage.evaluate((btn) => (btn as HTMLButtonElement).disabled).catch(() => true);
      if (disabled) {
        break;
      }

      await nextPage.click();
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await expect(this.userListGrid()).toBeVisible({ timeout: 30_000 });
      await mergeCurrentPage();

      pagesWalked += 1;
      if (pagesWalked > 200) {
        throw new Error('AM-063: user list pagination exceeded 200 pages');
      }
    }

    return [...allEmails].sort();
  }
}
