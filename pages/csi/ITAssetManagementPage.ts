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
  readonly itAssetManagementNav = this.page.getByText('IT Asset Management', { exact: true });
  readonly officeNav = this.page.getByText('Office', { exact: true });
  readonly clientMachineLink = this.page.getByRole('link', { name: 'Client Machine' });
  readonly addAssetButton = this.page.getByRole('button', { name: 'Add Asset' });
  readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  readonly assetNameInput = this.page.locator('[id*="Input_assetsName"]').first();
  readonly desktopComputersCategory = this.page
    .locator('div.cat-btn')
    .filter({ hasText: 'Desktop Computers' })
    .first();

  /** Date widgets: stable `_16` / `_17` id suffix; `-b10-b2-Input` or legacy `InputWithIconWrapper`. */
  private readonly acquisitionDateWrapper = this.page.locator(
    'div.input-with-icon-input[id*="_16-b10-b2-Input"], [id*="_16-b10-b2-InputWithIconWrapper"]',
  );
  private readonly warrantyDateWrapper = this.page.locator(
    'div.input-with-icon-input[id*="_17-b10-b2-Input"], [id*="_17-b10-b2-InputWithIconWrapper"]',
  );
  /** IA-011: Purchase Date uses `#Input_purchaseDate` inside flatpickr (see IA-011.txt). */
  private readonly purchaseOrderDateWrapper = this.page
    .locator('div.input-with-icon-input')
    .filter({ has: this.page.locator('#Input_purchaseDate') });

  async openClientMachineList() {
    await this.waitForElement(this.itAssetManagementNav);
    await this.itAssetManagementNav.click();
    await expect(this.officeNav).toBeVisible({ timeout: 15_000 });
    await this.officeNav.click();
    await expect(this.clientMachineLink).toBeVisible({ timeout: 15_000 });
    await this.clientMachineLink.click();
    await expect(this.addAssetButton).toBeVisible({ timeout: 60_000 });
  }

  async startAddAsset() {
    await expect(this.addAssetButton).toBeVisible();
    await this.addAssetButton.click();
    await expect(this.desktopComputersCategory).toBeVisible({ timeout: 30_000 });
  }

  async selectCategoryDesktopComputers() {
    await this.desktopComputersCategory.click();
    await expect(this.assetNameInput).toBeVisible({ timeout: 30_000 });
  }

  async fillAssetIdentity(params: {
    displayName: string;
    modelNumber: string;
    serialNumber: string;
    osVersion: string;
    ipAddress: string;
  }) {
    await this.assetNameInput.click();
    await this.assetNameInput.fill(params.displayName);

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

  /** OS date picker: `flatpickr-input[type=date]` + readonly combobox; `_flatpickr.setDate` or `value` + events. */
  private async setFlatpickrDateDirectOnWrapper(wrapper: Locator, date: Date) {
    await expect(wrapper.first()).toBeAttached({ timeout: 15_000 });
    await wrapper.first().evaluate((el, timeMs: number) => {
      const target = new Date(timeMs);
      const y = target.getFullYear();
      const m = String(target.getMonth() + 1).padStart(2, '0');
      const day = String(target.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${day}`;

      type FlatpickrApi = {
        setDate: (d: Date, triggerChange?: boolean) => void;
        close?: () => void;
      };
      const fpFrom = (node: Element | null) =>
        node ? (node as unknown as { _flatpickr?: FlatpickrApi })._flatpickr : undefined;

      const dateInput =
        (el.querySelector('input.flatpickr-input[type="date"]') as HTMLInputElement | null) ??
        (el.querySelector('input.flatpickr-input') as HTMLInputElement | null);
      const altDisplay =
        (el.querySelector('input[role="combobox"][type="text"]') as HTMLInputElement | null) ??
        (el.querySelector('span.input-text input.input[type="text"]') as HTMLInputElement | null);

      if (dateInput == null && altDisplay == null) {
        throw new Error('No date inputs inside wrapper');
      }

      const fp = fpFrom(dateInput) ?? fpFrom(altDisplay);
      if (fp?.setDate) {
        fp.setDate(target, true);
        fp.close?.();
        return;
      }

      if (dateInput) {
        dateInput.value = iso;
        dateInput.dispatchEvent(new Event('input', { bubbles: true }));
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        dateInput.dispatchEvent(new Event('blur', { bubbles: true }));
      }
      if (altDisplay) {
        altDisplay.removeAttribute('readonly');
        altDisplay.value = iso;
        altDisplay.dispatchEvent(new Event('input', { bubbles: true }));
        altDisplay.dispatchEvent(new Event('change', { bubbles: true }));
        altDisplay.dispatchEvent(new Event('blur', { bubbles: true }));
        altDisplay.setAttribute('readonly', 'readonly');
      }
    }, date.getTime());
  }

  async pickPurchaseDateToday() {
    await this.setFlatpickrDateDirectOnWrapper(this.acquisitionDateWrapper, new Date());
  }

  async pickWarrantyOrEndDateOneMonthFromToday() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    await this.setFlatpickrDateDirectOnWrapper(this.warrantyDateWrapper, d);
  }

  async saveNewAsset() {
    await expect(this.saveButton).toBeVisible({ timeout: 15_000 });
    await this.saveButton.click();
  }

  /** Live grid is `.datagrid-runtime`; ignore `.datagrid-autogenerate-ss` design markup. */
  private clientMachineGridRuntime() {
    return this.page.locator('.datagrid-autogenerate .datagrid-runtime').first();
  }

  private async setGridScrollLeft(scrollRoot: Locator, scrollLeft: number) {
    await scrollRoot.evaluate((el, x) => {
      el.scrollLeft = x;
    }, scrollLeft);
  }

  private async gridMaxScrollLeft(scrollRoot: Locator): Promise<number> {
    return scrollRoot.evaluate((el) => Math.max(0, el.scrollWidth - el.clientWidth));
  }

  private async gridScrollLeft(scrollRoot: Locator): Promise<number> {
    return scrollRoot.evaluate((el) => el.scrollLeft);
  }

  /** Increase `wj-part=root` scrollLeft until `chcells` shows Acquisition Date. */
  private async scrollToRevealAcquisitionDateHeader(runtime: Locator, scrollRoot: Locator): Promise<Locator> {
    const header = runtime.locator('[wj-part="chcells"]').getByText('Acquisition Date', { exact: true }).first();
    await expect(scrollRoot).toBeAttached({ timeout: 30_000 });

    const max = await this.gridMaxScrollLeft(scrollRoot);
    const step = 280;

    for (let x = 0; x <= max + step; x += step) {
      await this.setGridScrollLeft(scrollRoot, Math.min(x, max));
      if (await header.isVisible().catch(() => false)) {
        await header.scrollIntoViewIfNeeded();
        return header;
      }
    }

    await this.setGridScrollLeft(scrollRoot, max);
    await header.scrollIntoViewIfNeeded().catch(() => {});
    return header;
  }

  /** Find asset cell: scroll left from current position, then 0→max if still hidden. */
  private async scrollToRevealAssetNameCell(scrollRoot: Locator, cell: Locator): Promise<boolean> {
    const step = 280;
    const max = await this.gridMaxScrollLeft(scrollRoot);

    let x = await this.gridScrollLeft(scrollRoot);
    while (x >= 0) {
      await this.setGridScrollLeft(scrollRoot, x);
      if (await cell.isVisible().catch(() => false)) {
        await cell.scrollIntoViewIfNeeded();
        return true;
      }
      x -= step;
    }

    await this.setGridScrollLeft(scrollRoot, 0);
    if (await cell.isVisible().catch(() => false)) {
      await cell.scrollIntoViewIfNeeded();
      return true;
    }

    for (x = step; x <= max + step; x += step) {
      await this.setGridScrollLeft(scrollRoot, Math.min(x, max));
      if (await cell.isVisible().catch(() => false)) {
        await cell.scrollIntoViewIfNeeded();
        return true;
      }
    }

    await this.setGridScrollLeft(scrollRoot, 0);
    return await cell.isVisible().catch(() => false);
  }

  /** IA-001: sort by Acquisition Date (horizontal scroll), assert asset name in `wj-part=cells`; retry sort once. */
  async expectAssetVisibleInGridAfterAcquisitionSort(assetName: string) {
    await expect(this.page.locator('.datagrid-autogenerate, [id*="datagrid_autogenerate"]')).toBeVisible({
      timeout: 60_000,
    });

    const runtime = this.clientMachineGridRuntime();
    await expect(runtime).toBeVisible({ timeout: 60_000 });

    const scrollRoot = runtime.locator('div[wj-part="root"]').first();
    await expect(scrollRoot).toBeAttached({ timeout: 30_000 });

    const namePattern = new RegExp(`^\\s*${escapeRegExp(assetName)}\\s*$`);
    const cell = runtime.locator('[wj-part="cells"]').getByRole('gridcell').filter({ hasText: namePattern }).first();

    const clickAcquisitionSort = async () => {
      const header = await this.scrollToRevealAcquisitionDateHeader(runtime, scrollRoot);
      await expect(header).toBeVisible({ timeout: 15_000 });
      await header.click();
    };

    await clickAcquisitionSort();
    if (await this.scrollToRevealAssetNameCell(scrollRoot, cell)) {
      await expect(cell).toBeVisible();
      return;
    }

    await clickAcquisitionSort();
    await this.scrollToRevealAssetNameCell(scrollRoot, cell);
    await expect(cell).toBeVisible({ timeout: 30_000 });
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
    await this.page.getByText('Upload completed template').click();
    const fileInput = this.page.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached({ timeout: 15_000 });
    await fileInput.setInputFiles(absolutePath);
  }

  async expectBulkTemplateUploadedToast() {
    await expect(this.page.getByText('File uploaded successfully!')).toBeVisible({ timeout: 120_000 });
  }

  async clickBulkUploadContinueWhenEnabled() {
    const cont = this.page.getByRole('button', { name: 'Continue' });
    await expect(cont).toBeEnabled({ timeout: 120_000 });
    await cont.click();
  }

  private bulkAssetButtonByName(assetDisplayName: string): Locator {
    return this.page
      .locator('div.field-warning.field-button, div.field-selected.field-button')
      .filter({ has: this.page.getByText(assetDisplayName, { exact: true }) })
      .first();
  }

  async clickBulkAssetRowByName(assetDisplayName: string) {
    const btn = this.bulkAssetButtonByName(assetDisplayName);
    await expect(btn).toBeVisible({ timeout: 60_000 });
    await btn.click();
  }

  async expectBulkAssetRowStatus(assetDisplayName: string, status: 'Missing Fields' | 'OK') {
    const btn = this.bulkAssetButtonByName(assetDisplayName);
    await expect(btn.getByText(status, { exact: true })).toBeVisible({ timeout: 90_000 });
  }

  async clickFirstMissingFieldsTag() {
    const mf = this.page.getByText('Missing Fields', { exact: true }).first();
    await expect(mf).toBeVisible({ timeout: 30_000 });
    await mf.click();
  }

  async fillBulkAssetPurchaseCostAndSave(purchaseCost: string) {
    const cost = this.page.getByPlaceholder('Purchase Cost');
    await expect(cost).toBeVisible({ timeout: 60_000 });
    await cost.click();
    await cost.fill(purchaseCost);
    const saveLink = this.page.getByRole('link', { name: /Save/i }).first();
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
    await expect(this.page.locator('#Input_purpose')).toBeVisible({ timeout: 60_000 });
  }

  async fillItAssetPurchasePurpose(purpose: string) {
    const input = this.page.locator('#Input_purpose');
    await input.click();
    await input.fill(purpose);
  }

  async pickItAssetPurchaseOrderDateToday() {
    await this.setFlatpickrDateDirectOnWrapper(this.purchaseOrderDateWrapper, new Date());
  }

  /** IA-011: Supplier Name — wait, open VirtualSelect (arrow is `::after`; use `.vscomp-toggle-button`), then option. */
  async selectItAssetPurchaseSupplierByName(supplierName: string) {
    const vendorRoot = this.page.locator('[id*="VendorDropdown"]').first();
    await expect(vendorRoot).toBeVisible({ timeout: 30_000 });
    await this.page.waitForTimeout(3000);
    const toggle = vendorRoot.locator('.vscomp-toggle-button').first();
    await expect(toggle).toBeVisible({ timeout: 15_000 });
    await toggle.click();
    const option = this.page.getByRole('option', { name: supplierName }).first();
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
    await this.page.getByText('Upload your file', { exact: true }).first().click();
    const fileInput = this.page.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached({ timeout: 15_000 });
    await fileInput.setInputFiles(absolutePath);
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

  /** First three data rows — Wijmo row selector: `input` is not tab-focusable; click the wrapping `wj-cell` (see `wj-column-selector`). */
  async selectFirstThreePurchaseWizardAssetRows() {
    await this.page.waitForTimeout(3000);
    await expect(this.page.locator('[wj-part="cells"]').first()).toBeVisible({ timeout: 60_000 });
    const rows = this.page.locator('[wj-part="cells"] div.wj-row');
    const rowCount = await rows.count();
    let selected = 0;
    for (let i = 0; i < rowCount && selected < 3; i += 1) {
      const row = rows.nth(i);
      if ((await row.locator('[role="gridcell"]').count()) === 0) {
        continue;
      }
      if ((await row.locator('[role="columnheader"]').count()) > 0) {
        continue;
      }
      const checkboxCells = row.locator('div.wj-cell:has(input[type="checkbox"])');
      const n = await checkboxCells.count();
      if (n > 0) {
        const cell = checkboxCells.first();
        await cell.scrollIntoViewIfNeeded();
        await cell.click();
      } else {
        await row.locator('[role="gridcell"]').first().scrollIntoViewIfNeeded();
        await row.locator('[role="gridcell"]').first().click();
      }
      selected += 1;
    }
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
}
