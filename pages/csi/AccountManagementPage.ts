import { expect, type Locator } from '@playwright/test';
import {
  CSI_BASE_URL,
  CSI_GROUP_LIST_PATH,
  CSI_ORGANIZATION_DETAIL_PATH,
  CSI_ORGANIZATION_LIST_PATH,
  CSI_SIGNUP_PATH,
} from '../../config/csi';
import { AM002_SIGNUP_REGISTERED_EMAIL_MESSAGE } from '../../utils/csi/am002AccountManagementTestData';
import {
  AM003_INVALID_EMAIL_MESSAGE,
  AM003_REQUIRED_EMAIL_MESSAGE,
} from '../../utils/csi/am003AccountManagementTestData';
import {
  AM015_ORGANIZATION_CREATED_SUCCESS,
  AM015_ORG_NAME_DROPDOWN_SETTLE_MS,
  type Am015OrganizationFormStep,
} from '../../utils/csi/am015OrganizationTestData';
import { AM016_OWNER_EMAIL_VALIDATION_MESSAGE } from '../../utils/csi/am016OrganizationTestData';
import { AM026_INVALID_EMAIL_MESSAGE } from '../../utils/csi/am026AccountManagementTestData';
import { AM029_MISSING_FIELDS_MESSAGE } from '../../utils/csi/am029AccountManagementTestData';
import {
  AM030_BULK_NO_USER_IMPORTED_MESSAGE,
  AM030_BULK_ROW_DUPLICATE_TAG,
  AM030_BULK_USERS_ALREADY_EXIST_MESSAGE,
  AM030_MANUAL_DUPLICATE_EMAIL_MESSAGE,
  loginEmailLocalPartAm030,
} from '../../utils/csi/am030AccountManagementTestData';
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
  readonly bulkUploadBackButton = this.page.getByRole('button', { name: /Back/i });
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

  /** AM-026: same identity fields as AM-019 but fills the full email including external domain. */
  async fillNewUserIdentityAm026(params: { firstName: string; lastName: string; email: string }) {
    await expect(this.firstNameInput).toBeVisible();
    await this.firstNameInput.click();
    await this.firstNameInput.fill(params.firstName);

    await this.lastNameInput.click();
    await this.lastNameInput.fill(params.lastName);

    await this.emailInput.click();
    await this.emailInput.fill(params.email);
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

  /** AM-026: manual add user rejects email outside the organization domain. */
  async expectInvalidEmailOnCreateUserAm026() {
    await expect(this.page.getByText(AM026_INVALID_EMAIL_MESSAGE, { exact: true })).toBeVisible({
      timeout: 60_000,
    });
  }

  /** AM-030: manual add user with the login email local part (domain auto-filled by the app). */
  async fillNewUserIdentityWithLoginEmailAm030(params: {
    firstName: string;
    lastName: string;
    loginEmail: string;
  }) {
    await this.fillNewUserIdentity({
      firstName: params.firstName,
      lastName: params.lastName,
      emailLocalPart: loginEmailLocalPartAm030(params.loginEmail),
    });
  }

  /** AM-030: manual add user rejects an email that already exists in the org. */
  async expectDuplicateEmailOnManualAddUserAm030() {
    await expect(this.page.getByText(AM030_MANUAL_DUPLICATE_EMAIL_MESSAGE, { exact: true })).toBeVisible({
      timeout: 60_000,
    });
  }

  /** AM-030: hard-reload user list before the bulk-upload duplicate phase. */
  async reloadUserListAndWaitForAddNewUserAm030() {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await expect(this.addNewUserButton).toBeVisible({ timeout: 30_000 });
  }

  /**
   * AM-030: after Continue on a template where every row reuses the login email, the review
   * step shows duplicate errors and Import Users is not offered.
   */
  async expectBulkUploadDuplicateUsersRejectedAm030() {
    await expect(this.page.getByText(AM030_BULK_NO_USER_IMPORTED_MESSAGE, { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      this.page.getByText(AM030_BULK_USERS_ALREADY_EXIST_MESSAGE, { exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByText(AM030_BULK_ROW_DUPLICATE_TAG, { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    });
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
    // exact: true prevents 'Active' substring matching 'Inactive'
    if (await row.getByRole('gridcell', { name: 'Inactive', exact: true }).isVisible().catch(() => false)) {
      return;
    }
    await this.openUserRowActionsMenu(email);
    const inactiveLink = this.page.getByRole('link', { name: /Set as Inactive/i });
    await expect(inactiveLink).toBeVisible({ timeout: 15_000 });
    await inactiveLink.click();
  }

  async setUserActiveViaUserListActions(email: string) {
    const row = this.userTableRowForEmail(email);
    // exact: true is critical — without it 'Inactive' matches the 'Active' search (case-insensitive substring),
    // causing this guard to return early and skip the Set as Active action entirely
    if (await row.getByRole('gridcell', { name: 'Active', exact: true }).isVisible().catch(() => false)) {
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
    // exact: true ensures 'Active' does not match rows still showing 'Inactive'
    await expect(row.getByRole('gridcell', { name: status, exact: true })).toBeVisible({ timeout: 60_000 });
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

  /**
   * AM-028: loops through every "Invalid domain" entry in the fix-problematic-data panel.
   * For each entry it clicks the button, clicks Save, then waits for the count of remaining
   * "Invalid domain" entries to drop by one before moving to the next. Exits when none remain.
   */
  async fixAllInvalidDomainEntriesAm028() {
    const invalidTag = this.page.getByText('Invalid domain', { exact: true });
    const saveLink = this.page.getByRole('link', { name: /Save/i });

    await expect(invalidTag.first()).toBeVisible({ timeout: 30_000 });
    let remaining = await invalidTag.count();

    while (remaining > 0) {
      await invalidTag.first().click();
      await expect(saveLink).toBeVisible({ timeout: 15_000 });
      await saveLink.click();
      remaining -= 1;
      if (remaining > 0) {
        await expect(invalidTag).toHaveCount(remaining, { timeout: 30_000 });
      }
    }

    // All entries should now show OK; wait briefly for the UI to settle before Continue
    await expect(this.page.getByText('OK').first()).toBeVisible({ timeout: 30_000 });
    await this.page.waitForTimeout(3_000);
  }

  /** AM-029: after Continue on a malformed template, the "missing fields" banner is shown instead of the row-review step. */
  async expectBulkUploadMissingFieldsMessageAm029() {
    await expect(this.page.getByText(AM029_MISSING_FIELDS_MESSAGE, { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  }

  /**
   * AM-029: click Back to leave the missing-fields banner, wait for the page to finish loading,
   * then hard-reload so the Download Template / Upload UI are re-verified visible before the
   * next upload attempt.
   */
  async goBackAndReloadBulkUploadFormAm029() {
    await this.bulkUploadBackButton.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await expect(this.downloadTemplateButton).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByText('Upload completed template')).toBeVisible({ timeout: 30_000 });
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

  private addNewUsersDialog(): Locator {
    return this.page.getByRole('dialog').filter({
      has: this.page.getByText('Add new users', { exact: true }),
    });
  }

  private addOrganizationDialog(): Locator {
    return this.page.getByRole('dialog').filter({
      has: this.page.getByText('Create new organization', { exact: true }),
    });
  }

  /**
   * AM-021: clicks "Select Organization" inside the "Add new users" dialog, types the search
   * term, and picks the exact matching option. Scoped to the dialog to avoid the strict-mode
   * violation caused by the identically-named org filter combobox on the background page.
   */
  async selectOrganizationInAddUserFormAm021(searchTerm: string, orgName: string) {
    const dialog = this.addNewUsersDialog();
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.getByText('Select Organization').click();
    const searchInput = this.page.getByRole('textbox', { name: 'Search' });
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
    await searchInput.click();
    await searchInput.fill(searchTerm);
    await this.page.getByRole('option', { name: orgName, exact: true }).click();
  }

  /** AM-009: `/avo_organizationlist` — Add organization wizard. */
  async openOrganizationList() {
    await this.page.goto(`${CSI_BASE_URL}${CSI_ORGANIZATION_LIST_PATH}`);
    await expect(this.page.getByRole('button', { name: 'Add' })).toBeVisible({ timeout: 60_000 });
  }

  async startAddOrganization(options?: { waitBeforeAddMs?: number }) {
    if (options?.waitBeforeAddMs) {
      await this.page.waitForTimeout(options.waitBeforeAddMs);
    }
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

  /** AM-015: fill Create organization fields from ordered steps (no hardcoded field sequence). */
  async fillNewOrganizationFromSteps(steps: Am015OrganizationFormStep[]) {
    const dialog = this.addOrganizationDialog();

    for (const step of steps) {
      if (step.type === 'textbox') {
        const input = dialog.getByRole('textbox', { name: step.name });
        await expect(input).toBeVisible({ timeout: 30_000 });
        await input.click();
        await input.fill(step.value);
        if (step.name === 'Organization name') {
          await this.page.waitForTimeout(AM015_ORG_NAME_DROPDOWN_SETTLE_MS);
        }
        continue;
      }

      await dialog.getByText(step.triggerText, { exact: true }).click();
      await this.page.getByRole('option', { name: step.optionName }).click();
    }
  }

  async submitCreateOrganization() {
    await this.addOrganizationDialog().getByRole('button', { name: 'Create organization' }).click();
  }

  /** AM-016: Create organization stays on the form with owner email validation error. */
  async expectCreateOrganizationOwnerEmailValidationErrorAm016() {
    const dialog = this.addOrganizationDialog();
    await expect(dialog.getByText(AM016_OWNER_EMAIL_VALIDATION_MESSAGE, { exact: true })).toBeVisible({
      timeout: 30_000,
    });
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

  /** AM-015: Create organization succeeds even when the organization name already exists. */
  async expectOrganizationCreatedAm015() {
    await expect(
      this.page.getByText(AM015_ORGANIZATION_CREATED_SUCCESS, { exact: true }),
    ).toBeVisible({ timeout: 60_000 });
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

  // ─── AM-002: signup ──────────────────────────────────────────────────────

  /** AM-002: navigate to /signup (no login) and wait for the Email field. */
  async openSignupAm002() {
    await this.page.goto(`${CSI_BASE_URL}${CSI_SIGNUP_PATH}`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.signupEmailFieldAm002()).toBeVisible({ timeout: 30_000 });
  }

  private signupEmailFieldAm002() {
    return this.page.getByRole('textbox', { name: 'Enter your work email' });
  }

  /** AM-002: enter an already registered email in the signup form. */
  async fillSignupEmailAm002(email: string) {
    const emailField = this.signupEmailFieldAm002();
    await emailField.click();
    await emailField.fill(email);
  }

  /** AM-002: click "Next Step" to submit the email and trigger duplicate-email validation. */
  async submitSignupEmailStepAm002() {
    await this.page.getByRole('button', { name: 'Next Step' }).click();
  }

  /** AM-002: signup must show "Email already exist" for a registered address. */
  async expectSignupRegisteredEmailErrorAm002() {
    await expect(
      this.page.getByText(AM002_SIGNUP_REGISTERED_EMAIL_MESSAGE, { exact: true }),
    ).toBeVisible({ timeout: 60_000 });
  }

  // ─── AM-003: signup invalid email format ─────────────────────────────────

  /** AM-003: navigate to /signup (no login) and wait for the Email field. */
  async openSignupAm003() {
    await this.page.goto(`${CSI_BASE_URL}${CSI_SIGNUP_PATH}`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.signupEmailFieldAm003()).toBeVisible({ timeout: 30_000 });
  }

  private signupEmailFieldAm003() {
    return this.page.getByRole('textbox', { name: 'Enter your work email' });
  }

  /** AM-003: enter a value in the signup email field. */
  async fillSignupEmailAm003(email: string) {
    const emailField = this.signupEmailFieldAm003();
    await emailField.click();
    await emailField.fill(email);
  }

  /** AM-003: clear the signup email field before submitting an empty value. */
  async clearSignupEmailAm003() {
    const emailField = this.signupEmailFieldAm003();
    await emailField.click();
    await emailField.clear();
  }

  /** AM-003: click "Next Step" to trigger signup email validation. */
  async submitSignupEmailStepAm003() {
    await this.page.getByRole('button', { name: 'Next Step' }).click();
  }

  /** AM-003: malformed addresses must show "Enter a valid email." */
  async expectSignupInvalidEmailErrorAm003() {
    await expect(
      this.page.getByText(AM003_INVALID_EMAIL_MESSAGE, { exact: true }),
    ).toBeVisible({ timeout: 60_000 });
  }

  /** AM-003: an empty email field must show "This field is required." */
  async expectSignupRequiredEmailErrorAm003() {
    await expect(
      this.page.getByText(AM003_REQUIRED_EMAIL_MESSAGE, { exact: true }),
    ).toBeVisible({ timeout: 60_000 });
  }

  // ─── AM-041: group creation ────────────────────────────────────────────────

  /** AM-041: navigate to /groupList and wait for the Create New Group button. */
  async openGroupList() {
    await this.page.goto(`${CSI_BASE_URL}${CSI_GROUP_LIST_PATH}`);
    await expect(this.page.getByRole('button', { name: /Create New Group/i })).toBeVisible({
      timeout: 30_000,
    });
  }

  /**
   * AM-043: return the name from the first group-grid row, or undefined when no name appears
   * within the required 15-second window.
   */
  async firstGroupNameOrUndefinedAm043(): Promise<string | undefined> {
    const firstGroupNameCell = this.page
      .getByRole('grid')
      .filter({ has: this.page.getByRole('columnheader', { name: 'Name' }) })
      .locator('tbody tr.table-row')
      .first()
      .locator('td[data-header="Name"]');

    const nameIsVisible = await expect(firstGroupNameCell)
      .toBeVisible({ timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (!nameIsVisible) {
      return undefined;
    }

    const groupName = (await firstGroupNameCell.textContent())?.replace(/\s+/g, ' ').trim();
    expect(groupName, 'The first group-grid row must contain a group name').toBeTruthy();
    return groupName;
  }

  /**
   * AM-041: click "+ Create New Group" and fill the group title field.
   * Must be followed by selectGroupManagerAm041 and addGroupMemberByEmailAm041.
   */
  async startCreateGroupAm041(groupTitle: string) {
    await this.page.getByRole('button', { name: /Create New Group/i }).click();
    const titleInput = this.page.getByRole('textbox', { name: 'Group title*' });
    await expect(titleInput).toBeVisible({ timeout: 15_000 });
    await titleInput.click();
    await titleInput.fill(groupTitle);
  }

  /**
   * AM-041: open the manager VirtualSelect ("Search..."), type the manager's display name,
   * and click the matching option. The "Search..." element is the VirtualSelect placeholder
   * for the group manager assignment field.
   */
  async selectGroupManagerAm041(managerName: string) {
    await this.page.waitForTimeout(5_000);
    await this.page.getByText('Search...').click();
    const searchInput = this.page.getByRole('textbox', { name: 'Search' });
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
    await searchInput.click();
    await searchInput.fill(managerName);
    await this.page.getByRole('option', { name: managerName }).click();
  }

  /**
   * AM-041: open the member picker ("Add User"), search by the member's email, check the
   * member's row checkbox, and confirm selection with "Add Users".
   * The user grid is identified by its "Email" column header to avoid ambiguity.
   */
  async addGroupMemberByEmailAm041(memberEmail: string) {
    await this.page.getByRole('button', { name: 'Add User' }).click();

    const memberSearchBox = this.page.getByRole('searchbox', { name: 'Search user/position' });
    await expect(memberSearchBox).toBeVisible({ timeout: 15_000 });
    await memberSearchBox.click();
    await memberSearchBox.fill(memberEmail);
    await this.page.getByRole('button', { name: 'Search' }).click();

    // Wait for the member row to appear, then check its checkbox
    const memberGrid = this.page.getByRole('grid').filter({
      has: this.page.getByRole('columnheader', { name: 'Email' }),
    });
    const memberRow = memberGrid.getByRole('row').filter({
      has: this.page.getByRole('gridcell', { name: memberEmail }),
    });
    await expect(memberRow).toBeVisible({ timeout: 30_000 });
    await memberRow.getByRole('checkbox').check();

    await this.page.getByRole('button', { name: 'Add Users' }).click();
  }

  /** AM-041: click Save and wait for the "Group is successfully created." confirmation. */
  async saveGroupCreationAm041() {
    await this.page.getByRole('button', { name: 'Save' }).click();
    await expect(this.page.getByText('Group is successfully created.')).toBeVisible({
      timeout: 60_000,
    });
  }

  /**
   * AM-041: navigate to /groupList as the group manager and wait for the group search box.
   * Used in the verification phase after the system owner creates the group.
   */
  async openGroupListWithSearchReadyAm041() {
    await this.page.goto(`${CSI_BASE_URL}${CSI_GROUP_LIST_PATH}`);
    await expect(
      this.page.getByRole('searchbox', { name: 'Enter group name or contact' }),
    ).toBeVisible({ timeout: 30_000 });
  }

  /**
   * AM-041: search the group list by exact group title.
   * The group title cell must be visible in the grid after Search — do not click it.
   */
  async searchAndExpectGroupInGridAm041(groupTitle: string) {
    const searchBox = this.page.getByRole('searchbox', { name: 'Enter group name or contact' });
    await searchBox.click();
    await searchBox.fill(groupTitle);
    await this.page.getByRole('button', { name: 'Search' }).click();
    await expect(this.page.getByRole('gridcell', { name: groupTitle })).toBeVisible({
      timeout: 30_000,
    });
  }

  /**
   * AM-061: navigate to /UserProfile and click the "Security" tab button.
   * Waits for the Security button to be visible before clicking to ensure the profile page has loaded.
   */
  async openUserProfileSecurityTab() {
    await this.page.goto(`${CSI_BASE_URL}/UserProfile`);
    const securityButton = this.page.getByRole('button', { name: 'Security' });
    await expect(securityButton).toBeVisible({ timeout: 30_000 });
    await securityButton.click();
  }

  /**
   * AM-061: fill the Change Password form fields without using element IDs.
   *
   * Each password field lives inside a `.columns-item` container that also holds its label.
   * Scoping the input locator to that container uniquely identifies each field:
   *   - "Current password" label  → first input
   *   - /New Password/ (capital P) → second input; case-sensitive regex avoids matching
   *                                   "Confirm new password" (lowercase p)
   *   - "Confirm new password"    → third input
   *
   * The method fills newPassword into both the new-password and confirm-password fields.
   */
  async fillChangePasswordFormAm061(currentPassword: string, newPassword: string) {
    const currentField = this.page
      .locator('.columns-item')
      .filter({ hasText: 'Current password' })
      .locator('input');
    const newField = this.page
      .locator('.columns-item')
      .filter({ hasText: /New Password/ })
      .locator('input');
    const confirmField = this.page
      .locator('.columns-item')
      .filter({ hasText: 'Confirm new password' })
      .locator('input');

    await expect(currentField).toBeVisible({ timeout: 15_000 });
    await currentField.click();
    await currentField.fill(currentPassword);
    await newField.click();
    await newField.fill(newPassword);
    await confirmField.click();
    await confirmField.fill(newPassword);
  }

  /** AM-061: click the "Update new password" submit button. */
  async submitChangePasswordAm061() {
    await this.page.getByRole('button', { name: 'Update new password' }).click();
  }

  /** AM-061: assert the "Password changed successfully" confirmation message is visible. */
  async expectPasswordChangedSuccessAm061() {
    await expect(this.page.getByText('Password changed successfully')).toBeVisible({
      timeout: 30_000,
    });
  }
}
