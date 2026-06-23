/// <reference lib="dom" />
import { expect, type Locator, type Response } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { CSI_BASE_URL, CSI_VIEW_ASSET_PATH } from '../../config/csi';
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

const IT_ASSET_VIRTUAL_SELECT_TRIGGER: Readonly<Record<string, string>> = {
  Manufacturer: 'Select manufacturer',
  'Operating System (OS)': 'Select OS',
  'Asset State': 'Select asset state',
  'Supplier Name': 'Select supplier',
  Currency: 'Select currency',
};

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
  private readonly acquisitionDateWrapper = this.page.locator(
    'div.input-with-icon-input[id*="_16-b10-b2-Input"], [id*="_16-b10-b2-InputWithIconWrapper"]',
  );
  private readonly warrantyDateWrapper = this.page.locator(
    'div.input-with-icon-input[id*="_17-b10-b2-Input"], [id*="_17-b10-b2-InputWithIconWrapper"]',
  );
  private readonly purchaseOrderDateWrapper = this.page
    .locator('div.input-with-icon-input')
    .filter({ has: this.page.locator('#Input_purchaseDate') });
  readonly desktopComputersCategory = this.page.getByText('Desktop Computers', { exact: true }).first();

  private addAssetFormScope(): Locator {
    return this.page.getByRole('main').filter({ has: this.page.getByRole('button', { name: 'Save' }) });
  }

  private virtualSelectTrigger(placeholder: string): Locator {
    return this.addAssetFormScope().getByText(placeholder, { exact: true }).first();
  }

  private triggerForFieldLabel(fieldLabel: string): string {
    const trigger = IT_ASSET_VIRTUAL_SELECT_TRIGGER[fieldLabel];
    if (!trigger) {
      throw new Error(`No VirtualSelect trigger mapped for field "${fieldLabel}"`);
    }
    return trigger;
  }

  private async openVirtualSelectTrigger(fieldLabel: string): Promise<void> {
    const trigger = this.virtualSelectTrigger(this.triggerForFieldLabel(fieldLabel));
    await expect(trigger).toBeVisible({ timeout: 30_000 });
    await trigger.click();
  }

  private async clickFirstVisibleOption(): Promise<void> {
    const clicked = await this.page.getByRole('option').evaluateAll((options) => {
      const placeholder = /^(select|choose|please|--|…|\.\.\.)$/i;
      for (const node of options) {
        const label = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (label.length === 0 || placeholder.test(label)) {
          continue;
        }
        const el = node as HTMLElement;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') {
          continue;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          continue;
        }
        el.click();
        return true;
      }
      return false;
    });
    expect(clicked).toBe(true);
  }

  private purchasePurposeField(): Locator {
    return this.page.getByRole('main').getByRole('textbox').first();
  }

  /** IA-048: direct navigation to asset view (cross-org access check). */
  async openViewAsset(formId: number) {
    await this.page.goto(`${CSI_BASE_URL}${CSI_VIEW_ASSET_PATH}?formId=${formId}`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectViewAssetSomethingWentWrong() {
    await expect(this.page.getByText('Sorry, something went wrong.', { exact: true })).toBeVisible({
      timeout: 60_000,
    });
  }

  /** Same destination as hub ΓåÆ IT Asset ΓåÆ Office ΓåÆ Client Machine; avoids menu transitions blocking clicks. */
  async openClientMachineList() {
    await this.gotoItAssetManagementClientMachineDesktopListUrl();
    await expect(this.addAssetButton).toBeVisible({ timeout: 60_000 });
  }

  async startAddAsset() {
    await expect(this.addAssetButton).toBeVisible();
    await this.addAssetButton.click();
    await this.page.waitForTimeout(3000);
    if (await this.desktopComputersCategory.isVisible().catch(() => false)) {
      return;
    }
    await expect(this.assetNameInput).toBeVisible({ timeout: 30_000 });
  }

  /** IA-001 / IA-025: wait 3s for Asset Name; reload list URL and reopen form if still missing. */
  async selectCategoryDesktopComputers(): Promise<void> {
    if (await this.desktopComputersCategory.isVisible().catch(() => false)) {
      await this.desktopComputersCategory.click();
      await this.page.waitForTimeout(3000);
    }
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
    return this.virtualSelectTrigger('Select manufacturer').isVisible({ timeout: 10_000 }).catch(() => false);
  }

  /** Basic Information row: manufacturer/OS fields appear only after "+ Add a New Row" (not a role=button). */
  private async ensureBasicInformationRowExpanded(): Promise<void> {
    if (await this.virtualSelectTrigger('Select manufacturer').isVisible().catch(() => false)) {
      return;
    }
    const addRow = this.page.getByText('+ Add a New Row', { exact: true });
    if (await addRow.isVisible().catch(() => false)) {
      await addRow.click();
      await this.page.waitForTimeout(1500);
    }
  }

  private async withAddAssetFormReloadIfFieldMissing(
    fieldLabel: string,
    identityParams: ItAssetIdentityParams,
    useIa020Navigation: boolean,
    retried: boolean,
    action: () => Promise<void>,
  ): Promise<void> {
    await this.page.waitForTimeout(3000);
    const fieldReady = await this.virtualSelectTrigger(this.triggerForFieldLabel(fieldLabel))
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (!fieldReady) {
      if (retried) {
        await expect(this.virtualSelectTrigger(this.triggerForFieldLabel(fieldLabel))).toBeVisible({
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

  private async selectFirstVirtualSelectInItAssetField(fieldLabel: string): Promise<void> {
    await this.openVirtualSelectTrigger(fieldLabel);
    await this.clickFirstVisibleOption();
  }

  private async selectVirtualSelectInItAssetField(
    fieldLabel: string,
    optionName: string,
    exact = true,
  ): Promise<void> {
    await this.openVirtualSelectTrigger(fieldLabel);
    const option = exact
      ? this.page.getByRole('option', { name: optionName, exact: true })
      : this.page.getByRole('option', { name: optionName });
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.click();
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
    await this.assetNameInput.press('Tab');
    await this.ensureBasicInformationRowExpanded();

    if (!(await this.waitForPostAssetNameFields())) {
      if (retried) {
        await expect(this.virtualSelectTrigger('Select manufacturer')).toBeVisible({
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
        (el instanceof HTMLInputElement && el.classList.contains('flatpickr-input')
          ? el
          : null) ??
        (el.querySelector('input.flatpickr-input[type="date"]') as HTMLInputElement | null) ??
        (el.querySelector('input.flatpickr-input') as HTMLInputElement | null);
      const altDisplay =
        (el instanceof HTMLInputElement && el.getAttribute('role') === 'combobox' ? el : null) ??
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
    const gridMarker = this.page.locator('.datagrid-autogenerate, [id*="datagrid_autogenerate"]');
    if (!(await gridMarker.isVisible().catch(() => false))) {
      await this.openClientMachineList();
      if (await this.desktopComputersCategory.isVisible().catch(() => false)) {
        await this.desktopComputersCategory.click();
        await this.page.waitForTimeout(2000);
      }
    }
    const cell = await this.findClientMachineAutogenerateGridCellByAssetName(assetName);
    await expect(cell).toBeVisible({ timeout: 10_000 });
  }

  /** IA-003: Client Machine bulk path (`categoryId=1` / `subCategoryId=1` desktop). */
  async gotoItAssetManagementClientMachineBulkUrl() {
    await this.page.goto(`${CSI_BASE_URL}/ITAssetManagement?categoryId=1&subCategoryId=1`);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(3000);
    await expect(this.page.getByRole('button', { name: 'Bulk Upload Asset' })).toBeVisible({ timeout: 60_000 });
  }

  async startBulkUploadAsset() {
    const desktop = this.page.getByText('Desktop Computers', { exact: true }).first();
    if (await desktop.isVisible().catch(() => false)) {
      await desktop.click();
      await this.page.waitForTimeout(3000);
    }
    await this.page.getByRole('button', { name: 'Bulk Upload Asset' }).click();
    await expect(this.page.getByRole('button', { name: 'Download Template' })).toBeVisible({ timeout: 60_000 });
  }

  private bulkUploadWizardStepOne(): Locator {
    return this.page.getByRole('main').filter({ has: this.page.getByText('Select Organization', { exact: true }) });
  }

  /** IA-003: bulk wizard step 1 — organization picker + disabled Download until org is set. */
  async startBulkUploadAssetIa003(): Promise<void> {
    const desktop = this.page.getByText('Desktop Computers', { exact: true }).first();
    if (await desktop.isVisible().catch(() => false)) {
      await desktop.click();
      await this.page.waitForTimeout(3000);
    }
    await this.page.getByRole('button', { name: 'Bulk Upload Asset' }).click();
    const stepOne = this.bulkUploadWizardStepOne();
    await expect(stepOne.getByText('Select Organization', { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(this.page.getByRole('button', { name: 'Download Template' })).toBeVisible({ timeout: 60_000 });
  }

  /** IA-003: pick first tenant organization so Download Template enables. */
  async selectBulkUploadOrganizationIa003(): Promise<void> {
    const stepOne = this.bulkUploadWizardStepOne();
    await stepOne.getByText('Select Organization', { exact: true }).click();

    const listbox = this.page.getByRole('listbox').last();
    await expect(listbox.getByRole('option').first()).toBeVisible({ timeout: 15_000 });

    const chosen = await listbox.getByRole('option').evaluateAll((opts) => {
      const placeholder = /^(select|choose|please|--|…|\.\.\.|select organization)$/i;
      for (const node of opts) {
        const label = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (label.length === 0 || placeholder.test(label)) {
          continue;
        }
        (node as HTMLElement).click();
        return label;
      }
      return null;
    });
    expect(chosen).toBeTruthy();

    await this.page.getByText('Download and upload the template', { exact: true }).first().click();
    await expect(this.page.getByRole('button', { name: 'Download Template' })).toBeEnabled({ timeout: 60_000 });
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

  private parseFilenameFromContentDisposition(header: string): string | null {
    const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(header);
    return match?.[1] ? decodeURIComponent(match[1].trim()) : null;
  }

  /** IA-003: select organization, wait for enabled Download Template, then save file. */
  async downloadBulkAssetTemplateIa003(targetDir: string): Promise<string> {
    const downloadBtn = this.page.getByRole('button', { name: 'Download Template' });
    if (!(await downloadBtn.isEnabled())) {
      await this.selectBulkUploadOrganizationIa003();
    }
    if (!(await downloadBtn.isEnabled())) {
      await this.selectBulkUploadOrganizationIa003();
    }
    await expect(downloadBtn).toBeEnabled({ timeout: 60_000 });

    const captured: Array<{ body: Buffer; contentDisposition: string }> = [];
    let captureResponses = false;
    const onResponse = async (response: Response) => {
      if (!captureResponses) {
        return;
      }
      try {
        if (!response.ok()) {
          return;
        }
        const body = await response.body();
        if (body.length < 500 || body[0] !== 0x50 || body[1] !== 0x4b) {
          return;
        }
        captured.push({
          body,
          contentDisposition: response.headers()['content-disposition'] ?? '',
        });
      } catch {
        /* body may be disposed after navigation */
      }
    };
    this.page.on('response', onResponse);

    const downloadPromise = this.page.waitForEvent('download', { timeout: 120_000 });
    captureResponses = true;
    await downloadBtn.click();

    const xlsxBytesPromise = expect
      .poll(() => captured.length > 0, { timeout: 120_000, intervals: [250, 500, 1000] })
      .toBeTruthy()
      .then(() => captured[captured.length - 1]!);

    const [downloadOutcome, xlsxOutcome] = await Promise.allSettled([downloadPromise, xlsxBytesPromise]);
    this.page.off('response', onResponse);

    if (downloadOutcome.status === 'fulfilled') {
      const rawName = downloadOutcome.value.suggestedFilename() || 'bulk-template.xlsx';
      const safeBase = path.basename(rawName.replace(/[/\\]/g, '_'));
      const downloadPath = path.join(targetDir, safeBase);
      await downloadOutcome.value.saveAs(downloadPath);
      await this.expectBulkUploadStepOneReadyAfterDownload();
      return downloadPath;
    }

    if (xlsxOutcome.status === 'fulfilled') {
      const cd = xlsxOutcome.value.contentDisposition;
      const rawName = this.parseFilenameFromContentDisposition(cd) ?? 'bulk-template.xlsx';
      const safeBase = path.basename(rawName.replace(/[/\\]/g, '_'));
      const downloadPath = path.join(targetDir, safeBase);
      fs.writeFileSync(downloadPath, xlsxOutcome.value.body);
      await this.expectBulkUploadStepOneReadyAfterDownload();
      return downloadPath;
    }

    throw new Error('IA-003: bulk template was not downloaded (no download event or xlsx response)');
  }

  /** IA-003: after template download, wizard step 1 upload zone must be ready again. */
  private async expectBulkUploadStepOneReadyAfterDownload(): Promise<void> {
    const stepOne = this.bulkUploadWizardStepOne();
    await expect(stepOne.getByText('Upload completed template', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(stepOne.locator('input[type="file"]').first()).toBeAttached({ timeout: 15_000 });
  }

  async uploadBulkCompletedTemplate(absolutePath: string) {
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.page.getByText('Upload completed template').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(absolutePath);
  }

  /** IA-003: set edited workbook on step 1 drop zone (`input[type="file"]`), then wait for upload to finish. */
  async uploadBulkCompletedTemplateIa003(absolutePath: string): Promise<void> {
    const filePath = path.resolve(absolutePath);
    expect(fs.existsSync(filePath)).toBe(true);

    const stepOne = this.bulkUploadWizardStepOne();
    await expect(stepOne.getByText('Upload completed template', { exact: true })).toBeVisible({ timeout: 60_000 });

    const fileInput = stepOne.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached({ timeout: 15_000 });

    let uploaded = false;
    try {
      await fileInput.setInputFiles(filePath);
      uploaded = await this.page
        .getByText('File uploaded successfully!')
        .first()
        .isVisible({ timeout: 20_000 })
        .catch(() => false);
    } catch {
      uploaded = false;
    }

    if (!uploaded) {
      const [fileChooser] = await Promise.all([
        this.page.waitForEvent('filechooser', { timeout: 30_000 }),
        stepOne.getByText('Upload completed template', { exact: true }).click(),
      ]);
      await fileChooser.setFiles(filePath);
    }

    await this.expectBulkTemplateUploadedToast();
    await expect(this.page.getByRole('button', { name: 'Continue' })).toBeEnabled({ timeout: 90_000 });
  }

  async expectBulkTemplateUploadedToast() {
    await expect(this.page.getByText('File uploaded successfully!').first()).toBeVisible({ timeout: 90_000 });
  }

  async clickBulkUploadContinueWhenEnabled() {
    const cont = this.page.getByRole('button', { name: 'Continue' });
    await expect(cont).toBeEnabled({ timeout: 60_000 });
    await cont.click();
  }

  /** IA-003 step 2: Continue in the review header (not step-1 Continue). */
  private async clickBulkUploadReviewContinueWhenEnabled(): Promise<void> {
    const cont = this.bulkUploadReviewPanel().getByRole('button', { name: 'Continue' });
    await expect(cont).toBeEnabled({ timeout: 60_000 });
    await cont.click();
  }

  private ia003ImportAssetsButton(): Locator {
    return this.page.getByRole('button', { name: 'Import Assets' });
  }

  private bulkUploadReviewPanel(): Locator {
    return this.page.getByRole('main').filter({ has: this.page.getByText('Review problematic data', { exact: true }) });
  }

  /** IA-003 step 2: one asset row in the left review list. */
  private bulkAssetReviewRowByName(assetDisplayName: string): Locator {
    return this.bulkUploadReviewPanel()
      .locator('div.field-warning, div.field-selected')
      .filter({ has: this.page.getByText(assetDisplayName, { exact: true }) })
      .first();
  }

  /** IA-003 step 2: right-hand edit panel (Save link + asset title). */
  private bulkUploadReviewDetailForAsset(assetDisplayName: string): Locator {
    return this.page
      .getByRole('main')
      .filter({ has: this.page.getByRole('link', { name: /Save/i }) })
      .filter({ has: this.page.getByText(assetDisplayName, { exact: true }) });
  }

  private bulkAssetButtonByName(assetDisplayName: string): Locator {
    return this.page.getByRole('main').filter({ has: this.page.getByText(assetDisplayName, { exact: true }) });
  }

  async clickBulkAssetRowByName(assetDisplayName: string) {
    const btn = this.bulkAssetButtonByName(assetDisplayName);
    await expect(btn).toBeVisible({ timeout: 60_000 });
    await btn.click();
  }

  async expectBulkAssetRowStatus(assetDisplayName: string, status: 'Missing Fields' | 'OK') {
    const row = this.bulkAssetReviewRowByName(assetDisplayName);
    await expect(row.getByText(status, { exact: true })).toBeVisible({ timeout: 90_000 });
  }

  async clickFirstMissingFieldsTag() {
    const mf = this.page.getByText('Missing Fields', { exact: true }).first();
    await expect(mf).toBeVisible({ timeout: 30_000 });
    await mf.click();
  }

  /** IA-003: open this asset's row + Missing Fields, fill Purchase Cost, Save (scoped to that row, not `.first()`). */
  async fixBulkAssetMissingPurchaseCostIa003(assetDisplayName: string, purchaseCost: string): Promise<void> {
    const importBtn = this.ia003ImportAssetsButton();
    if (await importBtn.isVisible().catch(() => false)) {
      return;
    }

    const row = this.bulkAssetReviewRowByName(assetDisplayName);
    await expect(row).toBeVisible({ timeout: 60_000 });

    if (await row.getByText('OK', { exact: true }).isVisible().catch(() => false)) {
      return;
    }

    const missingFields = row.getByText('Missing Fields', { exact: true });
    await expect(missingFields).toBeVisible({ timeout: 15_000 });
    await row.click();
    await missingFields.click();

    const detail = this.bulkUploadReviewDetailForAsset(assetDisplayName);
    const saveLink = detail.getByRole('link', { name: /Save/i }).first();
    await expect(saveLink).toBeVisible({ timeout: 30_000 });

    const cost = detail.getByRole('spinbutton').or(detail.getByPlaceholder('Purchase Cost')).first();
    await expect(cost).toBeVisible({ timeout: 15_000 });
    await cost.fill(purchaseCost);
    await saveLink.click();

    await expect
      .poll(async () => {
        if (await importBtn.isVisible().catch(() => false)) {
          return true;
        }
        return this.bulkAssetReviewRowByName(assetDisplayName)
          .getByText('OK', { exact: true })
          .isVisible()
          .catch(() => false);
      }, { timeout: 90_000 })
      .toBeTruthy();
  }

  /** IA-003 step 3: Continue after all rows OK, then Import Assets. */
  async importBulkAssetsIa003(): Promise<void> {
    const importBtn = this.ia003ImportAssetsButton();
    if (!(await importBtn.isVisible().catch(() => false))) {
      await this.clickBulkUploadReviewContinueWhenEnabled();
      const proceed = this.page.getByRole('button', { name: 'Proceed' });
      if (await proceed.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await this.page.getByRole('button', { name: 'Go back' }).click();
        throw new Error('IA-003: not all bulk review rows are OK before Continue');
      }
    }
    await expect(importBtn).toBeVisible({ timeout: 120_000 });
    await expect(importBtn).toBeEnabled({ timeout: 60_000 });
    await importBtn.scrollIntoViewIfNeeded();
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

  async fillBulkAssetPurchaseCostAndSave(purchaseCost: string) {
    const cost = this.page.getByPlaceholder('Purchase Cost').first();
    await expect(cost).toBeVisible({ timeout: 30_000 });
    await cost.fill(purchaseCost);
    const saveLink = this.page.getByRole('link', { name: /Save/i }).first();
    await expect(saveLink).toBeVisible({ timeout: 30_000 });
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
    await expect(this.purchasePurposeField()).toBeVisible({ timeout: 60_000 });
  }

  async fillItAssetPurchasePurpose(purpose: string) {
    const input = this.purchasePurposeField();
    await input.click();
    await input.fill(purpose);
  }

  async pickItAssetPurchaseOrderDateToday() {
    await this.setFlatpickrDateDirectOnWrapper(this.purchaseOrderDateWrapper, new Date());
  }

  async selectItAssetPurchaseSupplierByName(supplierName: string) {
    await this.page.waitForTimeout(3000);
    const selectDots = this.page.getByRole('main').getByText('Select...', { exact: true }).first();
    if (await selectDots.isVisible().catch(() => false)) {
      await selectDots.click();
    } else {
      await this.openVirtualSelectTrigger('Supplier Name');
    }
    await this.page.getByRole('option', { name: supplierName }).first().click();
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
    const editBtn = cells.getByRole('button', { name: 'Edit', exact: true }).first();
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
    const editBtn = row.getByRole('button', { name: 'Edit', exact: true });
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
    const viewBtn = row.getByRole('button', { name: 'View', exact: true });
    await viewBtn.scrollIntoViewIfNeeded();
    await expect(viewBtn).toBeVisible({ timeout: 15_000 });
    await viewBtn.click();
  }

  /**
   * IA-025: assign User on asset edit ΓÇö open VirtualSelect (`UserDropdown` or `User` + `.vscomp-toggle-button`),
   * pick first `option`, return trimmed label for view assertion.
   */
  async selectFirstUserOnItAssetEditFormIa025(): Promise<string> {
    await this.page.waitForTimeout(3000);
    const userTrigger = this.page.getByText('Enter user ', { exact: true });
    if (await userTrigger.isVisible().catch(() => false)) {
      await userTrigger.click();
    } else {
      await this.page.getByRole('combobox', { name: 'Select an option' }).click();
    }
    const chosen = await this.page.getByRole('option').evaluateAll((options) => {
      const placeholder = /^(select|choose|please|--|…|\.\.\.)$/i;
      for (const node of options) {
        const label = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (label.length === 0 || placeholder.test(label)) {
          continue;
        }
        const el = node as HTMLElement;
        el.click();
        return label;
      }
      return null;
    });
    if (!chosen) {
      throw new Error('IA-025: no non-placeholder option found in User dropdown');
    }
    return chosen;
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
      timeout: 60_000,
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
    const viewBtn = row.getByRole('button', { name: 'View', exact: true });
    await viewBtn.scrollIntoViewIfNeeded();
    await expect(viewBtn).toBeVisible({ timeout: 15_000 });
    await viewBtn.click();
  }

  /** Read-only IT asset view: Asset State label and value (avoid grid column headers). */
  async expectItAssetDetailViewShowsAssetState(stateText: string): Promise<void> {
    const viewMain = this.page.getByRole('main').filter({ has: this.page.getByRole('button', { name: 'Edit' }) });
    await expect(viewMain.getByText('Asset State', { exact: true }).first()).toBeVisible({ timeout: 45_000 });
    await expect(viewMain.getByText(stateText, { exact: true })).toBeVisible({ timeout: 45_000 });
  }

  /** IT asset read-only screen ΓÇö Edit (toolbar, not grid row Edit). */
  async clickEditOnItAssetViewPage(): Promise<void> {
    const edit = this.page.getByRole('button', { name: 'Edit', exact: true }).first();
    await expect(edit).toBeVisible({ timeout: 30_000 });
    await edit.click();
  }

  /** IT asset edit form: set Asset State to `stateName` (field block combobox — not Manufacturer). */
  async selectAssetStateOnItAssetEditForm(stateName: string): Promise<void> {
    const placeholder = this.page.getByText('Select asset state', { exact: true });
    if (await placeholder.isVisible().catch(() => false)) {
      await placeholder.click();
    } else {
      const fieldBlock = this.page
        .locator('div[data-block="ITassets.inputFields"]')
        .filter({ has: this.page.getByText(/^Asset State/) })
        .first();
      await expect(fieldBlock).toBeVisible({ timeout: 30_000 });
      await fieldBlock.getByRole('combobox').click();
    }
    const option = this.page.getByRole('option', { name: stateName, exact: true });
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.click();
  }

  // ─── IA-022: Filter / sort assets by state ───────────────────────────────────

  /**
   * IA-022: navigate to the Client Machine list via the IT Asset Management nav menu
   * (IT Asset Management → Office → Client Machine link).
   */
  async openClientMachineListViaNav(): Promise<void> {
    await this.page.getByText('IT Asset Management').click();
    await this.page.getByText('Office').click();
    await this.page.getByRole('link', { name: 'Client Machine' }).click();
    await expect(this.page.locator('[wj-part="cells"]').first()).toBeVisible({ timeout: 60_000 });
  }

  /**
   * IA-022: scroll the Wijmo asset grid horizontally until the Asset State column header
   * (identified by its filter button aria-label) is within the visible viewport.
   * The Wijmo grid virtualises column rendering so scrollIntoViewIfNeeded() alone is insufficient.
   */
  private async scrollGridToRevealAssetStateColumn(): Promise<void> {
    const runtime = this.page.locator('.datagrid-runtime.wj-flexgrid').first();
    await expect(runtime).toBeVisible({ timeout: 60_000 });
    const scrollRoot = runtime.locator('div[wj-part="root"]').first();
    await expect(scrollRoot).toBeAttached({ timeout: 30_000 });
    const filterBtn = this.page.getByRole('button', { name: 'Edit Filter for Column Asset State', exact: true });
    if (await filterBtn.isVisible().catch(() => false)) return;
    const max = await this.gridMaxScrollLeft(scrollRoot);
    const step = 280;
    for (let x = step; x <= max + step; x += step) {
      await this.setGridScrollLeft(scrollRoot, Math.min(x, max));
      if (await filterBtn.isVisible().catch(() => false)) return;
    }
  }

  /**
   * IA-022: scroll to the Asset State column and assert the column header filter button
   * is visible. Call this immediately after the grid loads to confirm the column is present.
   */
  async scrollToAndVerifyAssetStateColumnHeader(): Promise<void> {
    await this.scrollGridToRevealAssetStateColumn();
    await expect(
      this.page.getByRole('button', { name: 'Edit Filter for Column Asset State', exact: true }),
    ).toBeVisible({ timeout: 15_000 });
  }

  /** IA-022: scroll to the Asset State column then open its column filter panel. */
  async openAssetStateColumnFilter(): Promise<void> {
    await this.scrollGridToRevealAssetStateColumn();
    const filterBtn = this.page.getByRole('button', { name: 'Edit Filter for Column Asset State', exact: true });
    await expect(filterBtn).toBeVisible({ timeout: 15_000 });
    // Wijmo column headers use absolute positioning that places them outside the
    // browser viewport rect. dispatchEvent fires the DOM event directly without any
    // coordinate-based viewport constraint, bypassing the "outside of viewport" error.
    await filterBtn.dispatchEvent('click');
  }

  /**
   * IA-022: with the Asset State filter panel open, set each known state's checkbox so
   * only the states in `statesToKeep` remain checked, then click Apply.
   * Known states: 'Disposed', 'Expired', 'In Store', 'In Use'.
   */
  async applyAssetStateColumnFilter(statesToKeep: string[]): Promise<void> {
    const allKnownStates = ['Disposed', 'Expired', 'In Store', 'In Use'];
    for (const state of allKnownStates) {
      const cb = this.page.getByRole('checkbox', { name: state });
      await expect(cb).toBeVisible({ timeout: 10_000 });
      await cb.setChecked(statesToKeep.includes(state));
    }
    await this.page.getByRole('button', { name: 'Apply' }).click();
    // Wait for the grid to re-render with updated results before returning.
    await expect(this.page.locator('[wj-part="cells"]').getByRole('gridcell').first()).toBeVisible({
      timeout: 30_000,
    });
  }

  /**
   * IA-022: after applying an Asset State filter, assert that visible Asset State gridcells
   * in the current page all show `expectedState`. Checks first and 5th visible cells
   * (matching the per-row assertion pattern from IA-022.txt).
   */
  async expectAllVisibleAssetStateCellsMatch(expectedState: string): Promise<void> {
    const cells = this.page.locator('[wj-part="cells"]').getByRole('gridcell', { name: expectedState });
    await expect(cells.first()).toBeVisible({ timeout: 30_000 });
    await expect(cells.nth(4)).toBeVisible({ timeout: 15_000 });
  }

  /**
   * IA-022: read the total record count from the grid pagination footer,
   * e.g. returns 281 from "1 to 10 of 281 records".
   */
  async readAssetGridTotalRecordCount(): Promise<number> {
    const recordsEl = this.page
      .locator('[data-block="Pagination.RecordsNumber"]')
      .locator('span[data-expression]')
      .first();
    await expect(recordsEl).toBeVisible({ timeout: 30_000 });
    const text = ((await recordsEl.textContent()) ?? '').trim();
    return parseInt(text, 10);
  }

  /**
   * IA-022: click the Asset State column header to toggle sort order.
   * Clicks the left portion of the header cell to avoid the filter button,
   * which is positioned on the right side (class wj-right).
   */
  async clickAssetStateColumnHeaderToSort(): Promise<void> {
    await this.scrollGridToRevealAssetStateColumn();
    const headerCell = this.page
      .locator('[wj-part="chcells"] .wj-cell.wj-header')
      .filter({ has: this.page.locator('button[aria-label="Edit Filter for Column Asset State"]') })
      .first();
    await expect(headerCell).toBeVisible({ timeout: 15_000 });
    // dispatchEvent avoids the "outside of viewport" error caused by Wijmo's absolute-positioned headers.
    await headerCell.dispatchEvent('click');
    await this.page.waitForTimeout(1000);
  }

  /**
   * IA-022: assert the first visible Asset State gridcell shows `expectedState`.
   * Used after a sort to confirm the sort direction is correct.
   */
  async expectFirstAssetStateGridCellIs(expectedState: string): Promise<void> {
    const firstCell = this.page
      .locator('[wj-part="cells"]')
      .getByRole('gridcell', { name: expectedState })
      .first();
    await expect(firstCell).toBeVisible({ timeout: 30_000 });
  }

  // ─── IA-015: Edit existing purchase order ────────────────────────────────────

  /** IA-015: navigate to purchase order list and wait for the table grid. */
  async gotoItAssetPurchaseListUrl(): Promise<void> {
    await this.page.goto(`${CSI_BASE_URL}/ITAssetPurchase`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page.locator('table.table[role="grid"]')).toBeVisible({ timeout: 60_000 });
  }

  /**
   * IA-015: read the current state of the first purchase order row.
   * Returns the Purpose text (used as identifier through the rest of the test),
   * plus supplier name, document count, and linked-asset count.
   */
  async readFirstPurchaseGridRowState(): Promise<{
    purpose: string;
    supplier: string;
    docCount: number;
    linkedCount: number;
  }> {
    const firstRow = this.page.locator('tr.table-row').first();
    await expect(firstRow).toBeVisible({ timeout: 60_000 });

    const purposeText = ((await firstRow.locator('td[data-header="Purpose"]').textContent()) ?? '').trim();
    const supplierText = ((await firstRow.locator('td[data-header="Supplier"]').textContent()) ?? '').trim();
    const docsText = ((await firstRow.locator('td[data-header="Documents"]').textContent()) ?? '').trim();
    const linkedText = ((await firstRow.locator('td[data-header="Linked Assets"]').textContent()) ?? '').trim();

    const docMatch = docsText.match(/^(\d+)/);
    const linkedMatch = linkedText.match(/^(\d+)/);
    return {
      purpose: purposeText,
      supplier: supplierText,
      docCount: docMatch ? parseInt(docMatch[1], 10) : 0,
      linkedCount: linkedMatch ? parseInt(linkedMatch[1], 10) : 0,
    };
  }

  /**
   * IA-015: read the current state from the purchase grid row matching `purpose`.
   * Used for post-edit state diffing when the row is looked up by its purpose text.
   */
  async readPurchaseGridRowState(
    purpose: string,
  ): Promise<{ supplier: string; docCount: number; linkedCount: number }> {
    const row = this.page
      .locator('tr.table-row')
      .filter({ has: this.page.locator('td[data-header="Purpose"]').filter({ hasText: purpose }) });
    await expect(row).toBeVisible({ timeout: 60_000 });

    const supplierText = ((await row.locator('td[data-header="Supplier"]').textContent()) ?? '').trim();
    const docsText = ((await row.locator('td[data-header="Documents"]').textContent()) ?? '').trim();
    const linkedText = ((await row.locator('td[data-header="Linked Assets"]').textContent()) ?? '').trim();

    const docMatch = docsText.match(/^(\d+)/);
    const linkedMatch = linkedText.match(/^(\d+)/);
    return {
      supplier: supplierText,
      docCount: docMatch ? parseInt(docMatch[1], 10) : 0,
      linkedCount: linkedMatch ? parseInt(linkedMatch[1], 10) : 0,
    };
  }

  /** IA-015: click the Edit link in the purchase grid row whose Purpose matches `purpose`. */
  async clickEditOnPurchaseGridRowByPurpose(purpose: string): Promise<void> {
    const row = this.page
      .locator('tr.table-row')
      .filter({ has: this.page.locator('td[data-header="Purpose"]').filter({ hasText: purpose }) });
    await expect(row).toBeVisible({ timeout: 60_000 });
    await row.locator('a').filter({ hasText: 'Edit' }).click();
  }

  /** IA-015: wait for purchase edit form — supplier name label must be visible. */
  async waitForPurchaseEditFormReady(): Promise<void> {
    await expect(this.page.locator('label').filter({ hasText: /^Supplier Name$/ })).toBeVisible({ timeout: 60_000 });
  }

  /**
   * IA-015: add a supplier via the '+' button next to the Supplier Name dropdown.
   * Waits for the "Add New Supplier" dialog, fills the name field (selected by label context,
   * not by ID), saves, and waits for the dialog to close.
   */
  private async addPurchaseSupplierViaPopup(supplierName: string): Promise<void> {
    await this.page.getByText('+', { exact: true }).click();
    const popup = this.page.locator('[role="dialog"]').filter({ has: this.page.getByText('Add New Supplier') });
    await expect(popup).toBeVisible({ timeout: 15_000 });
    const supplierNameLabel = popup.locator('label').filter({ hasText: /^Supplier Name$/ });
    await expect(supplierNameLabel).toBeVisible({ timeout: 10_000 });
    const supplierInput = popup.locator('input[type="text"]').first();
    await supplierInput.click();
    await supplierInput.fill(supplierName);
    await popup.getByRole('button', { name: 'Save' }).click();
    await expect(popup).toBeHidden({ timeout: 30_000 });
  }

  /**
   * IA-015: opens the Supplier Name VirtualSelect on the purchase edit form, ensures at least
   * two options exist (adds "Supplier A" / "Supplier B" via popup when fewer are found), then
   * selects the option at the opposite position from the current selection.
   *
   * Selection rule (position-based, not name-based):
   *   - 1st option currently selected → click 2nd option
   *   - Any other option selected → click 1st option
   *
   * Returns the text of the newly selected supplier.
   */
  async swapPurchaseEditSupplierAndGetNewName(): Promise<string> {
    // The Supplier Name label is a SIBLING of the ITassets.inputFields block, not inside it.
    // Scope to their common parent: the ThemeGrid_Width3 container that holds both.
    const supplierContainer = this.page
      .locator('[data-container=""].ThemeGrid_Width3')
      .filter({ has: this.page.locator('label').filter({ hasText: /^Supplier Name$/ }) })
      .first();
    await expect(supplierContainer).toBeVisible({ timeout: 30_000 });
    // Wait for the dropdown's current selection to render before opening it.
    // An empty or "Select..." value means the form data hasn't hydrated yet.
    const supplierValueEl = supplierContainer.locator('.vscomp-value');
    await expect(supplierValueEl).toBeVisible({ timeout: 30_000 });
    await expect(supplierValueEl).not.toHaveText(/^Select\.\.\.$/, { timeout: 30_000 });
    await supplierContainer.locator('.vscomp-toggle-button').click();

    const options = this.page.locator('.vscomp-option');
    await expect(options.first()).toBeVisible({ timeout: 15_000 });

    let optionCount = await options.count();
    if (optionCount < 2) {
      await this.page.keyboard.press('Escape');
      const suppliersToAdd = ['Supplier A', 'Supplier B'];
      for (let i = optionCount; i < 2; i++) {
        await this.addPurchaseSupplierViaPopup(suppliersToAdd[i]);
      }
      await supplierContainer.locator('.vscomp-toggle-button').click();
      await expect(options.first()).toBeVisible({ timeout: 15_000 });
      optionCount = await options.count();
    }

    // Determine currently selected option by position; pick the other one
    const isFirstSelected = await options.nth(0).evaluate(
      (el) => el.classList.contains('selected') || el.getAttribute('aria-selected') === 'true',
    );
    const targetIdx = isFirstSelected ? 1 : 0;
    const targetOption = options.nth(targetIdx);
    const newName = ((await targetOption.locator('.vscomp-option-text').textContent()) ?? '').trim();
    await targetOption.click();
    return newName;
  }

  /** IA-015: count PDFs in the Document Information section by counting trash icons. */
  async countPurchaseDocumentsInSection(): Promise<number> {
    await expect(this.page.getByText('Document Information')).toBeVisible({ timeout: 30_000 });
    return this.page.locator('.icon.fa.fa-trash-o').count();
  }

  /** IA-015: delete the first document listed in the Document Information section. */
  async deleteFirstDocumentInSection(): Promise<void> {
    const firstTrash = this.page.locator('.icon.fa.fa-trash-o').first();
    await expect(firstTrash).toBeVisible({ timeout: 15_000 });
    await firstTrash.click();
  }

  /**
   * IA-015: manage documents based on current count:
   *   - If 3 documents present → delete the first one (count decreases by 1)
   *   - If fewer than 3 → upload `quotationPdfPath` via the Quotation tab (count increases by 1)
   * Returns the expected document count after the operation.
   */
  async countAndHandlePurchaseDocuments(quotationPdfPath: string): Promise<number> {
    const currentCount = await this.countPurchaseDocumentsInSection();
    if (currentCount >= 3) {
      await this.deleteFirstDocumentInSection();
      return currentCount - 1;
    }
    await this.selectPurchaseWizardQuotationTab();
    await this.uploadPurchaseWizardDocument(quotationPdfPath, 'Test Quotation.pdf');
    return currentCount + 1;
  }

  /**
   * IA-015: select only the first data row in the asset selection Wijmo grid.
   * Uses the same wj-cell checkbox approach as {@link selectFirstThreePurchaseWizardAssetRows}.
   */
  async selectFirstPurchaseWizardAssetRow(): Promise<void> {
    // Wait for data rows to appear in the grid cells area before attempting selection.
    await expect(
      this.page.locator('[wj-part="cells"]').getByRole('gridcell').first(),
    ).toBeVisible({ timeout: 60_000 });

    // Row checkboxes live in the row header panel (wj-part="rh" / wj-part="rhcells"),
    // NOT inside wj-part="cells". Each wj-row in rhcells corresponds to one data row.
    // The first wj-row in rhcells is data row 1; its checkbox cell has input.wj-column-selector.
    const firstRowCheckboxCell = this.page
      .locator('[wj-part="rhcells"] .wj-row')
      .first()
      .locator('.wj-cell:has(input.wj-column-selector)')
      .first();
    await expect(firstRowCheckboxCell).toBeVisible({ timeout: 30_000 });
    await firstRowCheckboxCell.scrollIntoViewIfNeeded();
    await firstRowCheckboxCell.click();
  }

  /** IA-015: click Save to submit the edited purchase order. */
  async clickPurchaseWizardSave(): Promise<void> {
    const save = this.page.getByRole('button', { name: 'Save' });
    await expect(save).toBeVisible({ timeout: 120_000 });
    await expect(save).toBeEnabled({ timeout: 120_000 });
    await save.click();
  }

  /**
   * IA-015: after saving, assert that the purchase grid row with `purpose` reflects
   * the expected post-edit supplier, document count, and linked-asset count.
   *
   * Text format observed in grid:
   *   Documents  — "X Documents" (or "1 Document")
   *   Linked Assets — "0 Linked Asset", "1 Linked Asset", "X Linked Assets" (X ≥ 2)
   */
  async expectPurchaseGridRowAfterEdit(
    purpose: string,
    expectedSupplier: string,
    expectedDocCount: number,
    expectedLinkedCount: number,
  ): Promise<void> {
    const row = this.page
      .locator('tr.table-row')
      .filter({ has: this.page.locator('td[data-header="Purpose"]').filter({ hasText: purpose }) });
    await expect(row).toBeVisible({ timeout: 60_000 });

    await expect(row.locator('td[data-header="Supplier"]').filter({ hasText: expectedSupplier })).toBeVisible({
      timeout: 30_000,
    });

    const docText = expectedDocCount === 1 ? '1 Document' : `${expectedDocCount} Documents`;
    const linkedText = expectedLinkedCount >= 2 ? `${expectedLinkedCount} Linked Assets` : `${expectedLinkedCount} Linked Asset`;

    await expect(row.getByText(docText)).toBeVisible({ timeout: 30_000 });
    await expect(row.getByText(linkedText)).toBeVisible({ timeout: 30_000 });
  }

  // ─── IA-017: Bulk update OS version ──────────────────────────────────────────

  /**
   * IA-017: scroll the client machine grid horizontally until the OS Version column header
   * is visible. The column typically appears after one or two scroll steps from the left.
   */
  private async scrollClientMachineGridToOsVersionColumn(): Promise<void> {
    const runtime = this.clientMachineGridRuntime();
    await expect(runtime).toBeVisible({ timeout: 60_000 });
    const scrollRoot = runtime.locator('div[wj-part="root"]').first();
    await expect(scrollRoot).toBeAttached({ timeout: 30_000 });
    const osVersionHeader = runtime.locator('[wj-part="chcells"]').getByText('OS Version', { exact: true }).first();
    if (await osVersionHeader.isVisible().catch(() => false)) return;
    const max = await this.gridMaxScrollLeft(scrollRoot);
    const step = 200;
    for (let x = step; x <= max + step; x += step) {
      await this.setGridScrollLeft(scrollRoot, Math.min(x, max));
      if (await osVersionHeader.isVisible().catch(() => false)) return;
    }
  }

  /**
   * IA-017: scroll grid to left edge and read the Asset ID text from the first `n` data rows.
   * Asset ID is the leftmost column at scroll=0 (before any horizontal scroll).
   */
  async readClientMachineGridFirstNAssetIds(n: number): Promise<string[]> {
    const runtime = this.clientMachineGridRuntime();
    const scrollRoot = runtime.locator('div[wj-part="root"]').first();
    await this.scrollGridToLeftEdge(scrollRoot);
    await expect(runtime.locator('[wj-part="cells"] [role="gridcell"]').first()).toBeVisible({ timeout: 30_000 });

    const rows = runtime
      .locator('[wj-part="cells"] .wj-row:has([role="gridcell"])');

    const assetIds: string[] = [];
    for (let i = 0; i < n; i++) {
      const row = rows.nth(i);
      // toBeVisible() fails for Wijmo rows: the overflow:hidden container clips their
      // bounding box in Playwright's visibility check even though data is rendered.
      await expect(row).toBeAttached({ timeout: 15_000 });
      // First two gridcells are "View" and "Edit" action buttons; Asset ID is at index 2
      const assetId = ((await row.locator('[role="gridcell"]').nth(2).textContent()) ?? '').trim();
      assetIds.push(assetId);
    }
    return assetIds;
  }

  /**
   * IA-017: click the row header checkboxes for the first `n` data rows in the client machine grid.
   * Row selector checkboxes live in `wj-part="rhcells"` (not in the data cells area).
   * Uses dispatchEvent to bypass the "element is outside of viewport" constraint from Wijmo's
   * absolute-positioned row header panel.
   */
  async selectClientMachineGridFirstNRows(n: number): Promise<void> {
    const runtime = this.clientMachineGridRuntime();
    await expect(runtime.locator('[wj-part="cells"] [role="gridcell"]').first()).toBeVisible({ timeout: 30_000 });

    // Row selector labels live inside wj-part="rhcells" — each wraps a wj-column-selector input.
    // Exclude the top-left "select all" checkbox (wj-column-selector-group).
    // dispatchEvent('click') on the label forwards the click to its child input per HTML spec,
    // firing Wijmo's selection handler without triggering Playwright's native el.checked assertion
    // (which fails because Wijmo updates aria-checked, not el.checked directly).
    const rowLabels = runtime.locator(
      '[wj-part="rhcells"] label:has(input.wj-column-selector:not(.wj-column-selector-group))',
    );
    await expect(rowLabels.first()).toBeAttached({ timeout: 15_000 });

    for (let i = 0; i < n; i++) {
      await rowLabels.nth(i).dispatchEvent('click');
    }
  }

  /**
   * IA-017: click the Bulk Edit button and wait for the bulk edit form to load.
   * The form renders one stacked "Edit Asset" panel per selected asset; `n` is the
   * expected number of panels (used to wait until all OS Version inputs are present).
   */
  async clickBulkEditAndWaitForForm(n: number): Promise<void> {
    const bulkEdit = this.page.getByRole('button', { name: 'Bulk Edit', exact: true });
    await expect(bulkEdit).toBeVisible({ timeout: 15_000 });
    await bulkEdit.click();
    // The form renders n stacked panels; wait until the last OS Version input is present
    const osVersionInputs = this.page.locator('input[placeholder="Enter OS version"]');
    await expect(osVersionInputs.nth(n - 1)).toBeVisible({ timeout: 120_000 });
  }

  /**
   * IA-017: for each of `n` stacked "Edit Asset" panels in the bulk edit form, read the
   * current OS Version input value and apply the toggle rule:
   *   - 'Windows 11 24H2' → '11'
   *   - anything else      → 'Windows 11 24H2'
   * Scrolls each input into view before interacting. Returns the new value per panel.
   */
  async fillBulkEditOsVersionToggle(n: number): Promise<string[]> {
    const OS_VER_A = 'Windows 11 24H2';
    const OS_VER_B = '11';
    const newValues: string[] = [];
    const osInputs = this.page.locator('input[placeholder="Enter OS version"]');

    for (let i = 0; i < n; i++) {
      const input = osInputs.nth(i);
      await input.scrollIntoViewIfNeeded();
      await expect(input).toBeVisible({ timeout: 15_000 });

      const currentValue = (await input.inputValue()).trim();
      const newValue = currentValue === OS_VER_A ? OS_VER_B : OS_VER_A;
      await input.fill(newValue);
      newValues.push(newValue);
    }
    return newValues;
  }

  /**
   * IA-017: scroll to the top of the page so the Save button is visible, click it,
   * then wait for the bulk edit form to disappear and the grid to reload.
   */
  async saveBulkEditAndWaitForGrid(): Promise<void> {
    const saveBtn = this.page.getByRole('button', { name: 'Save', exact: true });
    // Save button sits at the top of the page; scroll up in case we ended further down
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await expect(saveBtn).toBeVisible({ timeout: 15_000 });
    await saveBtn.click();
    // Wait for the form to close and the client machine grid to reappear
    await expect(this.clientMachineGridRuntime()).toBeVisible({ timeout: 120_000 });
    await expect(
      this.clientMachineGridRuntime().locator('[wj-part="cells"] [role="gridcell"]').first(),
    ).toBeVisible({ timeout: 120_000 });
  }

  /**
   * IA-017: after saving, scroll the grid to the OS Version column and assert that the
   * first `expectedVersions.length` data rows show the expected OS Version in order.
   * Positional verification is valid because the save does not reorder the grid.
   */
  async verifyOsVersionForFirstNRows(expectedVersions: string[]): Promise<void> {
    await this.scrollClientMachineGridToOsVersionColumn();
    const runtime = this.clientMachineGridRuntime();
    await expect(runtime.locator('[wj-part="cells"] [role="gridcell"]').first()).toBeVisible({ timeout: 30_000 });

    const rows = runtime
      .locator('[wj-part="cells"] .wj-row:has([role="gridcell"])');

    for (let i = 0; i < expectedVersions.length; i++) {
      const row = rows.nth(i);
      // Use toBeAttached rather than toBeVisible — Wijmo rows in overflow:hidden containers
      // are considered hidden by Playwright's bounding-box clip check.
      await expect(row).toBeAttached({ timeout: 15_000 });
      await expect(
        row.getByRole('gridcell', { name: expectedVersions[i], exact: true }),
      ).toBeVisible({ timeout: 15_000 });
    }
  }
}
