import { expect, type Locator } from '@playwright/test';
import * as fs from 'node:fs';
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

  private incidentDashboardTable(): Locator {
    return this.page.locator('table.table[role="grid"]');
  }

  /** Row in dashboard grid whose CaseId cell matches `caseId` (does not use column header clicks). */
  private tableRowByCaseId(caseId: string): Locator {
    return this.incidentDashboardTable().locator('tbody tr.table-row').filter({ hasText: caseId }).first();
  }

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

  /**
   * After success toast, resolve CaseId from page text (`XX-YY-NNNNNN`) or first dashboard row.
   */
  async readCaseIdAfterIncidentReportedSuccessfully(): Promise<string> {
    await expect(this.successMessage).toBeVisible({ timeout: 15_000 });
    await this.page.waitForTimeout(500);
    const bodyText = await this.page.locator('body').innerText();
    const fromBody = bodyText.match(/\b([A-Z]{2}-\d{2}-\d{6})\b/);
    if (fromBody?.[1]) {
      return fromBody[1];
    }
    await this.openDashboard();
    await expect(this.incidentDashboardTable()).toBeVisible({ timeout: 60_000 });
    const firstCase = this.incidentDashboardTable()
      .locator('tbody tr.table-row td[data-header="CaseId"] span[data-expression]')
      .first();
    await expect(firstCase).toBeVisible({ timeout: 30_000 });
    return (await firstCase.innerText()).trim();
  }

  /** IR-011: full reporter create flow; returns CaseId without altering IR-005 step methods. */
  async createIncidentReportAndCaptureCaseId(description: string, affectedSystems: string): Promise<string> {
    await this.openDashboard();
    await this.startNewIncidentForm();
    await this.fillMandatoryDropdowns();
    await this.fillDescriptionAndAffectedSystems(description, affectedSystems);
    await this.saveUntilSuccessVisible();
    return this.readCaseIdAfterIncidentReportedSuccessfully();
  }

  async openIncidentDetailsForCaseId(caseId: string) {
    await expect(this.incidentDashboardTable()).toBeVisible({ timeout: 60_000 });
    const row = this.tableRowByCaseId(caseId);
    await expect(row).toBeVisible({ timeout: 60_000 });
    await row.getByRole('button', { name: 'See Details' }).click();
    await expect(this.page.getByText(/Incident Description/i)).toBeVisible({ timeout: 60_000 });
  }

  /**
   * Detail view: open handler picker from Not Assigned, search, pick list entry by visible name, Update.
   * List rows use `[data-list].list` with `span[data-expression]` (see IR-011.txt).
   */
  async assignIncidentHandlerFromNotAssignedByDisplayName(handlerDisplayName: string) {
    await this.page.getByText('Not Assigned', { exact: true }).first().click();
    const searchBtn = this.page.getByRole('button', { name: 'Search' }).first();
    await expect(searchBtn).toBeVisible({ timeout: 30_000 });
    await searchBtn.click();
    const handlerEntry = this.page.locator('[data-list].list').getByText(handlerDisplayName, { exact: true }).first();
    await expect(handlerEntry).toBeVisible({ timeout: 60_000 });
    await handlerEntry.click();
    const updateHandler = this.page.getByRole('button', { name: 'Update' }).first();
    await expect(updateHandler).toBeVisible({ timeout: 15_000 });
    await updateHandler.click();
    await expect(this.page.getByText('Handler Assigned Successfully')).toBeVisible({ timeout: 60_000 });
  }

  /** Detail view: UI spelling is `Under Assesment` / `UNDER ASSESMENT` (product typo). */
  async transitionIncidentStatusOpenToUnderAssessment() {
    await this.transitionIncidentDetailStatusByPicker('OPEN', 'Under Assesment');
  }

  /**
   * Detail view: status picker — click current chip (`currentChipText`), choose `nextPickerLabel`, Update.
   * Product spelling: `Under Assesment`; success toast `Status Updated Successfully` (IR-013).
   */
  async transitionIncidentDetailStatusByPicker(currentChipText: string, nextPickerLabel: string) {
    await expect(this.page.getByText(/Incident Description/i)).toBeVisible({ timeout: 60_000 });
    await this.page.getByText('Incident Description', { exact: false }).first().click();
    await this.page.getByText(currentChipText, { exact: true }).first().click();
    const next = this.page.getByText(nextPickerLabel, { exact: true });
    await expect(next).toBeVisible({ timeout: 30_000 });
    await next.click();
    const updateBtn = this.page.getByRole('button', { name: 'Update' }).first();
    await expect(updateBtn).toBeVisible({ timeout: 15_000 });
    await updateBtn.click();
    await expect(this.page.getByText('Status Updated Successfully')).toBeVisible({ timeout: 60_000 });
  }

  /**
   * Dashboard: for `caseId` row, Handler cell must not be Not Assigned and Status must include `statusNeedle`.
   * Does not click the Handler column header (read cells only).
   */
  async expectDashboardIncidentHandlerAndStatus(caseId: string, handlerDisplayName: string, statusNeedle: string) {
    await this.openDashboard();
    await expect(this.incidentDashboardTable()).toBeVisible({ timeout: 60_000 });
    const row = this.tableRowByCaseId(caseId);
    await expect(row).toBeVisible({ timeout: 60_000 });
    const handlerText = (await row.locator('td[data-header="Handler"] span[data-expression]').innerText()).trim();
    expect(handlerText.length).toBeGreaterThan(0);
    expect(handlerText).not.toMatch(/^Not Assigned$/i);
    expect(handlerText).toContain(handlerDisplayName);
    await expect(row.locator('td[data-header="Status"]')).toContainText(statusNeedle, { ignoreCase: true });
  }

  private commentTabPanel(): Locator {
    return this.page.getByRole('tabpanel', { name: 'Comment' });
  }

  private async ensureCommentTabSelected() {
    const tab = this.page.getByRole('tab', { name: 'Comment' });
    if ((await tab.count()) > 0 && (await tab.isVisible().catch(() => false))) {
      await tab.click();
    }
    await expect(this.commentTabPanel()).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Incident detail: Comment tab — text + PDF upload with client-side filename alias (IR-012).
   * Waits for upload and save toasts per recorded steps.
   */
  async postDetailCommentWithUploadedPdfAlias(params: {
    commentText: string;
    aliasPdfFileName: string;
    sourcePdfAbsolutePath: string;
  }) {
    await expect(this.page.getByText(/Incident Description/i)).toBeVisible({ timeout: 60_000 });
    await this.page.getByText('Incident Description', { exact: false }).first().click();
    await this.ensureCommentTabSelected();

    const commentBox = this.page.getByRole('textbox', { name: /Add a Comment/i });
    await expect(commentBox).toBeVisible({ timeout: 30_000 });
    await commentBox.click();
    await commentBox.fill(params.commentText);

    await this.page.getByText('Upload File', { exact: true }).click();
    const fileInput = this.commentTabPanel().locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached({ timeout: 15_000 });
    const buffer = fs.readFileSync(params.sourcePdfAbsolutePath);
    await fileInput.setInputFiles({
      name: params.aliasPdfFileName,
      mimeType: 'application/pdf',
      buffer,
    });

    await expect(this.page.getByText('File uploaded successfully!', { exact: true })).toBeVisible({
      timeout: 120_000,
    });

    const saveInPanel = this.commentTabPanel().getByRole('button', { name: 'Save' });
    if (await saveInPanel.isVisible().catch(() => false)) {
      await saveInPanel.click();
    } else {
      await this.page.getByRole('button', { name: 'Save' }).first().click();
    }
    await expect(this.page.getByText('Comment added successfully!', { exact: true })).toBeVisible({
      timeout: 60_000,
    });
  }

  async postDetailCommentReply(commentText: string) {
    await expect(this.page.getByText(/Incident Description/i)).toBeVisible({ timeout: 60_000 });
    await this.page.getByText('Incident Description', { exact: false }).first().click();
    await this.ensureCommentTabSelected();
    const commentBox = this.page.getByRole('textbox', { name: /Add a Comment/i });
    await expect(commentBox).toBeVisible({ timeout: 30_000 });
    await commentBox.click();
    await commentBox.fill(commentText);
    const saveInPanel = this.commentTabPanel().getByRole('button', { name: 'Save' });
    if (await saveInPanel.isVisible().catch(() => false)) {
      await saveInPanel.click();
    } else {
      await this.page.getByRole('button', { name: 'Save' }).first().click();
    }
    await expect(this.page.getByText('Comment added successfully!', { exact: true })).toBeVisible({
      timeout: 60_000,
    });
  }

  async expectDetailViewShowsCommentText(commentText: string) {
    await expect(this.page.getByText(/Incident Description/i)).toBeVisible({ timeout: 60_000 });
    await this.page.getByText('Incident Description', { exact: false }).first().click();
    await this.ensureCommentTabSelected();
    await expect(this.commentTabPanel().getByText(commentText, { exact: true })).toBeVisible({ timeout: 60_000 });
  }

  async expectDetailCommentAttachmentAliasVisible(aliasPdfFileName: string) {
    await expect(this.page.getByText(/Incident Description/i)).toBeVisible({ timeout: 60_000 });
    await this.page.getByText('Incident Description', { exact: false }).first().click();
    await this.ensureCommentTabSelected();
    const scope = this.page.getByLabel('Comment');
    await expect(scope.getByText(aliasPdfFileName, { exact: true })).toBeVisible({ timeout: 60_000 });
  }

  /** First `a[href]` near the uploaded filename in the Comment section; asserts download only (IR-012). */
  async expectCommentAttachmentDownloadStarted(aliasPdfFileName: string) {
    await this.ensureCommentTabSelected();
    const scope = this.page.getByLabel('Comment');
    await expect(scope.getByText(aliasPdfFileName, { exact: true })).toBeVisible({ timeout: 60_000 });
    const attachmentBlock = scope.locator('div, li, tr, span').filter({ hasText: aliasPdfFileName }).first();
    await expect(attachmentBlock).toBeVisible({ timeout: 30_000 });
    const downloadPromise = this.page.waitForEvent('download', { timeout: 120_000 });
    const link = attachmentBlock.locator('a[href]').first();
    if ((await link.count()) > 0) {
      await link.click();
    } else {
      await scope.getByRole('link').first().click();
    }
    const download = await downloadPromise;
    const suggested = download.suggestedFilename();
    expect(suggested != null && suggested.length > 0).toBe(true);
  }

  /** Dashboard grid: Status column for `caseId` contains `statusNeedle` (no header click). */
  async expectDashboardIncidentStatus(caseId: string, statusNeedle: string) {
    await this.openDashboard();
    await expect(this.incidentDashboardTable()).toBeVisible({ timeout: 60_000 });
    const row = this.tableRowByCaseId(caseId);
    await expect(row).toBeVisible({ timeout: 60_000 });
    await expect(row.locator('td[data-header="Status"]')).toContainText(statusNeedle, { ignoreCase: true });
  }
}
