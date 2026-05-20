/// <reference lib="dom" />
import { expect, type Locator } from '@playwright/test';
import * as path from 'path';
import { CSI_BASE_URL } from '../../config/csi';
import {
  csiItAssetCurrency,
  csiItAssetManufacturer,
  csiItAssetOperatingSystem,
  csiItAssetState,
  csiItAssetSupplier,
} from '../../utils/csi/itAssetManagementTestData';
import { BasePage } from '../BasePage';

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class CsiItAssetManagementPage extends BasePage {
  readonly addAssetButton = this.page.getByRole('button', { name: 'Add Asset' });
  readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  readonly desktopComputersCategory = this.page.getByText('Desktop Computers', { exact: true });

  private assetNameTextbox() {
    return this.page.getByRole('textbox', { name: /Asset Name/i });
  }

  /** Client machine list Wijmo grid (Asset Name column). */
  private clientMachineAssetGrid() {
    return this.page.getByRole('grid').filter({
      has: this.page.getByRole('columnheader', { name: 'Asset Name' }),
    });
  }

  /** IA-011 purchase wizard asset search grid. */
  private purchaseWizardAssetGrid() {
    return this.page.getByRole('grid').filter({
      has: this.page.getByRole('columnheader', { name: 'Asset Name' }),
    });
  }

  private assetDataRowByName(grid: Locator, assetName: string) {
    const namePattern = new RegExp(`^\\s*${escapeRegExp(assetName)}\\s*$`);
    return grid.getByRole('row').filter({
      has: grid.getByRole('gridcell', { name: namePattern }),
    });
  }

  private async openComboboxNearLabel(labelText: string) {
    const label = this.page.getByText(labelText, { exact: true });
    await expect(label).toBeVisible({ timeout: 30_000 });
    const opened = await label.evaluate((el) => {
      let node: HTMLElement | null = el.parentElement;
      for (let depth = 0; depth < 10 && node; depth += 1) {
        const combo = node.querySelector('[role="combobox"]') as HTMLElement | null;
        if (combo) {
          combo.click();
          return true;
        }
        node = node.parentElement;
      }
      return false;
    });
    expect(opened).toBe(true);
  }

  private async clickDateInOpenCalendar(date: Date) {
    const calendar = this.page.getByRole('dialog', { name: 'Calendar' });
    await expect(calendar).toBeVisible({ timeout: 15_000 });

    const fullDateLabel = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const dayButton = calendar.getByRole('button', { name: fullDateLabel });
      if (await dayButton.isVisible().catch(() => false)) {
        await dayButton.click();
        return;
      }

      const targetMonth = date.getMonth();
      const targetYear = date.getFullYear();
      const displayed = await calendar.evaluate((cal) => {
        const monthSelect = cal.querySelector('.flatpickr-monthDropdown-months') as HTMLSelectElement | null;
        const yearInput = cal.querySelector('.numInput.cur-year') as HTMLInputElement | null;
        return {
          month: monthSelect ? Number.parseInt(monthSelect.value, 10) : Number.NaN,
          year: yearInput ? Number.parseInt(yearInput.value, 10) : Number.NaN,
        };
      });

      if (
        Number.isFinite(displayed.month) &&
        Number.isFinite(displayed.year) &&
        (displayed.year < targetYear || (displayed.year === targetYear && displayed.month < targetMonth))
      ) {
        const nextMonth = calendar.getByRole('button', { name: /next month/i });
        if (await nextMonth.isVisible().catch(() => false)) {
          await nextMonth.click();
          continue;
        }
      }

      if (
        Number.isFinite(displayed.month) &&
        Number.isFinite(displayed.year) &&
        (displayed.year > targetYear || (displayed.year === targetYear && displayed.month > targetMonth))
      ) {
        const prevMonth = calendar.getByRole('button', { name: /previous month/i });
        if (await prevMonth.isVisible().catch(() => false)) {
          await prevMonth.click();
          continue;
        }
      }

      break;
    }

    const retry = calendar.getByRole('button', { name: fullDateLabel });
    await expect(retry).toBeVisible({ timeout: 10_000 });
    await retry.click();
  }

  private async pickDateByPlaceholder(placeholder: string, date: Date) {
    const field = this.page.getByPlaceholder(placeholder);
    await expect(field).toBeVisible({ timeout: 15_000 });
    await field.click();
    await this.clickDateInOpenCalendar(date);
  }

  private async pickDateByLabel(label: string, date: Date) {
    const field = this.page.getByLabel(label);
    await expect(field).toBeVisible({ timeout: 15_000 });
    await field.click();
    await this.clickDateInOpenCalendar(date);
  }

  private async setGridScrollLeft(grid: Locator, scrollLeft: number) {
    await grid.evaluate((el, x) => {
      const root = el.querySelector('[wj-part="root"]') as HTMLElement | null;
      if (root) {
        root.scrollLeft = x;
      }
    }, scrollLeft);
  }

  private async gridMaxScrollLeft(grid: Locator): Promise<number> {
    return grid.evaluate((el) => {
      const root = el.querySelector('[wj-part="root"]') as HTMLElement | null;
      if (!root) {
        return 0;
      }
      return Math.max(0, root.scrollWidth - root.clientWidth);
    });
  }

  private async gridScrollLeft(grid: Locator): Promise<number> {
    return grid.evaluate((el) => {
      const root = el.querySelector('[wj-part="root"]') as HTMLElement | null;
      return root?.scrollLeft ?? 0;
    });
  }

  private async scrollToRevealColumnHeader(
    grid: Locator,
    columnText: string,
  ): Promise<Locator> {
    const header = grid.getByRole('columnheader', { name: columnText, exact: true });
    const max = await this.gridMaxScrollLeft(grid);
    const step = 280;

    for (let x = 0; x <= max + step; x += step) {
      await this.setGridScrollLeft(grid, Math.min(x, max));
      if (await header.isVisible().catch(() => false)) {
        await header.scrollIntoViewIfNeeded();
        return header;
      }
    }

    await this.setGridScrollLeft(grid, max);
    await header.scrollIntoViewIfNeeded().catch(() => {});
    return header;
  }

  private async scrollToRevealAcquisitionDateHeader(grid: Locator): Promise<Locator> {
    return this.scrollToRevealColumnHeader(grid, 'Acquisition Date');
  }

  private async scrollToRevealAssetNameCell(grid: Locator, cell: Locator): Promise<boolean> {
    const step = 280;
    const max = await this.gridMaxScrollLeft(grid);

    let x = await this.gridScrollLeft(grid);
    while (x >= 0) {
      await this.setGridScrollLeft(grid, x);
      if (await cell.isVisible().catch(() => false)) {
        await cell.scrollIntoViewIfNeeded();
        return true;
      }
      x -= step;
    }

    await this.setGridScrollLeft(grid, 0);
    if (await cell.isVisible().catch(() => false)) {
      await cell.scrollIntoViewIfNeeded();
      return true;
    }

    for (x = step; x <= max + step; x += step) {
      await this.setGridScrollLeft(grid, Math.min(x, max));
      if (await cell.isVisible().catch(() => false)) {
        await cell.scrollIntoViewIfNeeded();
        return true;
      }
    }

    await this.setGridScrollLeft(grid, 0);
    return await cell.isVisible().catch(() => false);
  }

  private async assetNameCellInGrid(grid: Locator, assetName: string): Promise<Locator> {
    const namePattern = new RegExp(`^\\s*${escapeRegExp(assetName)}\\s*$`);
    return grid.getByRole('gridcell', { name: namePattern });
  }

  private async expectAssetNameCellVisibleInGridAfterAcquisitionSort(
    grid: Locator,
    assetName: string,
  ): Promise<Locator> {
    await expect(grid).toBeVisible({ timeout: 60_000 });

    const cell = await this.assetNameCellInGrid(grid, assetName);

    const clickAcquisitionSort = async () => {
      const header = await this.scrollToRevealAcquisitionDateHeader(grid);
      await expect(header).toBeVisible({ timeout: 15_000 });
      await header.click();
    };

    await clickAcquisitionSort();
    if (await this.scrollToRevealAssetNameCell(grid, cell)) {
      await expect(cell).toBeVisible();
      return cell;
    }

    await clickAcquisitionSort();
    await this.scrollToRevealAssetNameCell(grid, cell);
    await expect(cell).toBeVisible({ timeout: 30_000 });
    return cell;
  }

  private async clickAutogeneratePaginationNext(): Promise<boolean> {
    const records = this.page.getByText(/\d+\s+records/);
    if (!(await records.isVisible().catch(() => false))) {
      return false;
    }

    return records.evaluate((el) => {
      const pagination = el.closest('.datagrid-pagination') ?? el.parentElement;
      const controller = pagination?.querySelector('.datagrid-pagination-controller');
      if (!controller) {
        return false;
      }
      const buttons = Array.from(controller.querySelectorAll('button.datagrid-pagination-button'));
      for (let i = buttons.length - 1; i >= 0; i -= 1) {
        const btn = buttons[i] as HTMLButtonElement;
        if (btn.querySelector('.fa-angle-right')) {
          btn.click();
          return true;
        }
      }
      return false;
    });
  }

  private async readMaxNextClicksFromAutogeneratePagination(): Promise<number> {
    const records = this.page.getByText(/\d+\s+records/);
    if (!(await records.isVisible().catch(() => false))) {
      return 0;
    }

    const lastPage = await records.evaluate((el) => {
      const pagination = el.closest('.datagrid-pagination') ?? el.parentElement;
      const list = pagination?.querySelector('.datagrid-pagination-button-list');
      if (!list) {
        return Number.NaN;
      }
      const buttons = Array.from(list.querySelectorAll('button'));
      if (buttons.length === 0) {
        return Number.NaN;
      }
      const lastLabel = (buttons[buttons.length - 1].textContent ?? '').trim();
      return Number.parseInt(lastLabel, 10);
    });

    if (!Number.isFinite(lastPage) || lastPage < 1) {
      return 5;
    }
    return Math.max(0, lastPage - 1);
  }

  private async clickBulkAssetRowChip(assetDisplayName: string) {
    const name = this.page.getByText(assetDisplayName, { exact: true });
    await expect(name).toBeVisible({ timeout: 60_000 });
    const clicked = await name.evaluate((el) => {
      const chip =
        el.closest('.field-warning') ??
        el.closest('.field-selected') ??
        el.closest('.field-button');
      if (chip instanceof HTMLElement) {
        chip.click();
        return true;
      }
      (el as HTMLElement).click();
      return true;
    });
    expect(clicked).toBe(true);
  }

  /** Same destination as hub → IT Asset → Office → Client Machine; avoids menu transitions blocking clicks. */
  async openClientMachineList() {
    await this.gotoItAssetManagementClientMachineDesktopListUrl();
    await expect(this.addAssetButton).toBeVisible({ timeout: 60_000 });
  }

  async startAddAsset() {
    await expect(this.addAssetButton).toBeVisible();
    await this.addAssetButton.click();
    await expect(this.desktopComputersCategory).toBeVisible({ timeout: 30_000 });
  }

  async selectCategoryDesktopComputers() {
    await this.desktopComputersCategory.click();
    await expect(this.assetNameTextbox()).toBeVisible({ timeout: 30_000 });
  }

  async fillAssetIdentity(params: {
    displayName: string;
    modelNumber: string;
    serialNumber: string;
    osVersion: string;
    ipAddress: string;
  }) {
    const assetName = this.assetNameTextbox();
    await assetName.click();
    await assetName.fill(params.displayName);

    await this.page.getByText('Select manufacturer', { exact: true }).click();
    await this.page.getByRole('option', { name: csiItAssetManufacturer }).click();

    const model = this.page.getByRole('textbox', { name: 'Enter model number' });
    await model.click();
    await model.fill(params.modelNumber);

    await this.page.getByText('Select OS', { exact: true }).click();
    await this.page.getByRole('option', { name: csiItAssetOperatingSystem }).click();

    const osVersionInput = this.page.getByRole('textbox', { name: 'Enter OS version' });
    await osVersionInput.click();
    await osVersionInput.fill(params.osVersion);

    const serial = this.page.getByRole('textbox', { name: 'Enter serial number' });
    await serial.click();
    await serial.fill(params.serialNumber);

    const ip = this.page.getByRole('textbox', { name: 'Enter IP address' });
    await ip.click();
    await ip.fill(params.ipAddress);
  }

  async fillAssetStateAndLocation(params: { location: string }) {
    await this.page.getByText('Select asset state', { exact: true }).click();
    await this.page.getByRole('option', { name: csiItAssetState }).click();

    const loc = this.page.getByRole('textbox', { name: 'Enter asset location' });
    await loc.click();
    await loc.fill(params.location);
  }

  async fillSupplierAndCommercial(params: {
    website: string;
    purchaseCost: string;
  }) {
    await this.page.getByText('Select supplier', { exact: true }).click();
    await this.page.getByRole('option', { name: csiItAssetSupplier }).click();

    const web = this.page.getByRole('textbox', { name: 'Enter website' });
    await web.click();
    await web.fill(params.website);

    await this.page.getByText('Select currency', { exact: true }).click();
    await this.page.getByRole('option', { name: csiItAssetCurrency }).click();

    const cost = this.page.getByPlaceholder('Enter purchase cost');
    await cost.click();
    await cost.fill(params.purchaseCost);
  }

  async pickPurchaseDateToday() {
    await this.pickDateByPlaceholder('Acquisition Date', new Date());
  }

  async pickWarrantyOrEndDateOneMonthFromToday() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    await this.pickDateByPlaceholder('Warranty Expiry Date', d);
  }

  async saveNewAsset() {
    await expect(this.saveButton).toBeVisible({ timeout: 15_000 });
    await this.saveButton.click();
  }

  /** IA-001: sort by Acquisition Date (horizontal scroll), assert asset name in grid; retry sort once. */
  async expectAssetVisibleInGridAfterAcquisitionSort(assetName: string) {
    const grid = this.clientMachineAssetGrid();
    await expect(grid).toBeVisible({ timeout: 60_000 });
    await this.expectAssetNameCellVisibleInGridAfterAcquisitionSort(grid, assetName);
  }

  /** IA-003: Client Machine bulk path (`categoryId=1` / `subCategoryId=1` desktop). */
  async gotoItAssetManagementClientMachineBulkUrl() {
    await this.page.goto(`${CSI_BASE_URL}/ITAssetManagement?categoryId=1&subCategoryId=1`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page.getByRole('button', { name: 'Bulk Upload Asset' })).toBeVisible({ timeout: 60_000 });
  }

  async startBulkUploadAsset() {
    await this.page.getByText('Desktop Computers').click();
    await this.page.waitForTimeout(3000);
    await this.page.getByRole('button', { name: 'Bulk Upload Asset' }).click();
    await expect(this.page.getByRole('button', { name: 'Download Template' })).toBeVisible({ timeout: 60_000 });
  }

  /** Persists download under `targetDir` with a safe filename; returns absolute path. */
  async downloadBulkAssetTemplateTo(targetDir: string): Promise<string> {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 120_000 });
    await this.page.getByRole('button', { name: 'Download Template' }).click();
    const download = await downloadPromise;
    const rawName = download.suggestedFilename() || 'bulk-template.xlsx';
    const safeBase = path.basename(rawName.replace(/[/\\]/g, '_'));
    const downloadPath = path.join(targetDir, safeBase);
    await download.saveAs(downloadPath);
    return downloadPath;
  }

  async uploadBulkCompletedTemplate(absolutePath: string) {
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.page.getByText('Upload completed template').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(absolutePath);
  }

  async expectBulkTemplateUploadedToast() {
    await expect(this.page.getByText('File uploaded successfully!')).toBeVisible({ timeout: 120_000 });
  }

  async clickBulkUploadContinueWhenEnabled() {
    const cont = this.page.getByRole('button', { name: 'Continue' });
    await expect(cont).toBeEnabled({ timeout: 120_000 });
    await cont.click();
  }

  async clickBulkAssetRowByName(assetDisplayName: string) {
    await this.clickBulkAssetRowChip(assetDisplayName);
  }

  async expectBulkAssetRowStatus(assetDisplayName: string, status: 'Missing Fields' | 'OK') {
    const name = this.page.getByText(assetDisplayName, { exact: true });
    await expect(name).toBeVisible({ timeout: 60_000 });
    const hasStatus = await name.evaluate((el, expectedStatus) => {
      const chip =
        el.closest('.field-warning') ??
        el.closest('.field-selected') ??
        el.closest('.field-button');
      return (chip?.textContent ?? '').includes(expectedStatus);
    }, status);
    expect(hasStatus).toBe(true);
  }

  async clickFirstMissingFieldsTag() {
    const mf = this.page.getByText('Missing Fields', { exact: true });
    await expect(mf).toBeVisible({ timeout: 30_000 });
    await mf.click();
  }

  async fillBulkAssetPurchaseCostAndSave(purchaseCost: string) {
    const cost = this.page.getByPlaceholder('Purchase Cost');
    await expect(cost).toBeVisible({ timeout: 60_000 });
    await cost.click();
    await cost.fill(purchaseCost);
    const saveLink = this.page.getByRole('link', { name: /Save/i });
    await expect(saveLink).toBeVisible({ timeout: 15_000 });
    await saveLink.click();
  }

  async importBulkAssetsAndExpectClientMachineListUrl() {
    const importBtn = this.page.getByRole('button', { name: 'Import Assets' });
    await expect(importBtn).toBeVisible({ timeout: 120_000 });
    await importBtn.click();
    await this.page.waitForURL(
      (url) => {
        try {
          const u = new URL(url);
          if (!u.pathname.includes('ITAssetManagement')) {
            return false;
          }
          return u.searchParams.get('categoryId') === '1' && u.searchParams.get('subCategoryId') === '1';
        } catch {
          return false;
        }
      },
      { timeout: 120_000 },
    );
  }

  /** IA-011: `/ITAssetPurchaseEdit` — wait until purpose field is ready. */
  async gotoItAssetPurchaseEditUrl() {
    await this.page.goto(`${CSI_BASE_URL}/ITAssetPurchaseEdit`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page.getByLabel('Purchase Purpose')).toBeVisible({ timeout: 60_000 });
  }

  async fillItAssetPurchasePurpose(purpose: string) {
    const input = this.page.getByLabel('Purchase Purpose');
    await input.click();
    await input.fill(purpose);
  }

  async pickItAssetPurchaseOrderDateToday() {
    await this.pickDateByLabel('Purchase Date', new Date());
  }

  async selectItAssetPurchaseSupplierByName(supplierName: string) {
    await this.openComboboxNearLabel('Supplier Name');
    await this.page.waitForTimeout(3000);
    const option = this.page.getByRole('option', { name: supplierName });
    await expect(option).toBeVisible({ timeout: 30_000 });
    await option.click();
  }

  async selectPurchaseWizardQuotationTab() {
    await this.page.getByText('Quotation', { exact: true }).click();
  }

  async selectPurchaseWizardDeliveryNotesTab() {
    await this.page.getByText('Delivery Notes', { exact: true }).click();
  }

  async selectPurchaseWizardPurchaseInvoicesTab() {
    await this.page.getByText('Purchase Invoices', { exact: true }).click();
  }

  /** Uploads one PDF for the active tab; asserts grid shows filename, then selects that cell (IA-011). */
  async uploadPurchaseWizardDocument(absolutePath: string, expectedFileNameInGrid: string) {
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    const uploadTrigger = this.page.getByText('Upload your file', { exact: true });
    await expect(uploadTrigger).toBeVisible({ timeout: 15_000 });
    await uploadTrigger.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(absolutePath);
    const cell = this.page.getByRole('gridcell', { name: expectedFileNameInGrid });
    await expect(cell).toBeVisible({ timeout: 120_000 });
    await cell.click();
  }

  async clickPurchaseWizardNext() {
    const next = this.page.getByRole('button', { name: 'Next' });
    await expect(next).toBeVisible({ timeout: 60_000 });
    await expect(next).toBeEnabled({ timeout: 120_000 });
    await next.click();
  }

  async clickPurchaseWizardSearchAsset() {
    const btn = this.page.getByRole('button', { name: 'Search Asset' });
    await expect(btn).toBeVisible({ timeout: 120_000 });
    await btn.click();
  }

  /** First three data rows — row-header checkboxes (Wijmo column selector). */
  async selectFirstThreePurchaseWizardAssetRows() {
    await this.page.waitForTimeout(3000);
    const grid = this.purchaseWizardAssetGrid();
    await expect(grid).toBeVisible({ timeout: 60_000 });

    const selected = await grid.evaluate((gridEl) => {
      const inputs = Array.from(
        gridEl.querySelectorAll('input.wj-column-selector[type="checkbox"]'),
      ) as HTMLInputElement[];
      let count = 0;
      for (const input of inputs) {
        if (count >= 3) {
          break;
        }
        const cell = input.closest('.wj-cell');
        if (cell?.getAttribute('role') === 'columnheader') {
          continue;
        }
        input.click();
        count += 1;
      }
      return count;
    });

    if (selected !== 3) {
      throw new Error(`IA-011: expected 3 asset rows with checkboxes; only ${selected} matched.`);
    }
  }

  async clickPurchaseWizardCreate() {
    const create = this.page.getByRole('button', { name: 'Create' });
    await expect(create).toBeVisible({ timeout: 120_000 });
    await expect(create).toBeEnabled({ timeout: 120_000 });
    await create.click();
  }

  /** IA-011: after Create, list route is `/ITAssetPurchase` (not `Edit`); remark visible. */
  async expectItAssetPurchaseListWithRemark(remark: string) {
    await this.page.waitForURL(
      (url) => {
        try {
          const p = new URL(url).pathname.replace(/\/$/, '');
          return p.includes('ITAssetPurchase') && !p.includes('ITAssetPurchaseEdit');
        } catch {
          return false;
        }
      },
      { timeout: 120_000 },
    );
    await expect(this.page.getByText(remark, { exact: true })).toBeVisible({ timeout: 60_000 });
  }

  /** IA-016: Client Machine desktop list (`categoryId=1` & `subCategoryId=1`). */
  async gotoItAssetManagementClientMachineDesktopListUrl() {
    await this.page.goto(`${CSI_BASE_URL}/ITAssetManagement?categoryId=1&subCategoryId=1`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.desktopComputersCategory).toBeVisible({ timeout: 60_000 });
  }

  /** IA-016: ensure category is active and runtime grid is present. */
  async clickDesktopComputersExpectClientMachineGrid() {
    await this.desktopComputersCategory.click();
    await expect(this.clientMachineAssetGrid()).toBeVisible({ timeout: 60_000 });
  }

  /** IA-016: first `Edit` in grid body. */
  async clickEditOnFirstClientMachineAssetRow() {
    const grid = this.clientMachineAssetGrid();
    await expect(grid).toBeVisible({ timeout: 60_000 });
    const firstDataRow = grid
      .getByRole('row')
      .filter({ hasNot: grid.getByRole('columnheader') })
      .first();
    const editBtn = firstDataRow.getByRole('button', { name: 'Edit' });
    await expect(editBtn).toBeVisible({ timeout: 60_000 });
    await editBtn.click();
  }

  /** IA-016: edit screen — Asset Name field ready. */
  async expectItAssetEditFormReady() {
    await expect(this.page.getByText('Asset Name:', { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(this.assetNameTextbox()).toBeVisible({ timeout: 30_000 });
  }

  async readItAssetEditFormAssetName(): Promise<string> {
    return (await this.assetNameTextbox().inputValue()).trim();
  }

  async readItAssetEditFormOsVersion(): Promise<string> {
    return (await this.page.getByRole('textbox', { name: 'Enter OS version' }).inputValue()).trim();
  }

  async fillItAssetEditFormAssetName(displayName: string) {
    const assetName = this.assetNameTextbox();
    await assetName.click();
    await assetName.fill(displayName);
  }

  async fillItAssetEditFormOsVersion(osVersion: string) {
    const osVersionInput = this.page.getByRole('textbox', { name: 'Enter OS version' });
    await osVersionInput.click();
    await osVersionInput.fill(osVersion);
  }

  /** IA-016: asset name cell visible after horizontal scroll (no Acquisition sort). */
  async expectClientMachineGridCellVisibleExact(exactCellText: string) {
    const grid = this.clientMachineAssetGrid();
    await expect(grid).toBeVisible({ timeout: 60_000 });
    const cell = await this.assetNameCellInGrid(grid, exactCellText);
    await this.scrollToRevealAssetNameCell(grid, cell);
    await expect(cell).toBeVisible({ timeout: 30_000 });
  }

  /**
   * IA-016: row for `assetNameExact` must show `osVersionExact` in a gridcell (scroll grid; do not click OS header).
   * Tries column label "OS Version", then "Operating System (OS)" for scroll alignment.
   */
  async expectClientMachineGridRowShowsOsVersionForAsset(assetNameExact: string, osVersionExact: string) {
    const grid = this.clientMachineAssetGrid();
    await expect(grid).toBeVisible({ timeout: 60_000 });
    const nameCell = await this.assetNameCellInGrid(grid, assetNameExact);
    await this.scrollToRevealAssetNameCell(grid, nameCell);
    await expect(nameCell).toBeVisible({ timeout: 30_000 });

    const row = this.assetDataRowByName(grid, assetNameExact);
    const osCell = row.getByRole('gridcell', { name: osVersionExact, exact: true });

    for (const columnLabel of ['OS Version', 'Operating System (OS)']) {
      await this.scrollToRevealColumnHeader(grid, columnLabel).catch(() => {});
      const max = await this.gridMaxScrollLeft(grid);
      for (let x = 0; x <= max + 280; x += 280) {
        await this.setGridScrollLeft(grid, Math.min(x, max));
        if (await osCell.isVisible().catch(() => false)) {
          await expect(osCell).toBeVisible();
          return;
        }
      }
    }
    await expect(osCell).toBeVisible({ timeout: 30_000 });
  }

  /**
   * IA-025: after save on desktop list — find row by `assetNameExact` using Acquisition Date sort + horizontal scroll,
   * then assert `osVersionExact` in that row (IA-016 OS scroll pattern).
   */
  async expectClientMachineGridRowShowsOsVersionForAssetAfterAcquisitionSortIa025(
    assetNameExact: string,
    osVersionExact: string,
  ): Promise<void> {
    const grid = this.clientMachineAssetGrid();
    const nameCell = await this.expectAssetNameCellVisibleInGridAfterAcquisitionSort(grid, assetNameExact);
    await expect(nameCell).toBeVisible({ timeout: 30_000 });

    const row = this.assetDataRowByName(grid, assetNameExact);
    const osCell = row.getByRole('gridcell', { name: osVersionExact, exact: true });

    for (const columnLabel of ['OS Version', 'Operating System (OS)']) {
      await this.scrollToRevealColumnHeader(grid, columnLabel).catch(() => {});
      const max = await this.gridMaxScrollLeft(grid);
      for (let x = 0; x <= max + 280; x += 280) {
        await this.setGridScrollLeft(grid, Math.min(x, max));
        if (await osCell.isVisible().catch(() => false)) {
          await expect(osCell).toBeVisible();
          return;
        }
      }
    }
    await expect(osCell).toBeVisible({ timeout: 30_000 });
  }

  /** IA-025: `Edit` on the row whose Asset Name cell matches `assetDisplayName`. */
  async clickEditOnClientMachineGridRowByAssetNameIa025(assetDisplayName: string): Promise<void> {
    const grid = this.clientMachineAssetGrid();
    await this.expectAssetNameCellVisibleInGridAfterAcquisitionSort(grid, assetDisplayName);
    const row = this.assetDataRowByName(grid, assetDisplayName);
    const editBtn = row.getByRole('button', { name: 'Edit' });
    await expect(editBtn).toBeVisible({ timeout: 15_000 });
    await editBtn.click();
  }

  /** IA-025: `View` on the row whose Asset Name cell matches `assetDisplayName`. */
  async clickViewOnClientMachineGridRowByAssetNameIa025(assetDisplayName: string): Promise<void> {
    const grid = this.clientMachineAssetGrid();
    await this.expectAssetNameCellVisibleInGridAfterAcquisitionSort(grid, assetDisplayName);
    const row = this.assetDataRowByName(grid, assetDisplayName);
    const viewBtn = row.getByRole('button', { name: 'View' });
    await expect(viewBtn).toBeVisible({ timeout: 15_000 });
    await viewBtn.click();
  }

  /**
   * IA-025: assign User on asset edit — open VirtualSelect near User label,
   * pick first non-placeholder option, return trimmed label for view assertion.
   */
  async selectFirstUserOnItAssetEditFormIa025(): Promise<string> {
    await this.openComboboxNearLabel('User');
    await this.page.waitForTimeout(3000);
    const options = this.page.getByRole('option');
    await expect(options.first()).toBeVisible({ timeout: 15_000 });
    const placeholder = /^(select|choose|please|--|…|\.{3}|enter user)$/i;
    const n = await options.count();
    for (let i = 0; i < n; i += 1) {
      const opt = options.nth(i);
      const label = (await opt.innerText()).replace(/\s+/g, ' ').trim();
      if (label.length > 0 && !placeholder.test(label)) {
        await opt.click();
        return label;
      }
    }
    throw new Error('IA-025: no non-placeholder option found in User dropdown');
  }

  /** IA-025: after `View`, assert assigned user (or any saved label) is shown on the read-only view. */
  async expectItAssetViewShowsTextIa025(expected: string): Promise<void> {
    const norm = expected.trim();
    await expect(this.page.getByText(norm, { exact: false })).toBeVisible({ timeout: 60_000 });
  }

  /** Create form: open Asset State, pick option by label, fill location (not fixed {@link csiItAssetState}). */
  async fillAssetStateAndLocationUsingStateOption(params: { location: string; stateOptionName: string }) {
    await this.page.getByText('Select asset state', { exact: true }).click();
    await this.page.getByRole('option', { name: params.stateOptionName, exact: true }).click();
    const loc = this.page.getByRole('textbox', { name: 'Enter asset location' });
    await loc.click();
    await loc.fill(params.location);
  }

  private async clickWijmoAcquisitionDateHeaderForSort(grid: Locator): Promise<void> {
    await this.scrollToRevealAcquisitionDateHeader(grid);
    await this.page.waitForTimeout(400);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const header = grid.getByRole('columnheader', { name: 'Acquisition Date', exact: true });
      if (!(await header.isVisible().catch(() => false))) {
        await this.scrollToRevealAcquisitionDateHeader(grid);
        await this.page.waitForTimeout(300);
        continue;
      }
      await header.scrollIntoViewIfNeeded();
      try {
        await header.click({ timeout: 10_000 });
        await this.page.waitForTimeout(250);
        return;
      } catch {
        await this.page.waitForTimeout(500);
      }
    }
    const headerLast = grid.getByRole('columnheader', { name: 'Acquisition Date', exact: true });
    await headerLast.scrollIntoViewIfNeeded();
    await headerLast.click({ force: true, timeout: 10_000 });
    await this.page.waitForTimeout(250);
  }

  /**
   * Client machine grid: find name `gridcell` — page 1 uses two Acquisition Date sorts
   * (each followed by horizontal scroll); then Next up to `maxNextClicks` from pagination (`lastPage − 1`);
   * later pages use horizontal scroll only.
   */
  private async findClientMachineAutogenerateGridCellByAssetName(assetName: string): Promise<Locator> {
    const grid = this.clientMachineAssetGrid();
    await expect(grid).toBeVisible({ timeout: 60_000 });

    const maxNextClicks = await this.readMaxNextClicksFromAutogeneratePagination();
    let nextClicks = 0;
    let useAcquisitionTwoPasses = true;

    while (true) {
      const cell = await this.assetNameCellInGrid(grid, assetName);

      if (useAcquisitionTwoPasses) {
        await this.clickWijmoAcquisitionDateHeaderForSort(grid);
        if (await this.scrollToRevealAssetNameCell(grid, cell)) {
          return cell;
        }
        await this.clickWijmoAcquisitionDateHeaderForSort(grid);
        if (await this.scrollToRevealAssetNameCell(grid, cell)) {
          return cell;
        }
      } else if (await this.scrollToRevealAssetNameCell(grid, cell)) {
        return cell;
      }

      if (nextClicks >= maxNextClicks) {
        break;
      }
      const clicked = await this.clickAutogeneratePaginationNext();
      if (!clicked) {
        break;
      }
      await this.page.waitForTimeout(600);
      nextClicks += 1;
      useAcquisitionTwoPasses = false;
    }

    throw new Error(
      `Client machine grid: asset "${assetName}" not found after two Acquisition sorts + scrolls on page 1 and up to ${maxNextClicks} Next click(s) (scroll-only on later pages; cap from pagination last page − 1)`,
    );
  }

  /** Assert the asset name cell exists (same resolution path as View). */
  async expectClientMachineAutogenerateGridShowsAssetName(assetName: string): Promise<void> {
    const cell = await this.findClientMachineAutogenerateGridCellByAssetName(assetName);
    await expect(cell).toBeVisible({ timeout: 10_000 });
  }

  /** Click row View on the client machine grid for `assetDisplayName`. */
  async clickViewOnClientMachineAutogenerateGridRowByAssetName(assetDisplayName: string): Promise<void> {
    await this.findClientMachineAutogenerateGridCellByAssetName(assetDisplayName);
    const grid = this.clientMachineAssetGrid();
    const row = this.assetDataRowByName(grid, assetDisplayName);
    const viewBtn = row.getByRole('button', { name: 'View' });
    await expect(viewBtn).toBeVisible({ timeout: 15_000 });
    await viewBtn.click();
  }

  /** Read-only IT asset view: Asset State shows `stateText`. */
  async expectItAssetDetailViewShowsAssetState(stateText: string): Promise<void> {
    await expect(this.page.getByText('Asset State', { exact: true })).toBeVisible({ timeout: 45_000 });
    await expect(this.page.getByText(stateText, { exact: true })).toBeVisible({ timeout: 45_000 });
  }

  /** IT asset read-only screen — Edit (toolbar, not grid row Edit). */
  async clickEditOnItAssetViewPage(): Promise<void> {
    const edit = this.page.getByRole('button', { name: 'Edit', exact: true });
    await expect(edit).toBeVisible({ timeout: 30_000 });
    await edit.click();
  }

  /** IT asset edit form: set Asset State to `stateName` (VirtualSelect / listbox option label). */
  async selectAssetStateOnItAssetEditForm(stateName: string): Promise<void> {
    const byPlaceholder = this.page.getByText('Select asset state', { exact: true });
    if (await byPlaceholder.isVisible().catch(() => false)) {
      await byPlaceholder.click();
    } else {
      await this.openComboboxNearLabel('Asset State');
    }
    await this.page.getByRole('option', { name: stateName, exact: true }).click();
  }
}
