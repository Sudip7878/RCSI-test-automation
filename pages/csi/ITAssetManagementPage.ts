/// <reference lib="dom" />
import { expect, type Locator } from '@playwright/test';
import * as path from 'path';
import { CSI_BASE_URL } from '../../config/csi';
import {
  csiItAssetCurrency,
  csiItAssetManufacturer,
  csiItAssetOperatingSystem,
  csiItAssetState,
} from '../../utils/csi/itAssetManagementTestData';
import { BasePage } from '../BasePage';

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type ItAssetIdentityParams = {
  displayName: string;
  modelNumber: string;
  serialNumber: string;
  osVersion: string;
  ipAddress: string;
};

export class CsiItAssetManagementPage extends BasePage {
  readonly addAssetButton = this.page.getByRole('button', { name: 'Add Asset' });
  readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  readonly assetNameInput = this.page.locator('[id*="Input_assetsName"]').first();
  readonly desktopComputersCategory = this.page.getByText('Desktop Computers', { exact: true }).first();
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

  /** Same destination as hub ΓåÆ IT Asset ΓåÆ Office ΓåÆ Client Machine; avoids menu transitions blocking clicks. */
  async openClientMachineList() {
    await this.gotoItAssetManagementClientMachineDesktopListUrl();
    await expect(this.addAssetButton).toBeVisible({ timeout: 60_000 });
  }

  async startAddAsset() {
    await expect(this.addAssetButton).toBeVisible();
    await this.addAssetButton.click();
    await expect(this.desktopComputersCategory).toBeVisible({ timeout: 30_000 });
  }

  /** IA-001 / IA-025: wait 3s for Asset Name; reload list URL and reopen form if still missing. */
  async selectCategoryDesktopComputers(): Promise<void> {
    await this.desktopComputersCategory.click();
    await this.page.waitForTimeout(3000);
    if (await this.assetNameInput.isVisible().catch(() => false)) {
      return;
    }
    await this.reopenAndOpenAddAssetClientMachineForm(false);
    if (await this.assetNameInput.isVisible().catch(() => false)) {
      return;
    }
    await expect(this.assetNameInput).toBeVisible({ timeout: 30_000 });
  }

  /** IA-020: open Add Asset wizard without requiring category tabs (may land on Client Machine form). */
  async startAddAssetIa020(): Promise<void> {
    await expect(this.addAssetButton).toBeVisible();
    await this.addAssetButton.click();
    await this.page.waitForTimeout(3000);
  }

  private async waitForAssetNameAfterCategoryIa020(): Promise<boolean> {
    if (await this.desktopComputersCategory.isVisible().catch(() => false)) {
      await this.desktopComputersCategory.click();
    }
    await this.page.waitForTimeout(3000);
    return this.assetNameInput.isVisible().catch(() => false);
  }

  /** Reload list URL and reopen Add Asset → Client Machine form (IA-001 vs IA-020 navigation). */
  private async reopenAndOpenAddAssetClientMachineForm(useIa020Navigation: boolean): Promise<void> {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.gotoItAssetManagementClientMachineDesktopListUrl();
    if (useIa020Navigation) {
      await this.startAddAssetIa020();
      if (!(await this.waitForAssetNameAfterCategoryIa020())) {
        await expect(this.assetNameInput).toBeVisible({ timeout: 30_000 });
      }
    } else {
      await this.startAddAsset();
      await this.selectCategoryDesktopComputers();
    }
  }

  /** IA-020: select Desktop Computers when shown; wait 3s for Asset Name, reload list URL if still missing. */
  async selectCategoryDesktopComputersIa020(): Promise<void> {
    if (await this.waitForAssetNameAfterCategoryIa020()) {
      return;
    }
    await this.reopenAndOpenAddAssetClientMachineForm(true);
    if (await this.waitForAssetNameAfterCategoryIa020()) {
      return;
    }
    await expect(this.assetNameInput).toBeVisible({ timeout: 30_000 });
  }

  private async waitForPostAssetNameFields(): Promise<boolean> {
    return this.itAssetInputFieldBlock('Manufacturer')
      .locator('.vscomp-toggle-button')
      .isVisible({ timeout: 3000 })
      .catch(() => false);
  }

  private async withAddAssetFormReloadIfFieldMissing(
    fieldLabel: string,
    identityParams: ItAssetIdentityParams,
    useIa020Navigation: boolean,
    retried: boolean,
    action: () => Promise<void>,
  ): Promise<void> {
    await this.page.waitForTimeout(3000);
    const fieldReady = await this.itAssetInputFieldBlock(fieldLabel)
      .locator('.vscomp-toggle-button')
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (!fieldReady) {
      if (retried) {
        await expect(this.itAssetInputFieldBlock(fieldLabel).locator('.vscomp-toggle-button')).toBeVisible({
          timeout: 30_000,
        });
      } else {
        await this.reopenAndOpenAddAssetClientMachineForm(useIa020Navigation);
        await this.fillAssetIdentityWithFormReloadRetry(identityParams, useIa020Navigation);
        return this.withAddAssetFormReloadIfFieldMissing(
          fieldLabel,
          identityParams,
          useIa020Navigation,
          true,
          action,
        );
      }
    }
    await action();
  }

  private itAssetInputFieldBlock(fieldLabel: string): Locator {
    return this.page
      .locator('div[data-block="ITassets.inputFields"]')
      .filter({ has: this.page.getByText(fieldLabel, { exact: true }) })
      .first();
  }

  private async optionsForOpenCombobox(combobox: Locator): Promise<Locator> {
    const panelId = await combobox.getAttribute('aria-controls');
    if (panelId) {
      const inPanel = this.page.locator(`#${panelId}`).locator('[role="option"], .vscomp-option');
      if ((await inPanel.count()) > 0) {
        return inPanel;
      }
    }
    const inDropbox = this.page.locator('.vscomp-dropbox:visible').locator('[role="option"], .vscomp-option');
    if ((await inDropbox.count()) > 0) {
      return inDropbox;
    }
    return this.page.getByRole('listbox').last().getByRole('option');
  }

  private async clickFirstNonPlaceholderVirtualSelectOption(options: Locator): Promise<string> {
    await expect(options.first()).toBeVisible({ timeout: 15_000 });
    const placeholder = /^(select|choose|please|--|…|\.\.\.)$/i;
    const n = await options.count();
    for (let i = 0; i < n; i++) {
      const opt = options.nth(i);
      const label = (await opt.innerText()).replace(/\s+/g, ' ').trim();
      if (label.length > 0 && !placeholder.test(label)) {
        await opt.click();
        return label;
      }
    }
    throw new Error('No selectable VirtualSelect option found');
  }

  /** IT Asset VirtualSelect: open field, pick first non-placeholder option (supplier list varies by tenant). */
  private async selectFirstVirtualSelectInItAssetField(fieldLabel: string): Promise<void> {
    const block = this.itAssetInputFieldBlock(fieldLabel);
    await expect(block).toBeVisible({ timeout: 30_000 });
    const combobox = block.locator('[role="combobox"]').first();
    await block.locator('.vscomp-toggle-button').first().click();
    await expect(combobox).toHaveAttribute('aria-expanded', 'true', { timeout: 15_000 });

    const options = await this.optionsForOpenCombobox(combobox);
    const chosen = await this.clickFirstNonPlaceholderVirtualSelectOption(options);
    await expect(block.locator('.vscomp-value')).toContainText(chosen, { timeout: 10_000 });
  }

  /**
   * IT Asset create/edit VirtualSelect: open via `.vscomp-toggle-button`, pick option in this field's listbox panel.
   */
  private async selectVirtualSelectInItAssetField(
    fieldLabel: string,
    optionName: string,
    exact = true,
  ): Promise<void> {
    const block = this.itAssetInputFieldBlock(fieldLabel);
    await expect(block).toBeVisible({ timeout: 30_000 });
    const combobox = block.locator('[role="combobox"]').first();
    await block.locator('.vscomp-toggle-button').first().click();
    await expect(combobox).toHaveAttribute('aria-expanded', 'true', { timeout: 15_000 });

    const options = await this.optionsForOpenCombobox(combobox);
    const option = options.filter({ hasText: optionName }).first();
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.click();

    if (exact) {
      await expect(block.locator('.vscomp-value')).toHaveText(optionName, { timeout: 10_000 });
    } else {
      await expect(block.locator('.vscomp-value')).toContainText(optionName, { timeout: 10_000 });
    }
  }

  private async fillAssetIdentityDetails(params: {
    modelNumber: string;
    serialNumber: string;
    osVersion: string;
    ipAddress: string;
  }): Promise<void> {
    await this.selectVirtualSelectInItAssetField('Manufacturer', csiItAssetManufacturer);

    const model = this.page.getByRole('textbox', { name: 'Enter model number' });
    await model.click();
    await model.fill(params.modelNumber);

    await this.selectVirtualSelectInItAssetField('Operating System (OS)', csiItAssetOperatingSystem);

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

  /**
   * Fill identity from Asset Name; reload and retry once if Basic Information fields are not ready.
   */
  private async fillAssetIdentityWithFormReloadRetry(
    params: ItAssetIdentityParams,
    useIa020Navigation: boolean,
    retried = false,
  ): Promise<void> {
    await this.assetNameInput.click();
    await this.assetNameInput.fill(params.displayName);

    if (!(await this.waitForPostAssetNameFields())) {
      if (retried) {
        await expect(this.itAssetInputFieldBlock('Manufacturer').locator('.vscomp-toggle-button')).toBeVisible({
          timeout: 30_000,
        });
      } else {
        await this.reopenAndOpenAddAssetClientMachineForm(useIa020Navigation);
        return this.fillAssetIdentityWithFormReloadRetry(params, useIa020Navigation, true);
      }
    }

    await this.page.waitForTimeout(3000);
    await this.fillAssetIdentityDetails(params);
  }

  async fillAssetIdentity(params: ItAssetIdentityParams) {
    await this.fillAssetIdentityWithFormReloadRetry(params, false);
  }

  /** IA-020: same reload/retry as IA-001 with IA-020 Add Asset navigation. */
  async fillAssetIdentityIa020(params: ItAssetIdentityParams, retried = false): Promise<void> {
    await this.fillAssetIdentityWithFormReloadRetry(params, true, retried);
  }

  async fillAssetStateAndLocation(
    params: { location: string },
    identityParams?: ItAssetIdentityParams,
    useIa020Navigation = false,
    retried = false,
  ): Promise<void> {
    const fill = async () => {
      await this.selectVirtualSelectInItAssetField('Asset State', csiItAssetState);
      const loc = this.page.getByRole('textbox', { name: 'Enter asset location' });
      await loc.click();
      await loc.fill(params.location);
    };

    if (identityParams) {
      await this.withAddAssetFormReloadIfFieldMissing(
        'Asset State',
        identityParams,
        useIa020Navigation,
        retried,
        fill,
      );
      return;
    }

    await fill();
  }

  async fillSupplierAndCommercial(
    params: { website: string; purchaseCost: string },
    identityParams?: ItAssetIdentityParams,
    useIa020Navigation = false,
    retried = false,
  ): Promise<void> {
    const fill = async () => {
      await this.selectFirstVirtualSelectInItAssetField('Supplier Name');

      const web = this.page.getByRole('textbox', { name: 'Enter website' });
      await web.click();
      await web.fill(params.website);

      await this.selectVirtualSelectInItAssetField('Currency', csiItAssetCurrency, false);

      const cost = this.page.getByPlaceholder('Enter purchase cost');
      await cost.click();
      await cost.fill(params.purchaseCost);
    };

    if (identityParams) {
      await this.withAddAssetFormReloadIfFieldMissing(
        'Supplier Name',
        identityParams,
        useIa020Navigation,
        retried,
        fill,
      );
      return;
    }

    await fill();
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

  /**
   * IA-016 desktop list: HTML shows `datagrid-runtime` without a `.datagrid-autogenerate` ancestor
   * (recorded-steps/ITAssetManagement/IA-016.txt). Do not use for IA-001 grid assertions.
   */
  private clientMachineGridRuntimeIa016() {
    return this.page.locator('.datagrid-runtime').first();
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

  private async scrollGridToLeftEdge(scrollRoot: Locator): Promise<void> {
    await expect(scrollRoot).toBeAttached({ timeout: 30_000 });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await this.setGridScrollLeft(scrollRoot, 0);
      await this.page.waitForTimeout(attempt === 0 ? 150 : 250);
      if ((await this.gridScrollLeft(scrollRoot)) <= 2) {
        return;
      }
    }
    await this.setGridScrollLeft(scrollRoot, 0);
  }

  private async scrollToRevealAssetNameCell(scrollRoot: Locator, cell: Locator): Promise<boolean> {
    const step = 280;
    const max = await this.gridMaxScrollLeft(scrollRoot);

    const tryReveal = async (): Promise<boolean> => {
      if (await cell.isVisible().catch(() => false)) {
        await cell.scrollIntoViewIfNeeded();
        return true;
      }
      return false;
    };

    await this.scrollGridToLeftEdge(scrollRoot);
    if (await tryReveal()) {
      return true;
    }

    for (let x = step; x <= max + step; x += step) {
      await this.setGridScrollLeft(scrollRoot, Math.min(x, max));
      await this.page.waitForTimeout(80);
      if (await tryReveal()) {
        return true;
      }
    }

    let x = await this.gridScrollLeft(scrollRoot);
    while (x > 0) {
      x = Math.max(0, x - step);
      await this.setGridScrollLeft(scrollRoot, x);
      await this.page.waitForTimeout(80);
      if (await tryReveal()) {
        return true;
      }
    }

    await this.scrollGridToLeftEdge(scrollRoot);
    return await tryReveal();
  }

  /**
   * Horizontal scroll to Acquisition Date header, click to sort (twice if needed), then scroll until Asset Name
   * cell matches `assetName`. Shared by IA-001 (`clientMachineGridRuntime`) and IA-025 desktop list (`clientMachineGridRuntimeIa016`).
   */
  private async expectAssetNameCellVisibleInRuntimeGridAfterAcquisitionSort(
    runtime: Locator,
    assetName: string,
  ): Promise<Locator> {
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
      return cell;
    }

    await clickAcquisitionSort();
    await this.scrollToRevealAssetNameCell(scrollRoot, cell);
    await expect(cell).toBeVisible({ timeout: 30_000 });
    return cell;
  }

  /** IA-001 / IA-025 create: Acquisition Date sort, paginate, assert asset name in grid. */
  async expectAssetVisibleInGridAfterAcquisitionSort(assetName: string) {
    const cell = await this.findClientMachineAutogenerateGridCellByAssetName(assetName);
    await expect(cell).toBeVisible({ timeout: 10_000 });
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

  /** IA-011: `/ITAssetPurchaseEdit` ΓÇö wait until purpose field is ready. */
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

  /** IA-011: Supplier Name ΓÇö wait, open VirtualSelect (arrow is `::after`; use `.vscomp-toggle-button`), then option. */
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
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.page.getByText('Upload your file', { exact: true }).first().click();
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

  /** First three data rows ΓÇö Wijmo row selector: `input` is not tab-focusable; click the wrapping `wj-cell` (see `wj-column-selector`). */
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

  /** IA-016: Client Machine desktop list (`categoryId=1` & `subCategoryId=1`). */
  async gotoItAssetManagementClientMachineDesktopListUrl() {
    await this.page.goto(`${CSI_BASE_URL}/ITAssetManagement?categoryId=1&subCategoryId=1`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.addAssetButton).toBeVisible({ timeout: 60_000 });
  }

  /** IA-016: ensure category is active and runtime grid is present (Wijmo under `.datagrid-runtime`). */
  async clickDesktopComputersExpectClientMachineGrid() {
    await this.desktopComputersCategory.click();
    await expect(this.clientMachineGridRuntimeIa016()).toBeVisible({ timeout: 60_000 });
  }

  /** IA-016: first `Edit` in grid body (`wj-cell-maker` per IA-016.txt); avoid row `filter` + runtime-wide `has`. */
  async clickEditOnFirstClientMachineAssetRow() {
    const runtime = this.clientMachineGridRuntimeIa016();
    await expect(runtime).toBeVisible({ timeout: 60_000 });
    const cells = runtime.locator('[wj-part="cells"]').first();
    await expect(cells).toBeAttached({ timeout: 30_000 });
    const editBtn = cells.locator('button.wj-cell-maker').filter({ hasText: /^Edit$/ }).first();
    await expect(editBtn).toBeVisible({ timeout: 60_000 });
    await editBtn.click();
  }

  /** IA-016: edit screen ΓÇö `Asset Name:` label then name input (IDs vary by screen). */
  async expectItAssetEditFormReady() {
    const label = this.page.getByText('Asset Name:', { exact: true });
    await expect(label).toBeVisible({ timeout: 60_000 });
    await label.click();
    await expect(this.assetNameInput).toBeVisible({ timeout: 30_000 });
  }

  async readItAssetEditFormAssetName(): Promise<string> {
    return (await this.assetNameInput.inputValue()).trim();
  }

  async readItAssetEditFormOsVersion(): Promise<string> {
    return (await this.page.getByRole('textbox', { name: 'Enter OS version' }).inputValue()).trim();
  }

  async fillItAssetEditFormAssetName(displayName: string) {
    await this.assetNameInput.click();
    await this.assetNameInput.fill(displayName);
  }

  async fillItAssetEditFormOsVersion(osVersion: string) {
    const osVersionInput = this.page.getByRole('textbox', { name: 'Enter OS version' });
    await osVersionInput.click();
    await osVersionInput.fill(osVersion);
  }

  /** IA-016: horizontal scroll only ΓÇö do not click OS Version header. */
  private async scrollToRevealColumnHeaderInChcells(
    runtime: Locator,
    scrollRoot: Locator,
    columnText: string,
  ): Promise<Locator> {
    const header = runtime.locator('[wj-part="chcells"]').getByText(columnText, { exact: true }).first();
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

  /** IA-016: asset name cell visible after horizontal scroll (no Acquisition sort). */
  async expectClientMachineGridCellVisibleExact(exactCellText: string) {
    const runtime = this.clientMachineGridRuntimeIa016();
    await expect(runtime).toBeVisible({ timeout: 60_000 });
    const scrollRoot = runtime.locator('div[wj-part="root"]').first();
    await expect(scrollRoot).toBeAttached({ timeout: 30_000 });
    const namePattern = new RegExp(`^\\s*${escapeRegExp(exactCellText)}\\s*$`);
    const cell = runtime.locator('[wj-part="cells"]').getByRole('gridcell').filter({ hasText: namePattern }).first();
    await this.scrollToRevealAssetNameCell(scrollRoot, cell);
    await expect(cell).toBeVisible({ timeout: 30_000 });
  }

  /**
   * IA-016: row for `assetNameExact` must show `osVersionExact` in a gridcell (scroll grid; do not click OS header).
   * Tries column label "OS Version", then "Operating System (OS)" for scroll alignment.
   */
  async expectClientMachineGridRowShowsOsVersionForAsset(assetNameExact: string, osVersionExact: string) {
    const runtime = this.clientMachineGridRuntimeIa016();
    await expect(runtime).toBeVisible({ timeout: 60_000 });
    const scrollRoot = runtime.locator('div[wj-part="root"]').first();
    const namePattern = new RegExp(`^\\s*${escapeRegExp(assetNameExact)}\\s*$`);
    const nameCell = runtime.locator('[wj-part="cells"]').getByRole('gridcell').filter({ hasText: namePattern }).first();
    await this.scrollToRevealAssetNameCell(scrollRoot, nameCell);
    await expect(nameCell).toBeVisible({ timeout: 30_000 });

    const row = nameCell.locator('xpath=./ancestor::div[contains(@class,"wj-row")][1]');
    const osCell = row.getByRole('gridcell', { name: osVersionExact, exact: true });

    for (const columnLabel of ['OS Version', 'Operating System (OS)']) {
      await this.scrollToRevealColumnHeaderInChcells(runtime, scrollRoot, columnLabel).catch(() => {});
      const max = await this.gridMaxScrollLeft(scrollRoot);
      for (let x = 0; x <= max + 280; x += 280) {
        await this.setGridScrollLeft(scrollRoot, Math.min(x, max));
        if (await osCell.isVisible().catch(() => false)) {
          await expect(osCell).toBeVisible();
          return;
        }
      }
    }
    await expect(osCell).toBeVisible({ timeout: 30_000 });
  }

  /**
   * IA-025: after save on desktop list ΓÇö find row by `assetNameExact` using Acquisition Date sort + horizontal scroll
   * (same as IA-001-style helper on this grid), then assert `osVersionExact` in that row (IA-016 OS scroll pattern).
   */
  async expectClientMachineGridRowShowsOsVersionForAssetAfterAcquisitionSortIa025(
    assetNameExact: string,
    osVersionExact: string,
  ): Promise<void> {
    const runtime = this.clientMachineGridRuntimeIa016();
    const nameCell = await this.findAssetNameCellInRuntimeGrid(runtime, assetNameExact);
    const scrollRoot = runtime.locator('div[wj-part="root"]').first();
    await expect(nameCell).toBeVisible({ timeout: 30_000 });

    const row = nameCell.locator('xpath=./ancestor::div[contains(@class,"wj-row")][1]');
    const osCell = row.getByRole('gridcell', { name: osVersionExact, exact: true });

    for (const columnLabel of ['OS Version', 'Operating System (OS)']) {
      await this.scrollToRevealColumnHeaderInChcells(runtime, scrollRoot, columnLabel).catch(() => {});
      const max = await this.gridMaxScrollLeft(scrollRoot);
      for (let x = 0; x <= max + 280; x += 280) {
        await this.setGridScrollLeft(scrollRoot, Math.min(x, max));
        if (await osCell.isVisible().catch(() => false)) {
          await expect(osCell).toBeVisible();
          return;
        }
      }
    }
    await expect(osCell).toBeVisible({ timeout: 30_000 });
  }

  /**
   * IA-025: same acquisition-date sort + horizontal scroll + name visibility as IA-001, on the desktop list
   * Wijmo grid (`clientMachineGridRuntimeIa016`), then return the name cell for Edit/View.
   */
  private async ia025ScrollToAssetNameCellInDesktopListGrid(assetDisplayName: string): Promise<Locator> {
    return this.findAssetNameCellInRuntimeGrid(this.clientMachineGridRuntimeIa016(), assetDisplayName);
  }

  /** IA-025: `Edit` on the row whose Asset Name cell matches `assetDisplayName`. */
  async clickEditOnClientMachineGridRowByAssetNameIa025(assetDisplayName: string): Promise<void> {
    const runtime = this.clientMachineGridRuntimeIa016();
    const nameCell = await this.ia025ScrollToAssetNameCellInDesktopListGrid(assetDisplayName);
    const scrollRoot = runtime.locator('div[wj-part="root"]').first();
    await this.scrollGridToLeftEdge(scrollRoot);

    const row = nameCell.locator('xpath=./ancestor::div[contains(@class,"wj-row")][1]');
    const editBtn = row.locator('button.wj-cell-maker').filter({ hasText: /^Edit$/ });
    await editBtn.scrollIntoViewIfNeeded();
    await expect(editBtn).toBeVisible({ timeout: 15_000 });
    await editBtn.click();
  }

  /** IA-025: `View` on the row whose Asset Name cell matches `assetDisplayName`. */
  async clickViewOnClientMachineGridRowByAssetNameIa025(assetDisplayName: string): Promise<void> {
    const runtime = this.clientMachineGridRuntimeIa016();
    const nameCell = await this.ia025ScrollToAssetNameCellInDesktopListGrid(assetDisplayName);
    const scrollRoot = runtime.locator('div[wj-part="root"]').first();
    await this.scrollGridToLeftEdge(scrollRoot);

    const row = nameCell.locator('xpath=./ancestor::div[contains(@class,"wj-row")][1]');
    const viewBtn = row.locator('button.wj-cell-maker').filter({ hasText: /^View$/ });
    await viewBtn.scrollIntoViewIfNeeded();
    await expect(viewBtn).toBeVisible({ timeout: 15_000 });
    await viewBtn.click();
  }

  /**
   * IA-025: assign User on asset edit ΓÇö open VirtualSelect (`UserDropdown` or `User` + `.vscomp-toggle-button`),
   * pick first `option`, return trimmed label for view assertion.
   */
  async selectFirstUserOnItAssetEditFormIa025(): Promise<string> {
    const byVendorId = this.page.locator('[id*="UserDropdown"] .vscomp-toggle-button').first();
    const byLabel = this.page
      .locator('div[data-block="ITassets.inputFields"]')
      .filter({ has: this.page.getByText('User', { exact: true }) })
      .locator('.vscomp-toggle-button')
      .first();
    const toggle =
      (await byVendorId.isVisible().catch(() => false)) ? byVendorId : byLabel;
    await expect(toggle).toBeVisible({ timeout: 30_000 });
    // VirtualSelect options can hydrate after edit form paint; brief wait avoids empty/flickering list.
    await this.page.waitForTimeout(3000);
    await toggle.click();
    const options = this.page.getByRole('option');
    await expect(options.first()).toBeVisible({ timeout: 15_000 });
    const placeholder = /^(select|choose|please|--|ΓÇª|\.{3})$/i;
    const n = await options.count();
    for (let i = 0; i < n; i++) {
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
    await expect(this.page.getByText(norm, { exact: false }).first()).toBeVisible({ timeout: 60_000 });
  }

  /** Create form: open Asset State, pick option by label, fill location (not fixed {@link csiItAssetState}). */
  async fillAssetStateAndLocationUsingStateOption(
    params: { location: string; stateOptionName: string },
    identityParams?: ItAssetIdentityParams,
    useIa020Navigation = false,
    retried = false,
  ): Promise<void> {
    const fill = async () => {
      await this.selectVirtualSelectInItAssetField('Asset State', params.stateOptionName);
      const loc = this.page.getByRole('textbox', { name: 'Enter asset location' });
      await loc.click();
      await loc.fill(params.location);
    };

    if (identityParams) {
      await this.withAddAssetFormReloadIfFieldMissing(
        'Asset State',
        identityParams,
        useIa020Navigation,
        retried,
        fill,
      );
      return;
    }

    await fill();
  }

  /** IA-020: state/location with reload + identity refill if downstream fields are not ready. */
  async fillAssetStateAndLocationUsingStateOptionIa020(
    stateParams: { location: string; stateOptionName: string },
    identityParams: ItAssetIdentityParams,
    retried = false,
  ): Promise<void> {
    await this.fillAssetStateAndLocationUsingStateOption(
      stateParams,
      identityParams,
      true,
      retried,
    );
  }

  /** IA-020: supplier/commercial with reload + identity refill if fields are not ready. */
  async fillSupplierAndCommercialIa020(
    commercialParams: { website: string; purchaseCost: string },
    identityParams: ItAssetIdentityParams,
    retried = false,
  ): Promise<void> {
    await this.fillSupplierAndCommercial(commercialParams, identityParams, true, retried);
  }

  /** Next page control ΓÇö first gridΓÇÖs pagination block (angle icon). */
  private autogeneratePaginationNextButton(): Locator {
    return this.page
      .locator('.datagrid-pagination-controller')
      .first()
      .locator('[data-block="Pagination.ButtonNextPage"]')
      .getByRole('button')
      .first();
  }

  private autogeneratePaginationPreviousButton(): Locator {
    return this.page
      .locator('.datagrid-pagination-controller')
      .first()
      .locator('[data-block="Pagination.ButtonPreviousPage"]')
      .getByRole('button')
      .first();
  }

  /**
   * Rightmost page index in autogenerate `Pagination.ButtonList` (e.g. ΓÇª 4 ΓåÆ 4).
   * From page 1, at most `lastPage ΓêÆ 1` Next clicks; uses `getByRole('button')` on the strip.
   */
  private async readMaxNextClicksFromAutogeneratePagination(): Promise<number> {
    const list = this.page
      .locator('.datagrid-pagination-controller')
      .first()
      .locator('[data-block="Pagination.ButtonList"] .datagrid-pagination-button-list');
    if (!(await list.isVisible().catch(() => false))) {
      return 0;
    }
    const buttons = list.getByRole('button');
    const n = await buttons.count();
    if (n === 0) {
      return 0;
    }
    const lastLabel = (await buttons.nth(n - 1).innerText()).trim();
    const lastPage = parseInt(lastLabel, 10);
    if (!Number.isFinite(lastPage) || lastPage < 1) {
      return 5;
    }
    return Math.max(0, lastPage - 1);
  }

  /** Walk Previous until first page (optional when grid can open on a later page). */
  private async goToFirstAutogenerateGridPageViaPrevious(): Promise<void> {
    const prev = this.autogeneratePaginationPreviousButton();
    for (let i = 0; i < 40; i++) {
      if (!(await prev.isVisible().catch(() => false))) {
        return;
      }
      if (await prev.isDisabled().catch(() => true)) {
        return;
      }
      await prev.click();
      await this.page.waitForTimeout(300);
    }
  }

  /** Single Acquisition Date header click with Wijmo-safe retries (sort). */
  private async clickWijmoAcquisitionDateHeaderForSort(runtime: Locator, scrollRoot: Locator): Promise<void> {
    await this.scrollToRevealAcquisitionDateHeader(runtime, scrollRoot);
    await this.page.waitForTimeout(400);
    for (let attempt = 0; attempt < 5; attempt++) {
      const header = runtime
        .locator('[wj-part="chcells"]')
        .getByText('Acquisition Date', { exact: true })
        .first();
      if (!(await header.isVisible().catch(() => false))) {
        await this.scrollToRevealAcquisitionDateHeader(runtime, scrollRoot);
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
    const headerLast = runtime
      .locator('[wj-part="chcells"]')
      .getByText('Acquisition Date', { exact: true })
      .first();
    await headerLast.scrollIntoViewIfNeeded();
    await headerLast.click({ force: true, timeout: 10_000 });
    await this.page.waitForTimeout(250);
  }

  /** Horizontal scroll in grid root until name `cell` is visible (no Acquisition click). */
  private async scrollAutogenerateGridHorizontallyToRevealNameCell(scrollRoot: Locator, cell: Locator): Promise<boolean> {
    if (await this.scrollToRevealAssetNameCell(scrollRoot, cell)) {
      return await cell.isVisible().catch(() => false);
    }
    return await cell.isVisible().catch(() => false);
  }

  /**
   * Client machine autogenerate grid: find name `gridcell` ΓÇö page 1 uses two Acquisition Date sorts
   * (each followed by horizontal scroll); then Next up to `maxNextClicks` from pagination (`lastPage ΓêÆ 1`);
   * later pages use horizontal scroll only.
   */
  private async findAssetNameCellInRuntimeGrid(runtime: Locator, assetName: string): Promise<Locator> {
    await expect(runtime).toBeVisible({ timeout: 60_000 });
    const maxNextClicks = await this.readMaxNextClicksFromAutogeneratePagination();

    let nextClicks = 0;
    let useAcquisitionTwoPasses = true;

    while (true) {
      await expect(runtime).toBeVisible({ timeout: 60_000 });
      const scrollRoot = runtime.locator('div[wj-part="root"]').first();
      await expect(scrollRoot).toBeAttached({ timeout: 30_000 });
      const namePattern = new RegExp(`^\\s*${escapeRegExp(assetName)}\\s*$`);
      const cell = runtime.locator('[wj-part="cells"]').getByRole('gridcell').filter({ hasText: namePattern }).first();

      if (useAcquisitionTwoPasses) {
        await this.clickWijmoAcquisitionDateHeaderForSort(runtime, scrollRoot);
        if (await this.scrollAutogenerateGridHorizontallyToRevealNameCell(scrollRoot, cell)) {
          return cell;
        }
        await this.clickWijmoAcquisitionDateHeaderForSort(runtime, scrollRoot);
        if (await this.scrollAutogenerateGridHorizontallyToRevealNameCell(scrollRoot, cell)) {
          return cell;
        }
      } else if (await this.scrollAutogenerateGridHorizontallyToRevealNameCell(scrollRoot, cell)) {
        return cell;
      }

      if (nextClicks >= maxNextClicks) {
        break;
      }
      const next = this.autogeneratePaginationNextButton();
      const visible = await next.isVisible().catch(() => false);
      const disabled = visible ? await next.isDisabled().catch(() => true) : true;
      if (!visible || disabled) {
        break;
      }
      await next.click();
      await this.page.waitForTimeout(600);
      nextClicks += 1;
      useAcquisitionTwoPasses = false;
    }

    throw new Error(
      `Client machine grid: asset "${assetName}" not found after Acquisition sort + scroll on page 1 and up to ${maxNextClicks} Next page(s)`,
    );
  }

  private async findClientMachineAutogenerateGridCellByAssetName(assetName: string): Promise<Locator> {
    await expect(this.page.locator('.datagrid-autogenerate, [id*="datagrid_autogenerate"]')).toBeVisible({
      timeout: 5_000,
    });
    return this.findAssetNameCellInRuntimeGrid(this.clientMachineGridRuntime(), assetName);
  }

  /** Assert the asset name cell exists (same resolution path as View). */
  async expectClientMachineAutogenerateGridShowsAssetName(assetName: string): Promise<void> {
    const cell = await this.findClientMachineAutogenerateGridCellByAssetName(assetName);
    await expect(cell).toBeVisible({ timeout: 10_000 });
  }

  /** Click row View on the client machine autogenerate grid for `assetDisplayName`. */
  async clickViewOnClientMachineAutogenerateGridRowByAssetName(assetDisplayName: string): Promise<void> {
    const nameCell = await this.findClientMachineAutogenerateGridCellByAssetName(assetDisplayName);
    const runtime = this.clientMachineGridRuntime();
    const scrollRoot = runtime.locator('div[wj-part="root"]').first();
    await this.scrollGridToLeftEdge(scrollRoot);

    const row = nameCell.locator('xpath=./ancestor::div[contains(@class,"wj-row")][1]');
    const viewBtn = row.locator('button.wj-cell-maker').filter({ hasText: /^View$/ });
    await viewBtn.scrollIntoViewIfNeeded();
    await expect(viewBtn).toBeVisible({ timeout: 15_000 });
    await viewBtn.click();
  }

  /** Read-only IT asset view: Asset State in `ITassets.displayFields` shows `stateText`. */
  async expectItAssetDetailViewShowsAssetState(stateText: string): Promise<void> {
    const section = this.page
      .locator('[data-block="ITassets.displayFields"]')
      .filter({ has: this.page.getByText('Asset State', { exact: true }) })
      .first();
    await expect(section.getByText(stateText, { exact: true }).first()).toBeVisible({ timeout: 45_000 });
  }

  /** IT asset read-only screen ΓÇö Edit (toolbar, not grid row Edit). */
  async clickEditOnItAssetViewPage(): Promise<void> {
    const edit = this.page.getByRole('button', { name: 'Edit', exact: true }).first();
    await expect(edit).toBeVisible({ timeout: 30_000 });
    await edit.click();
  }

  /** IT asset edit form: set Asset State to `stateName` (VirtualSelect / listbox option label). */
  async selectAssetStateOnItAssetEditForm(stateName: string): Promise<void> {
    const byPlaceholder = this.page.getByText('Select asset state', { exact: true });
    if (await byPlaceholder.isVisible().catch(() => false)) {
      await byPlaceholder.click();
    } else {
      const block = this.page
        .locator('div[data-block="ITassets.inputFields"]')
        .filter({ has: this.page.getByText('Asset State', { exact: true }) })
        .first();
      await block.locator('.vscomp-toggle-button').first().click();
    }
    await this.page.getByRole('option', { name: stateName, exact: true }).click();
  }
}
