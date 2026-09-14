import { expect, type Locator } from '@playwright/test';
import * as path from 'node:path';
import {
  CSI_ATTACK_SURFACE_PATH,
  CSI_BASE_URL,
  CSI_DARKWEB_REPORT_PATH,
  CSI_REQUEST_HISTORY_PATH,
} from '../../config/csi';
import { BasePage } from '../BasePage';

export class CsiSecurityReportPage extends BasePage {
  readonly requestNewReportButton = this.page.getByRole('button', { name: 'Request New Report' });

  private dataGrid(): Locator {
    return this.page.locator('table.table[role="grid"]');
  }

  private attackSurfaceRequestGrid(): Locator {
    return this.dataGrid();
  }

  private requestHistoryGrid(): Locator {
    return this.dataGrid();
  }

  /** SR-001 dashboard KPI labels render as `span.bold` inside `div[data-container]` (not plain text nodes). */
  private attackSurfaceDashboardMetricLabel(label: string): Locator {
    const exact = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
    return this.page.locator('span.bold', { hasText: exact });
  }

  private async expectDashboardMetricLabelVisible(label: string, nth = 0) {
    const metric = nth === 0 ? this.attackSurfaceDashboardMetricLabel(label).first() : this.attackSurfaceDashboardMetricLabel(label).nth(nth);
    await metric.scrollIntoViewIfNeeded();
    await expect(metric).toBeVisible({ timeout: 60_000 });
  }

  /** SR-009: direct navigation to dark web report (cross-org leak check). */
  async openDarkwebReport(darkWebRequestId: number) {
    await this.page.goto(`${CSI_BASE_URL}${CSI_DARKWEB_REPORT_PATH}?DarkWebRequestId=${darkWebRequestId}`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectDarkwebReportNoPermissionMessage() {
    await expect(
      this.page.getByText("You don't have permissions to view this screen.", { exact: true }),
    ).toBeVisible({ timeout: 60_000 });
  }

  async openAttackSurface() {
    await this.page.goto(`${CSI_BASE_URL}${CSI_ATTACK_SURFACE_PATH}`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.requestNewReportButton).toBeVisible({ timeout: 60_000 });
    await expect(this.requestNewReportButton).toBeEnabled({ timeout: 15_000 });
  }

  /** SR-005 admin: dialog Request + success + Request History (3s settle before Request per recorded steps). */
  async submitNewAttackSurfaceRequestFlow() {
    await this.requestNewReportButton.click();
    await this.page.waitForTimeout(3000);
    await this.page.getByRole('button', { name: 'Request' }).click();
    await expect(this.page.getByText(/Your request has been/i)).toBeVisible({ timeout: 60_000 });
    await this.page.getByRole('button', { name: 'Go to Request History' }).click();
  }

  /**
   * SR-005 CSI_TEST: optional Clear after grid settles; skip if Clear never appears (recorded steps).
   */
  async tryClickClearAfterGridSettled() {
    await this.page.waitForTimeout(3000);
    const clearBtn = this.page.getByRole('button', { name: 'Clear button' });
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click();
    }
    await expect(this.attackSurfaceRequestGrid()).toBeVisible({ timeout: 60_000 });
  }

  /** SR-001: first grid row (top to bottom) with Completed status → See Details → Report Details. */
  async openFirstCompletedAttackSurfaceReportDetails() {
    const row = this.attackSurfaceRequestGrid().locator('tbody tr.table-row').filter({ hasText: 'Completed' }).first();
    await expect(row).toBeVisible({ timeout: 120_000 });
    await row.getByRole('button', { name: 'See Details' }).click();
    await expect(this.page.getByText('Report Details').nth(1)).toBeVisible({ timeout: 60_000 });
  }

  /** SR-001: dashboard labels and detail tabs from recorded steps. */
  async expectAttackSurfaceReportDashboardView() {
    await this.expectDashboardMetricLabelVisible('All Assets');
    await this.expectDashboardMetricLabelVisible('Domains');
    await this.expectDashboardMetricLabelVisible('IP Addresses');
    await this.expectDashboardMetricLabelVisible('SSL Certificates');
    await this.expectDashboardMetricLabelVisible('CVEs');
    await this.expectDashboardMetricLabelVisible('SSL Certificate Grades');
    await this.expectDashboardMetricLabelVisible('Open Ports');

    for (const tabName of ['CVE', 'Products', 'Subdomains', 'IP Overview', 'SSL'] as const) {
      await this.page.getByRole('tab', { name: tabName }).click();
      await expect(this.page.getByRole('tab', { name: tabName })).toBeVisible();
    }
  }

  async openRequestHistory() {
    await this.page.goto(`${CSI_BASE_URL}${CSI_REQUEST_HISTORY_PATH}`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.requestHistoryGrid()).toBeVisible({ timeout: 60_000 });
  }

  /** SR-010: Request History ready for darkweb request (grid + Request New Report). */
  async openRequestHistoryForDarkwebRequest() {
    await this.openRequestHistory();
    await expect(this.requestNewReportButton).toBeVisible({ timeout: 60_000 });
    await expect(this.requestNewReportButton).toBeEnabled({ timeout: 15_000 });
  }

  private darkwebNewRequestDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'Request New Report' });
  }

  /** SR-010 admin: dialog Request + success toast; grid first row should show Pending. */
  async submitNewDarkwebRequestFlow() {
    await this.requestNewReportButton.click();
    await this.page.waitForTimeout(3000);

    const dialog = this.darkwebNewRequestDialog();
    await expect(dialog).toBeVisible({ timeout: 30_000 });

    const companyDomainSelect = dialog.locator('select[id*="Dropdown_Domain"]');
    await expect(companyDomainSelect).toBeVisible({ timeout: 15_000 });
    // index 0 is placeholder (value="-1"); recorded step selects first domain option value "0".
    await companyDomainSelect.selectOption('0');
    await expect(companyDomainSelect).toHaveValue('0');

    await dialog.getByRole('button', { name: 'Request' }).click();
    await expect(this.page.getByText('New darkweb request created', { exact: true })).toBeVisible({
      timeout: 60_000,
    });
    await this.expectFirstRequestHistoryRowStatus('Pending');
  }

  /** SR-010 CSI_TEST: optional Clear within 5s after grid loads (recorded steps). */
  async tryClickClearAfterRequestHistoryGridSettled() {
    await expect(this.requestHistoryGrid()).toBeVisible({ timeout: 60_000 });
    const clearBtn = this.page.getByRole('button', { name: 'Clear button' });
    const visible = await clearBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (visible) {
      await clearBtn.click();
    }
  }

  async expectFirstRequestHistoryRowStatus(status: 'Pending' | 'Completed') {
    const row = this.requestHistoryGrid().locator('tbody tr.table-row').first();
    await expect(row).toBeVisible({ timeout: 120_000 });
    await expect(row).toContainText(status);
  }

  /** SR-010: first Pending row on Request History → See Details. */
  async openFirstPendingRequestHistoryDetails() {
    const row = this.requestHistoryGrid().locator('tbody tr.table-row').filter({ hasText: 'Pending' }).first();
    await expect(row).toBeVisible({ timeout: 120_000 });
    await row.getByRole('button', { name: 'See Details' }).click();
    await expect(this.page.getByText(/Requested Data/i)).toBeVisible({ timeout: 60_000 });
  }

  /** SR-010: first / last "Browse File" under Upload Report (Exposure Trends, then Exployee Credentials). */
  private async uploadDarkwebReportViaBrowseFileText(fileIndex: 0 | 1, absolutePdfPath: string): Promise<void> {
    const fileName = path.basename(absolutePdfPath);
    const uploadReport = this.page.locator('#UploadingAndData');
    const browseLinks = uploadReport.getByText('Browse File', { exact: true });
    await expect(browseLinks.first()).toBeVisible({ timeout: 30_000 });

    const browse = fileIndex === 0 ? browseLinks.first() : browseLinks.last();
    await browse.scrollIntoViewIfNeeded();

    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await browse.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(absolutePdfPath);

    await expect(uploadReport.getByText(fileName, { exact: true })).toBeVisible({ timeout: 60_000 });
  }

  /** SR-010: Yes → two PDF uploads → Submit → Request History shows submitted. */
  async submitDarkwebRequestedDataWithUploadedPdfs(absolutePdfPaths: readonly [string, string]) {
    await this.page.getByText('Requested Data', { exact: false }).first().click();
    await this.page.getByRole('button', { name: 'Yes' }).click();
    await expect(this.page.locator('#UploadingAndData')).toBeVisible({ timeout: 60_000 });
    await this.uploadDarkwebReportViaBrowseFileText(0, absolutePdfPaths[0]);
    await this.uploadDarkwebReportViaBrowseFileText(1, absolutePdfPaths[1]);
    const submitBtn = this.page.locator('#Button').getByRole('button', { name: 'Submit' });
    await expect(submitBtn).toBeEnabled({ timeout: 30_000 });
    await submitBtn.click();
    await expect(this.page.getByText('Request submitted', { exact: true })).toBeVisible({ timeout: 120_000 });
    await this.page.waitForURL(/\/RequestHistory/i, { timeout: 60_000 }).catch(async () => {
      await this.openRequestHistory();
    });
    await expect(this.requestHistoryGrid()).toBeVisible({ timeout: 60_000 });
  }

  /** SR-014: first Completed row (top to bottom) on Request History grid → See Details. */
  async openFirstCompletedRequestHistoryDetails() {
    const row = this.requestHistoryGrid().locator('tbody tr.table-row').filter({ hasText: 'Completed' }).first();
    await expect(row).toBeVisible({ timeout: 120_000 });
    await row.getByRole('button', { name: 'See Details' }).click();
    await expect(this.page.getByText('Summary').first()).toBeVisible({ timeout: 60_000 });
  }

  /** SR-014: darkweb report summary sections (recorded steps). */
  async expectDarkwebReportSummaryView() {
    const labels: Array<{ text: string; exact?: boolean }> = [
      { text: 'Summary' },
      { text: 'Number of Post' },
      { text: 'Number of Source' },
      { text: 'Exposures and Mentions' },
      { text: 'Employee Credentials Leak' },
      { text: 'Recommendation', exact: true },
    ];
    for (const { text, exact } of labels) {
      const loc = exact ? this.page.getByText(text, { exact: true }) : this.page.getByText(text).first();
      await loc.scrollIntoViewIfNeeded();
      await expect(loc).toBeVisible({ timeout: 60_000 });
    }
  }

  /** SR-001 / SR-014: Export Report — assert a file download starts (content not checked). */
  async exportAttackSurfaceReportAndExpectDownload() {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 120_000 });
    await this.page.getByRole('button', { name: 'Export Report' }).click();
    const download = await downloadPromise;
    const suggested = download.suggestedFilename();
    expect(suggested != null && suggested.length > 0).toBe(true);
  }

  /** First grid row whose Status shows Pending; then See Details (SR-005 HTML). */
  async openFirstPendingAttackSurfaceRequestDetails() {
    const row = this.attackSurfaceRequestGrid().locator('tbody tr.table-row').filter({ hasText: 'Pending' }).first();
    await expect(row).toBeVisible({ timeout: 120_000 });
    await row.getByRole('button', { name: 'See Details' }).click();
    await expect(this.page.getByText(/Requested Data/i)).toBeVisible({ timeout: 60_000 });
  }

  /** Approve flow: Yes → Browse File → upload PDF → Submit; expects `Request approved successfully`. */
  async approveRequestedDataWithUploadedPdf(absolutePdfPath: string, expectedFileName: string) {
    await this.page.getByText('Requested Data', { exact: false }).first().click();
    await this.page.getByRole('button', { name: 'Yes' }).click();
    await this.page.getByText('Browse File', { exact: true }).click();
    const fileInput = this.page.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached({ timeout: 15_000 });
    await fileInput.setInputFiles(absolutePdfPath);
    await expect(this.page.getByText(expectedFileName, { exact: true })).toBeVisible({ timeout: 30_000 });
    await this.page.getByRole('button', { name: 'Submit' }).click();
    await expect(this.page.getByText('Request approved successfully', { exact: true })).toBeVisible({
      timeout: 120_000,
    });
  }
}
