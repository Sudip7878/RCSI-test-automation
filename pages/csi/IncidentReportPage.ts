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

  private incidentDashboardGrid() {
    return this.page.getByRole('grid').filter({
      has: this.page.getByRole('columnheader', { name: 'CaseId' }),
    });
  }

  private tableRowByCaseId(caseId: string): Locator {
    return this.incidentDashboardGrid().getByRole('row').filter({
      has: this.page.getByRole('gridcell', { name: caseId }),
    });
  }

  private handlerChangeDialog(): Locator {
    return this.page.getByRole('dialog').filter({
      has: this.page.getByText('Change Handler', { exact: true }),
    });
  }

  private statusUpdateDialog(): Locator {
    return this.page.getByRole('dialog').filter({
      has: this.page.getByText('Update Status', { exact: true }),
    });
  }

  private commentTabPanel(): Locator {
    return this.page.getByRole('tabpanel', { name: 'Comment' });
  }

  private async ensureIncidentDetailView() {
    await expect(this.page.getByText(/Incident Description/i)).toBeVisible({ timeout: 60_000 });
  }

  private async clickIncidentHandlerNotAssigned() {
    const section = this.page.getByText('Incident Handler', { exact: true });
    await expect(section).toBeVisible({ timeout: 30_000 });
    const clicked = await section.evaluate((el) => {
      const root =
        (el.closest('[id="IncidentHandler"]') as HTMLElement | null) ??
        el.parentElement?.parentElement;
      const target = root?.querySelector('.bold');
      if (target?.textContent?.trim() === 'Not Assigned') {
        (target as HTMLElement).click();
        return true;
      }
      return false;
    });
    expect(clicked).toBe(true);
  }

  private async clickStatusChip(chipText: string) {
    const clicked = await this.page.evaluate((chip) => {
      const box = document.getElementById('Status');
      if (!box) {
        return false;
      }
      const span = Array.from(box.querySelectorAll('span')).find(
        (node) => node.textContent?.trim() === chip,
      );
      if (span) {
        (span as HTMLElement).click();
        return true;
      }
      return false;
    }, chipText);
    expect(clicked).toBe(true);
  }

  private async commentFileInputHandle() {
    const upload = this.page.getByText('Upload File', { exact: true });
    await expect(upload).toBeVisible({ timeout: 15_000 });
    return upload.evaluateHandle((el) => {
      let container: HTMLElement | null = el.parentElement;
      while (container) {
        const input = container.querySelector('input[type="file"]') as HTMLInputElement | null;
        if (input) {
          return input;
        }
        container = container.parentElement;
      }
      return null;
    });
  }

  private async ensureCommentTabSelected() {
    const tab = this.page.getByRole('tab', { name: 'Comment' });
    if ((await tab.count()) > 0 && (await tab.isVisible().catch(() => false))) {
      await tab.click();
    }
    await expect(this.commentTabPanel()).toBeVisible({ timeout: 30_000 });
  }

  async openDashboard() {
    await this.page.goto(`${CSI_BASE_URL}${CSI_INCIDENT_REPORT_DASHBOARD_PATH}`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.addNewIncidentButton).toBeVisible({ timeout: 60_000 });
  }

  /** IR-001: sidebar navigation after reporter login (spec used inline getByRole). */
  async openIncidentResponseFromSidebar() {
    const link = this.page.getByRole('link', { name: 'Incident Response' });
    await expect(link).toBeVisible({ timeout: 60_000 });
    await link.click();
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
   * After success toast, resolve CaseId from page text (`XX-YY-NNNNNN`) or first dashboard CaseId cell.
   */
  async readCaseIdAfterIncidentReportedSuccessfully(): Promise<string> {
    await expect(this.successMessage).toBeVisible({ timeout: 15_000 });
    await this.page.waitForTimeout(500);
    const bodyText = await this.page.evaluate(() => document.body.innerText);
    const fromBody = bodyText.match(/\b([A-Z]{2}-\d{2}-\d{6})\b/);
    if (fromBody?.[1]) {
      return fromBody[1];
    }

    await this.openDashboard();
    const grid = this.incidentDashboardGrid();
    await expect(grid).toBeVisible({ timeout: 60_000 });
    const rows = await grid.getByRole('row').all();
    for (const row of rows) {
      const cells = await row.getByRole('gridcell').all();
      for (const cell of cells) {
        const text = (await cell.innerText()).trim();
        const match = text.match(/^[A-Z]{2}-\d{2}-\d{6}$/);
        if (match?.[0]) {
          return match[0];
        }
      }
    }
    throw new Error('Could not resolve CaseId after incident reported successfully');
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
    const grid = this.incidentDashboardGrid();
    await expect(grid).toBeVisible({ timeout: 60_000 });
    const row = this.tableRowByCaseId(caseId);
    await expect(row).toBeVisible({ timeout: 60_000 });
    await row.getByRole('button', { name: 'See Details' }).click();
    await this.ensureIncidentDetailView();
  }

  /**
   * Detail view: open handler picker from Not Assigned, search, pick list entry by visible name, Update.
   */
  async assignIncidentHandlerFromNotAssignedByDisplayName(handlerDisplayName: string) {
    await this.clickIncidentHandlerNotAssigned();
    const dialog = this.handlerChangeDialog();
    await expect(dialog).toBeVisible({ timeout: 30_000 });

    const search = dialog.getByRole('searchbox', { name: 'Search' });
    if ((await search.count()) > 0) {
      await search.click();
    } else {
      await dialog.getByPlaceholder('Search').click();
    }
    await dialog.getByRole('button', { name: 'Search' }).click();

    const handlerEntry = dialog.getByText(handlerDisplayName, { exact: true });
    await expect(handlerEntry).toBeVisible({ timeout: 60_000 });
    await handlerEntry.click();

    await dialog.getByRole('button', { name: 'Update' }).click();
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
    await this.ensureIncidentDetailView();
    await this.clickStatusChip(currentChipText);

    const dialog = this.statusUpdateDialog();
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await dialog.getByText(nextPickerLabel, { exact: true }).click();
    await dialog.getByRole('button', { name: 'Update' }).click();
    await expect(this.page.getByText('Status Updated Successfully')).toBeVisible({ timeout: 60_000 });
  }

  /**
   * Dashboard: for `caseId` row, Handler cell must not be Not Assigned and Status must include `statusNeedle`.
   */
  async expectDashboardIncidentHandlerAndStatus(caseId: string, handlerDisplayName: string, statusNeedle: string) {
    await this.openDashboard();
    const grid = this.incidentDashboardGrid();
    await expect(grid).toBeVisible({ timeout: 60_000 });
    const row = this.tableRowByCaseId(caseId);
    await expect(row).toBeVisible({ timeout: 60_000 });

    const handlerCell = row.getByRole('gridcell', { name: handlerDisplayName });
    await expect(handlerCell).toBeVisible({ timeout: 30_000 });
    const handlerText = (await handlerCell.innerText()).trim();
    expect(handlerText).not.toMatch(/^Not Assigned$/i);

    await expect(row.getByRole('gridcell', { name: new RegExp(statusNeedle, 'i') })).toBeVisible({
      timeout: 30_000,
    });
  }

  /**
   * Incident detail: Comment tab — text + PDF upload with client-side filename alias (IR-012).
   */
  async postDetailCommentWithUploadedPdfAlias(params: {
    commentText: string;
    aliasPdfFileName: string;
    sourcePdfAbsolutePath: string;
  }) {
    await this.ensureIncidentDetailView();
    await this.ensureCommentTabSelected();

    const commentBox = this.page.getByRole('textbox', { name: /Add a Comment/i });
    await expect(commentBox).toBeVisible({ timeout: 30_000 });
    await commentBox.click();
    await commentBox.fill(params.commentText);

    await this.page.getByText('Upload File', { exact: true }).click();
    const handle = await this.commentFileInputHandle();
    const fileInput = handle.asElement();
    expect(fileInput).not.toBeNull();
    const buffer = fs.readFileSync(params.sourcePdfAbsolutePath);
    await fileInput!.setInputFiles({
      name: params.aliasPdfFileName,
      mimeType: 'application/pdf',
      buffer,
    });
    await handle.dispose();

    await expect(this.page.getByText('File uploaded successfully!', { exact: true })).toBeVisible({
      timeout: 120_000,
    });

    const saveInPanel = this.commentTabPanel().getByRole('button', { name: 'Save' });
    await expect(saveInPanel).toBeVisible({ timeout: 15_000 });
    await saveInPanel.click();
    await expect(this.page.getByText('Comment added successfully!', { exact: true })).toBeVisible({
      timeout: 60_000,
    });
  }

  async postDetailCommentReply(commentText: string) {
    await this.ensureIncidentDetailView();
    await this.ensureCommentTabSelected();

    const commentBox = this.page.getByRole('textbox', { name: /Add a Comment/i });
    await expect(commentBox).toBeVisible({ timeout: 30_000 });
    await commentBox.click();
    await commentBox.fill(commentText);

    const saveInPanel = this.commentTabPanel().getByRole('button', { name: 'Save' });
    await expect(saveInPanel).toBeVisible({ timeout: 15_000 });
    await saveInPanel.click();
    await expect(this.page.getByText('Comment added successfully!', { exact: true })).toBeVisible({
      timeout: 60_000,
    });
  }

  async expectDetailViewShowsCommentText(commentText: string) {
    await this.ensureIncidentDetailView();
    await this.ensureCommentTabSelected();
    await expect(this.commentTabPanel().getByText(commentText, { exact: true })).toBeVisible({
      timeout: 60_000,
    });
  }

  async expectDetailCommentAttachmentAliasVisible(aliasPdfFileName: string) {
    await this.ensureIncidentDetailView();
    await this.ensureCommentTabSelected();
    await expect(this.commentTabPanel().getByText(aliasPdfFileName, { exact: true })).toBeVisible({
      timeout: 60_000,
    });
  }

  /** Download icon link beside the uploaded filename in the Comment tab (IR-012). */
  async expectCommentAttachmentDownloadStarted(aliasPdfFileName: string) {
    await this.ensureCommentTabSelected();
    const fileName = this.commentTabPanel().getByText(aliasPdfFileName, { exact: true });
    await expect(fileName).toBeVisible({ timeout: 60_000 });

    const downloadPromise = this.page.waitForEvent('download', { timeout: 120_000 });
    const clicked = await fileName.evaluate((el) => {
      const item = el.closest('.file-item') as HTMLElement | null;
      const downloadIcon = item?.querySelector('a[data-link] .fa-download');
      const link = downloadIcon?.closest('a') as HTMLElement | null;
      if (link) {
        link.click();
        return true;
      }
      return false;
    });
    expect(clicked).toBe(true);
    const download = await downloadPromise;
    const suggested = download.suggestedFilename();
    expect(suggested != null && suggested.length > 0).toBe(true);
  }

  /** Dashboard grid: Status column for `caseId` contains `statusNeedle` (no header click). */
  async expectDashboardIncidentStatus(caseId: string, statusNeedle: string) {
    await this.openDashboard();
    const grid = this.incidentDashboardGrid();
    await expect(grid).toBeVisible({ timeout: 60_000 });
    const row = this.tableRowByCaseId(caseId);
    await expect(row).toBeVisible({ timeout: 60_000 });
    await expect(row.getByRole('gridcell', { name: new RegExp(statusNeedle, 'i') })).toBeVisible({
      timeout: 30_000,
    });
  }
}
