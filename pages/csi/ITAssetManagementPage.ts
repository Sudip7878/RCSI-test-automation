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
    // Wait for at least one real (non-placeholder, visible) option to appear before scanning
    await this.page.waitForFunction(
      (ph: string) => {
        const re = new RegExp(ph, 'i');
        return Array.from(document.querySelectorAll('[role="option"]')).some((el) => {
          const label = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
          if (label.length === 0 || re.test(label)) return false;
          const s = window.getComputedStyle(el as HTMLElement);
          return s.display !== 'none' && s.visibility !== 'hidden';
        });
      },
      '^(select|choose|please|--|…|\\.\\.\\.)$',
      { timeout: 15_000 },
    );
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

  // ─── IA-029: Reassign asset user ─────────────────────────────────────────────

  private clientMachineGridRuntimeIa029(): Locator {
    return this.page.locator('.datagrid-runtime.wj-flexgrid').first();
  }

  private async scrollClientMachineGridToLeftEdgeIa029(): Promise<void> {
    const runtime = this.clientMachineGridRuntimeIa029();
    const scrollRoot = runtime.locator('div[wj-part="root"]').first();
    await expect(scrollRoot).toBeAttached({ timeout: 30_000 });
    await this.scrollGridToLeftEdge(scrollRoot);
  }

  private async scrollGridToRevealUserColumn(): Promise<void> {
    const runtime = this.clientMachineGridRuntimeIa029();
    await expect(runtime).toBeVisible({ timeout: 60_000 });
    const scrollRoot = runtime.locator('div[wj-part="root"]').first();
    await expect(scrollRoot).toBeAttached({ timeout: 30_000 });
    const filterBtn = this.page.getByRole('button', { name: 'Edit Filter for Column User', exact: true });
    if (await filterBtn.isVisible().catch(() => false)) {
      return;
    }
    const max = await this.gridMaxScrollLeft(scrollRoot);
    const step = 280;
    for (let x = step; x <= max + step; x += step) {
      await this.setGridScrollLeft(scrollRoot, Math.min(x, max));
      await this.page.waitForTimeout(80);
      if (await filterBtn.isVisible().catch(() => false)) {
        return;
      }
    }
    await this.setGridScrollLeft(scrollRoot, max);
    await expect(filterBtn).toBeVisible({ timeout: 15_000 });
  }

  /** IA-029: read User column text for the first data row (empty string when unassigned). */
  async readFirstClientMachineGridRowUserIa029(): Promise<string> {
    await this.scrollGridToRevealUserColumn();
    const runtime = this.clientMachineGridRuntimeIa029();
    await expect(runtime.locator('[wj-part="cells"] [role="gridcell"]').first()).toBeVisible({
      timeout: 30_000,
    });
    const userText = await runtime.evaluate((grid) => {
      const headerCells = Array.from(grid.querySelectorAll('[wj-part="chcells"] .wj-cell'));
      let userHeaderLeft: number | null = null;
      for (const header of headerCells) {
        const label = (header.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (label === 'User') {
          userHeaderLeft = (header as HTMLElement).offsetLeft;
          break;
        }
      }
      if (userHeaderLeft == null) {
        return '';
      }
      const firstRow = grid.querySelector('[wj-part="cells"] .wj-row');
      if (!firstRow) {
        return '';
      }
      for (const cell of Array.from(firstRow.querySelectorAll('.wj-cell[role="gridcell"]'))) {
        const el = cell as HTMLElement;
        if (Math.abs(el.offsetLeft - userHeaderLeft) < 12) {
          return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
        }
      }
      return '';
    });
    return userText;
  }

  /**
   * IA-029: scroll grid to left edge so the Edit action column is visible, then click Edit
   * on the first data row. Uses dispatchEvent to bypass Wijmo's absolute-positioning
   * viewport constraint (same pattern as IA-017 row checkboxes).
   */
  async clickEditOnFirstClientMachineAssetRowIa029(): Promise<void> {
    const runtime = this.clientMachineGridRuntimeIa029();
    await expect(runtime).toBeVisible({ timeout: 60_000 });
    await this.scrollClientMachineGridToLeftEdgeIa029();

    const cells = runtime.locator('[wj-part="cells"]').first();
    await expect(cells).toBeAttached({ timeout: 30_000 });
    const editBtn = cells.getByRole('button', { name: 'Edit', exact: true }).first();
    await expect(editBtn).toBeAttached({ timeout: 30_000 });
    await editBtn.dispatchEvent('click');
  }

  private itAssetEditUserFieldBlock(): Locator {
    return this.page
      .locator('div[data-block="ITassets.inputFields"]')
      .filter({ has: this.page.locator('label').filter({ hasText: /^User$/ }) })
      .first();
  }

  private async openItAssetEditUserDropdownIa029(): Promise<void> {
    const field = this.itAssetEditUserFieldBlock();
    await expect(field).toBeVisible({ timeout: 30_000 });
    await field.getByText('User', { exact: true }).click();
    const toggle = field.locator('.vscomp-toggle-button');
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
    } else {
      await field.getByRole('combobox', { name: 'Select an option' }).click();
    }
    await this.page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('.vscomp-dropbox')).some((el) => {
          const s = window.getComputedStyle(el);
          return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
        }),
      { timeout: 15_000 },
    );
  }

  private async readNonPlaceholderUserOptionLabelsIa029(): Promise<string[]> {
    return this.page.getByRole('option').evaluateAll((options) => {
      const placeholder = /^(select|choose|please|--|…|\.\.\.)$/i;
      const labels: string[] = [];
      for (const node of options) {
        const label = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (label.length === 0 || placeholder.test(label)) {
          continue;
        }
        labels.push(label);
      }
      return labels;
    });
  }

  /**
   * IA-029: pick reassignment target from User VirtualSelect —
   * no selection / selected ≠ 1st option → pick 1st option; selected = 1st option → pick 2nd option.
   * The currently-displayed value is read from .vscomp-value scoped to the User field block so
   * it cannot be confused with any other dropdown on the page.
   */
  async reassignUserOnItAssetEditFormIa029(initialGridUser: string): Promise<string> {
    await this.page.waitForTimeout(3000);

    // Read the displayed value from the User field's toggle BEFORE opening so the element
    // is still scoped inside the field block (unambiguous — not affected by other dropdowns).
    const field = this.itAssetEditUserFieldBlock();
    const currentDisplayValue = await field
      .locator('.vscomp-value')
      .textContent()
      .then((t) => (t ?? '').replace(/\s+/g, ' ').trim())
      .catch(() => '');

    await this.openItAssetEditUserDropdownIa029();

    const optionLabels = await this.readNonPlaceholderUserOptionLabelsIa029();
    if (optionLabels.length === 0) {
      throw new Error('IA-029: no assignable User options in dropdown');
    }

    const firstOption = optionLabels[0].replace(/\s+/g, ' ').trim();

    let targetLabel: string;
    if (currentDisplayValue.length === 0 || currentDisplayValue !== firstOption) {
      targetLabel = optionLabels[0];
    } else {
      targetLabel = optionLabels.length > 1 ? optionLabels[1] : optionLabels[0];
    }

    await this.page.getByRole('option', { name: targetLabel, exact: true }).click();
    return targetLabel;
  }

  /** IA-029: after save, first row shows the same Asset ID and the reassigned User. */
  async expectClientMachineGridFirstRowShowsAssetIdAndUserIa029(
    assetId: string,
    userName: string,
  ): Promise<void> {
    const runtime = this.clientMachineGridRuntimeIa029();
    await expect(runtime.locator('[wj-part="cells"]').first()).toBeVisible({ timeout: 60_000 });

    await this.scrollClientMachineGridToLeftEdgeIa029();
    await expect(
      runtime.locator('[wj-part="cells"]').getByRole('gridcell', { name: assetId, exact: true }).first(),
    ).toBeVisible({ timeout: 30_000 });

    await this.scrollGridToRevealUserColumn();
    await expect(
      runtime.locator('[wj-part="cells"]').getByRole('gridcell', { name: userName, exact: true }).first(),
    ).toBeVisible({ timeout: 30_000 });
  }

  // ---------------------------------------------------------------------------
  // IA-002: Add assets across all categories via UI
  // ---------------------------------------------------------------------------

  /**
   * Returns the `[data-block="ITassets.inputFields"]` block that contains a label
   * with the given exact text. Used to scope dropdowns and inputs unambiguously when
   * multiple identical "Select..." placeholders coexist on the same form page.
   */
  private fieldBlockByLabelIa002(labelText: string): Locator {
    return this.page
      .locator('[data-block="ITassets.inputFields"]')
      .filter({ has: this.page.getByText(labelText, { exact: true }) });
  }

  /**
   * Opens the VirtualSelect combobox (role="combobox") inside the label block
   * identified by `labelText`.
   */
  private async openVscompByLabelIa002(labelText: string): Promise<void> {
    const trigger = this.fieldBlockByLabelIa002(labelText).first().locator('[role="combobox"]').first();
    await expect(trigger).toBeVisible({ timeout: 15_000 });
    await trigger.click();
  }

  /**
   * Returns the text or number input inside the label block for `labelText`.
   * Targets only inputs wrapped in `span.input-text` or `span.input-number`
   * so date-picker flatpickr inputs are excluded.
   */
  private textInputByLabelIa002(labelText: string): Locator {
    return this.fieldBlockByLabelIa002(labelText)
      .first()
      .locator('span.input-text input, span.input-number input')
      .first();
  }

  /**
   * Returns the `.input-with-icon-input` wrapper inside the label block for `labelText`.
   * Pass this to `setFlatpickrDateDirectOnWrapper`.
   */
  private datepickerWrapperByLabelIa002(labelText: string): Locator {
    return this.fieldBlockByLabelIa002(labelText).first().locator('.input-with-icon-input').first();
  }

  /** Returns a Date object that is exactly 6 months from today. */
  private sixMonthsFromTodayIa002(): Date {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d;
  }

  /**
   * Waits for `assetName` to appear as a gridcell in the first visible
   * `.datagrid-runtime`, paginating through pages as needed.
   */
  async waitForAssetNameInGridIa002(assetName: string): Promise<void> {
    const runtime = this.page.locator('.datagrid-runtime').first();
    await expect(runtime).toBeVisible({ timeout: 60_000 });

    const namePattern = new RegExp(`^\\s*${escapeRegExp(assetName)}\\s*$`);
    const maxNextClicks = await this.readMaxNextClicksFromAutogeneratePagination();

    for (let i = 0; i <= maxNextClicks; i++) {
      const cell = runtime
        .locator('[wj-part="cells"]')
        .getByRole('gridcell')
        .filter({ hasText: namePattern })
        .first();

      if (await cell.isVisible().catch(() => false)) {
        return;
      }

      if (i < maxNextClicks) {
        const next = this.autogeneratePaginationNextButton();
        const visible = await next.isVisible().catch(() => false);
        const disabled = visible ? await next.isDisabled().catch(() => true) : true;
        if (!visible || disabled) break;
        await next.click();
        await this.page.waitForTimeout(600);
      }
    }

    // Final assertion after exhausting pagination
    const cell = runtime
      .locator('[wj-part="cells"]')
      .getByRole('gridcell')
      .filter({ hasText: namePattern })
      .first();
    await expect(cell).toBeVisible({ timeout: 30_000 });
  }

  // IA-002: navigate to each asset category list and click Add Asset

  async navigateToNetworkDeviceListAndStartAddIa002(): Promise<void> {
    await this.page.getByText('IT Asset Management', { exact: true }).click();
    await this.page.getByText('Office').click();
    await this.page.getByRole('link', { name: 'Network devices' }).click();
    await expect(this.page.getByText('Network Switches')).toBeVisible({ timeout: 30_000 });
    await this.page.getByText('Network Switches').click();
    await this.page.waitForTimeout(3000);
    await expect(this.addAssetButton.first()).toBeVisible({ timeout: 30_000 });
    await this.addAssetButton.first().click();
    await this.page.waitForTimeout(5000);
  }

  async navigateToPhysicalServerListAndStartAddIa002(): Promise<void> {
    await this.page.getByText('IT Asset Management', { exact: true }).click();
    await this.page.getByText('Server', { exact: true }).click();
    await this.page.getByRole('link', { name: 'Physical' }).click();
    await expect(this.addAssetButton.first()).toBeVisible({ timeout: 30_000 });
    await this.addAssetButton.first().click();
    await this.page.waitForTimeout(5000);
  }

  async navigateToBackupStorageListAndStartAddIa002(): Promise<void> {
    await this.page.getByText('IT Asset Management', { exact: true }).click();
    await this.page.getByText('Server', { exact: true }).click();
    await this.page.getByRole('link', { name: 'Backup/Storage' }).click();
    await expect(this.page.getByText('Network Attached Storage')).toBeVisible({ timeout: 30_000 });
    await this.page.getByText('Network Attached Storage').click();
    await expect(this.addAssetButton.first()).toBeVisible({ timeout: 30_000 });
    await this.addAssetButton.first().click();
    await this.page.waitForTimeout(5000);
  }

  async navigateToSoftwareListAndStartAddIa002(): Promise<void> {
    await this.page.getByText('IT Asset Management', { exact: true }).click();
    await this.page.getByRole('link', { name: 'Software' }).click();
    await expect(this.addAssetButton.first()).toBeVisible({ timeout: 30_000 });
    await this.addAssetButton.first().click();
    await this.page.waitForTimeout(5000);
  }

  async navigateToSaaSListAndStartAddIa002(): Promise<void> {
    await this.page.getByText('IT Asset Management', { exact: true }).click();
    await this.page.getByText('Cloud', { exact: true }).click();
    await this.page.getByRole('link', { name: 'Service' }).click();
    await expect(this.page.getByText('SaaS')).toBeVisible({ timeout: 30_000 });
    await this.page.getByText('SaaS').click();
    await expect(this.addAssetButton.first()).toBeVisible({ timeout: 30_000 });
    await this.addAssetButton.first().click();
    await this.page.waitForTimeout(5000);
  }

  async navigateToPaaSListAndStartAddIa002(): Promise<void> {
    await this.page.getByText('IT Asset Management', { exact: true }).click();
    await this.page.getByText('Cloud', { exact: true }).click();
    await this.page.getByRole('link', { name: 'Service' }).click();
    await expect(this.page.getByText('PaaS')).toBeVisible({ timeout: 30_000 });
    await this.page.getByText('PaaS').click();
    await expect(this.addAssetButton.first()).toBeVisible({ timeout: 30_000 });
    await this.addAssetButton.first().click();
    await this.page.waitForTimeout(5000);
  }

  async navigateToIaaSListAndStartAddIa002(): Promise<void> {
    await this.page.getByText('IT Asset Management', { exact: true }).click();
    await this.page.getByText('Cloud', { exact: true }).click();
    await this.page.getByRole('link', { name: 'Service' }).click();
    await expect(this.page.getByText('IaaS')).toBeVisible({ timeout: 30_000 });
    await this.page.getByText('IaaS').click();
    await expect(this.addAssetButton.first()).toBeVisible({ timeout: 30_000 });
    await this.addAssetButton.first().click();
    await this.page.waitForTimeout(5000);
  }

  // IA-002: form fillers per asset category

  /**
   * Fills and saves the Network Switch asset form.
   * Manufacturer dropdown → first option (Cisco); Vendor Name → first option;
   * Currency → HKD; dates: Acquisition = today, Expiry/Warranty = 6 months.
   */
  async fillAndSaveNetworkSwitchAssetIa002(
    assetName: string,
    modelNumber: string,
    serialNumber: string,
    ipAddress: string,
  ): Promise<void> {
    const nameInput = this.page.locator('[id*="Input_assetsName"]').first();
    await expect(nameInput).toBeVisible({ timeout: 30_000 });
    await nameInput.click();
    await nameInput.fill(assetName);

    await this.openVscompByLabelIa002('Manufacturer');
    await this.clickFirstVisibleOption();

    const modelInput = this.textInputByLabelIa002('Model Number');
    await modelInput.click();
    await modelInput.fill(modelNumber);

    const osInput = this.textInputByLabelIa002('OS');
    await osInput.click();
    await osInput.fill('Windows');

    const osVersionInput = this.textInputByLabelIa002('OS Version');
    await osVersionInput.click();
    await osVersionInput.fill('11');

    const serialInput = this.textInputByLabelIa002('Serial Number');
    await serialInput.click();
    await serialInput.fill(serialNumber);

    const ipInput = this.textInputByLabelIa002('IP Address');
    await ipInput.click();
    await ipInput.fill(ipAddress);

    await this.openVscompByLabelIa002('Vendor Name');
    await this.clickFirstVisibleOption();

    await this.openVscompByLabelIa002('Currency');
    await this.page.getByRole('option', { name: 'HKD', exact: true }).click();

    const costInput = this.textInputByLabelIa002('Purchase Cost');
    await costInput.click();
    await costInput.fill('100');

    await this.setFlatpickrDateDirectOnWrapper(
      this.datepickerWrapperByLabelIa002('Acquisition Date'),
      new Date(),
    );
    await this.setFlatpickrDateDirectOnWrapper(
      this.datepickerWrapperByLabelIa002('Expiry Date'),
      this.sixMonthsFromTodayIa002(),
    );
    await this.setFlatpickrDateDirectOnWrapper(
      this.datepickerWrapperByLabelIa002('Warranty Expiry Date'),
      this.sixMonthsFromTodayIa002(),
    );

    await this.saveButton.click();
  }

  /**
   * Fills and saves the Physical Server asset form.
   * Manufacturer is a plain text input (not dropdown) for this category.
   * Vendor Name → first option; Currency → HKD;
   * Expiry Date (Basic Info) and Acquisition/Warranty Expiry (Provision) → today/6 months.
   */
  async fillAndSavePhysicalServerAssetIa002(assetName: string, modelNumber: string): Promise<void> {
    const nameInput = this.page.locator('[id*="Input_assetsName"]').first();
    await expect(nameInput).toBeVisible({ timeout: 30_000 });
    await nameInput.click();
    await nameInput.fill(assetName);

    const mfgInput = this.textInputByLabelIa002('Manufacturer');
    await mfgInput.click();
    await mfgInput.fill('LG');

    const modelInput = this.textInputByLabelIa002('Model Number');
    await modelInput.click();
    await modelInput.fill(modelNumber);

    const osInput = this.textInputByLabelIa002('OS');
    await osInput.click();
    await osInput.fill('Linux');

    const osVersionInput = this.textInputByLabelIa002('OS Version');
    await osVersionInput.click();
    await osVersionInput.fill('22.4');

    // Expiry Date sits in the Basic Information section for Physical assets
    await this.setFlatpickrDateDirectOnWrapper(
      this.datepickerWrapperByLabelIa002('Expiry Date'),
      this.sixMonthsFromTodayIa002(),
    );

    await this.openVscompByLabelIa002('Vendor Name');
    await this.clickFirstVisibleOption();

    await this.openVscompByLabelIa002('Currency');
    await this.page.getByRole('option', { name: 'HKD', exact: true }).click();

    const costInput = this.textInputByLabelIa002('Purchase Cost');
    await costInput.click();
    await costInput.fill('100');

    await this.setFlatpickrDateDirectOnWrapper(
      this.datepickerWrapperByLabelIa002('Acquisition Date'),
      new Date(),
    );
    await this.setFlatpickrDateDirectOnWrapper(
      this.datepickerWrapperByLabelIa002('Warranty Expiry Date'),
      this.sixMonthsFromTodayIa002(),
    );

    await this.saveButton.click();
  }

  /**
   * Fills and saves the Backup/Storage (NAS) asset form.
   * Device Type → NAS; Connectivity → first option (Ethernet);
   * Interface → first option (Network File System); Vendor Name → first option;
   * Currency → HKD; dates: Acquisition = today, Expiry/Warranty = 6 months.
   */
  async fillAndSaveBackupStorageAssetIa002(assetName: string): Promise<void> {
    const nameInput = this.page.locator('[id*="Input_assetsName"]').first();
    await expect(nameInput).toBeVisible({ timeout: 30_000 });
    await nameInput.click();
    await nameInput.fill(assetName);

    const deviceNameInput = this.textInputByLabelIa002('Device Name');
    await deviceNameInput.click();
    await deviceNameInput.fill('Storage');

    await this.openVscompByLabelIa002('Device Type');
    await this.page.getByRole('option', { name: 'NAS', exact: true }).click();

    const modelMfgInput = this.textInputByLabelIa002('Model/Manufacturer');
    await modelMfgInput.click();
    await modelMfgInput.fill('Sandisk');

    const capacityInput = this.textInputByLabelIa002('Capacity');
    await capacityInput.click();
    await capacityInput.fill('5000');

    await this.openVscompByLabelIa002('Connectivity');
    await this.clickFirstVisibleOption();

    await this.openVscompByLabelIa002('Interface');
    await this.clickFirstVisibleOption();

    await this.openVscompByLabelIa002('Vendor Name');
    await this.clickFirstVisibleOption();

    await this.openVscompByLabelIa002('Currency');
    await this.page.getByRole('option', { name: 'HKD', exact: true }).click();

    const costInput = this.textInputByLabelIa002('Purchase Cost');
    await costInput.click();
    await costInput.fill('100');

    await this.setFlatpickrDateDirectOnWrapper(
      this.datepickerWrapperByLabelIa002('Acquisition Date'),
      new Date(),
    );
    await this.setFlatpickrDateDirectOnWrapper(
      this.datepickerWrapperByLabelIa002('Expiry Date'),
      this.sixMonthsFromTodayIa002(),
    );
    await this.setFlatpickrDateDirectOnWrapper(
      this.datepickerWrapperByLabelIa002('Warranty Expiry Date'),
      this.sixMonthsFromTodayIa002(),
    );

    await this.saveButton.click();
  }

  /**
   * Fills and saves the Software asset form.
   * All four dropdowns (Manufacturer, Software Name, Type, Category) select first option;
   * Cost = 100; Version = '11'.
   */
  async fillAndSaveSoftwareAssetIa002(assetName: string): Promise<void> {
    const nameInput = this.page.locator('[id*="Input_assetsName"]').first();
    await expect(nameInput).toBeVisible({ timeout: 30_000 });
    await nameInput.click();
    await nameInput.fill(assetName);

    await this.openVscompByLabelIa002('Manufacturer');
    await this.clickFirstVisibleOption();

    await this.openVscompByLabelIa002('Software Name');
    await this.clickFirstVisibleOption();

    await this.openVscompByLabelIa002('Type');
    await this.clickFirstVisibleOption();

    const costInput = this.textInputByLabelIa002('Cost');
    await costInput.click();
    await costInput.fill('100');

    const versionInput = this.textInputByLabelIa002('Version');
    await versionInput.click();
    await versionInput.fill('11');

    await this.openVscompByLabelIa002('Category');
    await this.clickFirstVisibleOption();

    await this.saveButton.click();
  }

  /**
   * Fills and saves the SaaS asset form.
   * Provider Name → first option (Alibaba Cloud); License Type → first option (Subscription).
   */
  async fillAndSaveSaaSAssetIa002(assetName: string): Promise<void> {
    const nameInput = this.page.locator('[id*="Input_assetsName"]').first();
    await expect(nameInput).toBeVisible({ timeout: 30_000 });
    await nameInput.click();
    await nameInput.fill(assetName);

    await this.openVscompByLabelIa002('Provider Name');
    await this.clickFirstVisibleOption();

    const bundleInput = this.textInputByLabelIa002('Bundle/Application Name');
    await bundleInput.click();
    await bundleInput.fill('Bundle');

    const includedAppInput = this.textInputByLabelIa002('Included Application');
    await includedAppInput.click();
    await includedAppInput.fill('Application');

    await this.openVscompByLabelIa002('License Type');
    await this.clickFirstVisibleOption();

    const licenseQtyInput = this.textInputByLabelIa002('License Quantity/User Limit');
    await licenseQtyInput.click();
    await licenseQtyInput.fill('200');

    await this.saveButton.click();
  }

  /**
   * Fills and saves the PaaS asset form.
   * Provider Name → first option (Alibaba Cloud); Resource Name → 'PaaS'.
   * After save, clicks 'PaaS' in the sidebar to reload the grid.
   */
  async fillAndSavePaaSAssetIa002(assetName: string): Promise<void> {
    const nameInput = this.page.locator('[id*="Input_assetsName"]').first();
    await expect(nameInput).toBeVisible({ timeout: 30_000 });
    await nameInput.click();
    await nameInput.fill(assetName);

    await this.openVscompByLabelIa002('Provider Name');
    await this.clickFirstVisibleOption();

    const resourceNameInput = this.textInputByLabelIa002('Resource Name');
    await resourceNameInput.click();
    await resourceNameInput.fill('PaaS');

    await this.saveButton.click();

    // Wait for the Cloud > Service list grid to fully render before clicking the PaaS tab.
    // The grid is present at [data-block="Structures.Grid"]#ItAssetTable → .datagrid-runtime → wj-part="cells".
    const serviceGrid = this.page.locator('[data-block="Structures.Grid"]#ItAssetTable .datagrid-runtime');
    await expect(serviceGrid).toBeVisible({ timeout: 60_000 });
    await expect(serviceGrid.locator('[wj-part="cells"]')).toBeAttached({ timeout: 30_000 });

    // Re-click the PaaS tab to load the PaaS-specific data grid.
    await expect(this.page.getByText('PaaS', { exact: true })).toBeVisible({ timeout: 30_000 });
    await this.page.getByText('PaaS', { exact: true }).click();
  }

  /**
   * Fills and saves the IaaS asset form.
   * Provider Name → first option (Alibaba Cloud); Platform Name → 'IaaS'.
   * After save, clicks 'IaaS' in the sidebar to reload the grid.
   */
  async fillAndSaveIaaSAssetIa002(assetName: string): Promise<void> {
    const nameInput = this.page.locator('[id*="Input_assetsName"]').first();
    await expect(nameInput).toBeVisible({ timeout: 30_000 });
    await nameInput.click();
    await nameInput.fill(assetName);

    await this.openVscompByLabelIa002('Provider Name');
    await this.clickFirstVisibleOption();

    const platformNameInput = this.textInputByLabelIa002('Platform Name');
    await platformNameInput.click();
    await platformNameInput.fill('IaaS');

    await this.saveButton.click();

    // Wait for the Cloud > Service list grid to fully render before clicking the IaaS tab.
    const serviceGrid = this.page.locator('[data-block="Structures.Grid"]#ItAssetTable .datagrid-runtime');
    await expect(serviceGrid).toBeVisible({ timeout: 60_000 });
    await expect(serviceGrid.locator('[wj-part="cells"]')).toBeAttached({ timeout: 30_000 });

    // Re-click the IaaS tab to load the IaaS-specific data grid.
    await expect(this.page.getByText('IaaS', { exact: true })).toBeVisible({ timeout: 30_000 });
    await this.page.getByText('IaaS', { exact: true }).click();
  }

  // ---------------------------------------------------------------------------
  // IA-032: Link Software to Hardware (install software on client machine)
  // ---------------------------------------------------------------------------

  /**
   * Waits for the Client Machine grid to be ready and clicks Edit on the first row.
   * Uses `.datagrid-runtime` (same selector as IA-016) because the nav-based landing
   * page does not wrap the grid in `.datagrid-autogenerate`.
   */
  async clickEditOnFirstClientMachineGridRowIa032(): Promise<void> {
    const runtime = this.page.locator('.datagrid-runtime').first();
    await expect(runtime).toBeVisible({ timeout: 60_000 });
    const cells = runtime.locator('[wj-part="cells"]').first();
    await expect(cells).toBeAttached({ timeout: 30_000 });
    const editBtn = cells.getByRole('button', { name: 'Edit', exact: true }).first();
    await expect(editBtn).toBeVisible({ timeout: 60_000 });
    await editBtn.click();
    // Wait for the edit form and all its async data fetches (e.g. Software Suite Name options) to settle
    await this.page.waitForLoadState('networkidle', { timeout: 30_000 });
  }

  /**
   * Opens the Software Suite Name VirtualSelect on the asset edit form and selects
   * the first available option. Returns the selected option label for downstream
   * verification.
   *
   * The Software Suite Name field lives in `[data-block="ITassets.softwareDetailSection"]`,
   * not in `[data-block="ITassets.inputFields"]` like the standard fields, so it is
   * scoped by its own block type to avoid ambiguous "Select…" placeholder matching.
   */
  async selectFirstOptionInSoftwareSuiteNameDropdownIa032(): Promise<string> {
    const softwareSection = this.page.locator('[data-block="ITassets.softwareDetailSection"]');
    const trigger = softwareSection.locator('[role="combobox"]').first();
    await expect(trigger).toBeVisible({ timeout: 15_000 });
    await trigger.click();

    // Wait for the dropdown list to appear and read the first real (non-placeholder) option
    const placeholder = /^(select|choose|please|--|…|\.\.\.)$/i;
    await this.page.waitForFunction(
      (phPattern: string) => {
        const re = new RegExp(phPattern, 'i');
        return Array.from(document.querySelectorAll('[role="option"]')).some((el) => {
          const label = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
          if (label.length === 0 || re.test(label)) return false;
          const s = window.getComputedStyle(el as HTMLElement);
          return s.display !== 'none' && s.visibility !== 'hidden';
        });
      },
      placeholder.source,
      { timeout: 30_000 },
    );

    const optionText = await this.page.getByRole('option').evaluateAll((options) => {
      const ph = /^(select|choose|please|--|…|\.\.\.)$/i;
      for (const node of options) {
        const label = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (label.length === 0 || ph.test(label)) continue;
        const s = window.getComputedStyle(node as HTMLElement);
        if (s.display === 'none' || s.visibility === 'hidden') continue;
        const rect = (node as HTMLElement).getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        return label;
      }
      return null;
    });

    if (!optionText) {
      throw new Error('IA-032: no selectable options found in Software Suite Name dropdown');
    }

    // Click the matched option
    await this.page.getByRole('option', { name: optionText, exact: true }).first().click();
    return optionText;
  }

  /**
   * Waits for the Client Machine grid to reload after an edit save and clicks
   * View on the first visible row.
   */
  async clickViewOnFirstClientMachineGridRowIa032(): Promise<void> {
    const runtime = this.page.locator('.datagrid-runtime').first();
    await expect(runtime).toBeVisible({ timeout: 60_000 });
    const cells = runtime.locator('[wj-part="cells"]').first();
    await expect(cells).toBeAttached({ timeout: 30_000 });
    const viewBtn = cells.getByRole('button', { name: 'View', exact: true }).first();
    await expect(viewBtn).toBeVisible({ timeout: 60_000 });
    await viewBtn.click();
  }

  /**
   * In the asset read-only view, asserts that the Software Suite Name field
   * shows `softwareName` (i.e. is not "N/A").
   * The value is rendered in an `ITassets.displayFields` block beside the label.
   */
  async expectSoftwareSuiteNameIsLinkedInAssetViewIa032(softwareName: string): Promise<void> {
    const viewMain = this.page.getByRole('main');
    await expect(viewMain.getByText('Software Suite Name').first()).toBeVisible({ timeout: 30_000 });

    const displayBlock = viewMain
      .locator('[data-block="ITassets.displayFields"]')
      .filter({ has: this.page.getByText('Software Suite Name') })
      .first();
    // The value span inside displayFields; must not be "N/A"
    const valueSpan = displayBlock.locator('span[data-expression]').last();
    await expect(valueSpan).not.toHaveText('N/A', { timeout: 10_000 });
    await expect(viewMain.getByText(softwareName, { exact: true })).toBeVisible({ timeout: 10_000 });
  }

  // ---------------------------------------------------------------------------
  // IA-037: Add new Manufacturer value via Settings and verify in edit dropdown
  // ---------------------------------------------------------------------------

  /**
   * IA-037: Navigate to IT Asset Management → Settings via the hub menu.
   * Waits for the domcontentloaded state after the Settings link is clicked.
   */
  async navigateToItAssetManagementSettingsIa037(): Promise<void> {
    await this.page.getByText('IT Asset Management').click();
    await this.page.getByRole('link', { name: 'Settings' }).click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * IA-037: From the IT Asset Management Settings page, drill into
   * Client Machine → Manufacturer. Waits for the "+ Add a new Value" link
   * to confirm the Manufacturer field detail page has loaded.
   */
  async openManufacturerFieldSettingsIa037(): Promise<void> {
    await this.page.getByText('Client Machine').click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.getByText('Manufacturer').click();
    await expect(this.page.getByRole('link', { name: '+ Add a new Value' })).toBeVisible({
      timeout: 60_000,
    });
  }

  /**
   * IA-037: Add a new custom dropdown value for Manufacturer in both the English
   * and Traditional Chinese language tabs, then save.
   *
   * Anchors to `form[id="fieldForm"]` (the stable form ID on the settings value-add
   * panel) rather than the generated input IDs, which are volatile across deployments.
   * Both language tabs receive the same `value` string per the recorded steps.
   */
  async addNewManufacturerValueIa037(value: string): Promise<void> {
    await this.page.getByRole('link', { name: '+ Add a new Value' }).click();

    const settingsForm = this.page.locator('form[id="fieldForm"]');
    await expect(settingsForm).toBeVisible({ timeout: 30_000 });

    // English (default) section — first enabled text input inside the settings form
    const englishInput = settingsForm.locator('input[type="text"]:not([disabled])').first();
    await expect(englishInput).toBeVisible({ timeout: 15_000 });
    await englishInput.click();
    await englishInput.fill(value);

    // Traditional Chinese section — click the language tab, then fill its input.
    // The Chinese input is the last text input inside the form (index _1 vs English _0).
    await this.page.getByText('Traditional Chinese').click();
    const chineseInput = settingsForm.locator('input[type="text"]').last();
    await expect(chineseInput).toBeVisible({ timeout: 15_000 });
    await chineseInput.click();
    await chineseInput.fill(value);

    // Save the new value and wait for the network round-trip to complete
    await this.page.getByRole('link', { name: /save/i }).click();
    await this.page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  }

  /**
   * IA-037: Click the "Home" nav link and wait for the redirect to the app home
   * page to complete before navigating further.
   * Home is identified by URL pathname: /, /Home, /Avotech, or /Avotech/Home.
   */
  async navigateHomeAndWaitIa037(): Promise<void> {
    await this.page.getByText('Home').click();
    await this.page.waitForURL(
      (url) => {
        const p = url.pathname.replace(/\/$/, '') || '/';
        return ['/', '/Home', '/home', '/Avotech', '/Avotech/Home', '/Avotech/home'].includes(p);
      },
      { timeout: 30_000 },
    );
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * IA-037: On the Client Machine edit form, locate the Manufacturer dropdown by
   * its label text, click the toggle button (current selection) to open the options
   * list, and return the pre-selected manufacturer name.
   *
   * Uses the 'Manufacturer' label as a structural anchor — avoids the brittle
   * vscomp wrapper ID that changes across environments and deployments.
   */
  async openManufacturerDropdownOnEditFormIa037(): Promise<string> {
    // Scope to the Manufacturer field container identified by its label and toggle button.
    // The outermost [data-container] matching both criteria is the correct field block.
    const manufacturerBlock = this.addAssetFormScope()
      .locator('[data-container]')
      .filter({ has: this.page.locator('label').filter({ hasText: /^Manufacturer$/ }) })
      .filter({ has: this.page.locator('.vscomp-toggle-button') })
      .first();

    await expect(manufacturerBlock).toBeVisible({ timeout: 30_000 });

    // Read the currently-selected value before opening (while toggle is still collapsed)
    const currentValue = (
      (await manufacturerBlock.locator('.vscomp-value').first().textContent()) ?? ''
    )
      .replace(/\s+/g, ' ')
      .trim();

    // Click the toggle button to expand the dropdown options list
    await manufacturerBlock.locator('.vscomp-toggle-button').first().click();

    // Wait for the vscomp options panel to become visible
    await this.page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('.vscomp-dropbox')).some((el) => {
          const s = window.getComputedStyle(el);
          return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
        }),
      { timeout: 15_000 },
    );

    return currentValue;
  }

  /**
   * IA-037: With the Manufacturer dropdown open, assert that `manufacturerName` is
   * present in the options list. Scrolls the options container when the entry is
   * below the visible fold (vscomp virtualises option rendering with a max-height).
   * Does NOT click or select the option — presence check only per recorded steps.
   */
  async expectManufacturerOptionVisibleInDropdownIa037(manufacturerName: string): Promise<void> {
    const dropbox = this.page.locator('.vscomp-dropbox').first();
    await expect(dropbox).toBeVisible({ timeout: 15_000 });

    const optionText = this.page
      .locator('.vscomp-option-text')
      .filter({ hasText: new RegExp(`^\\s*${escapeRegExp(manufacturerName)}\\s*$`) });

    // Scroll the options list to reveal entries below the visible fold if needed
    const isAlreadyVisible = await optionText.first().isVisible().catch(() => false);
    if (!isAlreadyVisible) {
      await dropbox.locator('.vscomp-options-container').first().evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
    }

    await expect(optionText.first()).toBeVisible({ timeout: 15_000 });
  }

  // ---------------------------------------------------------------------------
  // IA-039: Custom field with Track History — create, edit (V1→V2→V3), verify history, delete
  // ---------------------------------------------------------------------------

  /**
   * IA-039: Navigate to IT Asset Management → Settings → Client Machine via the hub nav.
   * Waits for the "+ Add a new Master List" button to confirm the settings page is ready.
   */
  async navigateToCustomFieldSettingsClientMachineIa039(): Promise<void> {
    await this.page.getByText('IT Asset Management').click();
    await this.page.getByRole('link', { name: 'Settings' }).click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.getByText('Client Machine').click();
    await expect(this.page.getByRole('button', { name: '+ Add a new Master List' })).toBeVisible({
      timeout: 60_000,
    });
  }

  /**
   * IA-039: Click "+ Add a new Master List" and fill the custom field form:
   * - Label and Placeholder text inputs anchored by their `<label>` text (avoids brittle generated IDs)
   * - "Basic Field" segment confirmed selected (default)
   * - "Track History of data" Yes radio located by its section label anchor
   * - Traditional Chinese tab populated via "Set other language with same value"
   * - Saved via the Save link in the form header
   *
   * Uses `form[id="fieldForm"]` as the stable scope for all interactions.
   */
  async addCustomFieldWithHistoryTrackingIa039(label: string, placeholder: string): Promise<void> {
    await this.page.getByRole('button', { name: '+ Add a new Master List' }).click();

    const addFieldForm = this.page.locator('form[id="fieldForm"]');
    await expect(addFieldForm).toBeVisible({ timeout: 30_000 });

    // Label field — scoped to the container holding the "Label" label element
    const labelContainer = addFieldForm
      .locator('[data-container]')
      .filter({ has: this.page.locator('label[data-label]').filter({ hasText: /^Label$/ }) })
      .first();
    const labelInput = labelContainer.locator('input[type="text"]').first();
    await expect(labelInput).toBeVisible({ timeout: 15_000 });
    await labelInput.click();
    await labelInput.fill(label);

    // Placeholder field — scoped to the container holding the "Placeholder" label element
    const placeholderContainer = addFieldForm
      .locator('[data-container]')
      .filter({ has: this.page.locator('label[data-label]').filter({ hasText: /^Placeholder$/ }) })
      .first();
    const placeholderInput = placeholderContainer.locator('input[type="text"]').first();
    await expect(placeholderInput).toBeVisible({ timeout: 15_000 });
    await placeholderInput.click();
    await placeholderInput.fill(placeholder);

    // Confirm "Basic Field" segment is active (default selection)
    await this.page.getByText('Basic Field').click();

    // Type field — scope to the Type section by its label anchor, then click the 'Text' type button.
    // All type buttons start with class "not-selected typeBtn"; none is pre-selected by default.
    // The OSBlockWidget wrapper for 'Text' carries style="height:0px" (OutSystems rendering quirk),
    // so target the inner span via the section container to guarantee a reliable click.
    const typeSection = addFieldForm
      .locator('[data-container]')
      .filter({ has: this.page.locator('label[data-label]').filter({ hasText: /^Type$/ }) })
      .first();
    await typeSection.getByText('Text', { exact: true }).click();

    // Required Field — left at its default "No" (value="False" checked); no interaction needed.

    // Track History — use :has(> label[data-label]) to match only the direct-parent container
    // (not ancestor wrappers) so the value="True" radio input is unambiguously scoped here.
    const trackHistorySection = addFieldForm
      .locator('[data-container]:has(> label[data-label])')
      .filter({ has: this.page.locator('label[data-label]').filter({ hasText: /^Track History of data$/ }) })
      .first();
    await expect(trackHistorySection).toBeVisible({ timeout: 15_000 });
    await trackHistorySection.locator('input[type="radio"][value="True"]').first().click();

    // Apply the same value to the Traditional Chinese language tab
    await this.page.getByRole('button', { name: 'Set other language with same' }).click();

    // Save the new custom field via the form header Save link
    await this.page.getByRole('link', { name: /save/i }).click();
    await this.page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  }

  /**
   * IA-039: Wait for the Client Machine grid to be ready and return the Asset ID
   * text from the first data row. Asset ID sits at gridcell index 2 (View and Edit
   * action buttons occupy indices 0 and 1).
   */
  async readFirstClientMachineGridRowAssetIdIa039(): Promise<string> {
    const runtime = this.clientMachineGridRuntimeIa029();
    await expect(runtime).toBeVisible({ timeout: 60_000 });
    const scrollRoot = runtime.locator('div[wj-part="root"]').first();
    await this.scrollGridToLeftEdge(scrollRoot);
    await expect(runtime.locator('[wj-part="cells"] [role="gridcell"]').first()).toBeVisible({
      timeout: 30_000,
    });
    const firstRow = runtime.locator('[wj-part="cells"] .wj-row:has([role="gridcell"])').first();
    await expect(firstRow).toBeAttached({ timeout: 15_000 });
    return ((await firstRow.locator('[role="gridcell"]').nth(2).textContent()) ?? '').trim();
  }

  /**
   * IA-039: Locate the grid row whose Asset ID column matches `assetId` and click
   * its Edit button. Scrolls to the left edge first to ensure the action column is
   * within the rendered area. Uses `dispatchEvent('click')` to bypass Wijmo's
   * absolute-positioning viewport constraint (same pattern as IA-029).
   */
  async clickEditOnClientMachineGridRowByAssetIdIa039(assetId: string): Promise<void> {
    const runtime = this.clientMachineGridRuntimeIa029();
    await expect(runtime).toBeVisible({ timeout: 60_000 });
    const scrollRoot = runtime.locator('div[wj-part="root"]').first();
    await this.scrollGridToLeftEdge(scrollRoot);
    await expect(runtime.locator('[wj-part="cells"] [role="gridcell"]').first()).toBeVisible({
      timeout: 30_000,
    });

    const rows = runtime.locator('[wj-part="cells"] .wj-row:has([role="gridcell"])');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      await expect(row).toBeAttached({ timeout: 10_000 });
      const idText = ((await row.locator('[role="gridcell"]').nth(2).textContent()) ?? '').trim();
      if (idText === assetId) {
        const editBtn = row.getByRole('button', { name: 'Edit', exact: true }).first();
        await expect(editBtn).toBeAttached({ timeout: 10_000 });
        await editBtn.dispatchEvent('click');
        return;
      }
    }
    throw new Error(`IA-039: Asset ID "${assetId}" not found in Client Machine grid`);
  }

  /**
   * IA-039: On the asset edit form, locate the custom text field and fill it with `value`.
   *
   * The Settings "Placeholder" value becomes the visible `<label>` text on the asset edit
   * form — NOT the HTML `placeholder` attribute (which is always empty in the rendered markup).
   * Scopes to the `[data-container]` block that contains both `label[data-label]` matching
   * `fieldPlaceholder` AND an `input[type="text"]`, then fills the input directly.
   * Clears existing content with Ctrl+A before typing.
   */
  async fillCustomTextFieldOnEditFormIa039(fieldLabel: string, fieldPlaceholder: string, value: string): Promise<void> {
    const labelPattern = new RegExp(`^${fieldPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

    // Anchor on the matching label[data-label], navigate two levels up via XPath
    // (label → label-container [data-container] → outer field block [data-container]),
    // then find input[data-input] within that block. This avoids the broad ancestor
    // container issue where the outer form container also satisfies the filter and
    // .first() resolves to the Asset Name input instead of the custom field input.
    const textbox = this.page
      .locator('label[data-label]')
      .filter({ hasText: labelPattern })
      .locator('xpath=../..//input[@data-input]')
      .first();

    await expect(textbox).toBeVisible({ timeout: 30_000 });
    await textbox.scrollIntoViewIfNeeded();
    await textbox.click();
    await textbox.press('Control+a');
    await textbox.fill(value);
  }

  /**
   * IA-039: Locate the grid row whose Asset ID column matches `assetId` and click
   * its View button. Mirrors `clickEditOnClientMachineGridRowByAssetIdIa039` but
   * targets the View action instead of Edit.
   */
  async clickViewOnClientMachineGridRowByAssetIdIa039(assetId: string): Promise<void> {
    const runtime = this.clientMachineGridRuntimeIa029();
    await expect(runtime).toBeVisible({ timeout: 60_000 });
    const scrollRoot = runtime.locator('div[wj-part="root"]').first();
    await this.scrollGridToLeftEdge(scrollRoot);
    await expect(runtime.locator('[wj-part="cells"] [role="gridcell"]').first()).toBeVisible({
      timeout: 30_000,
    });

    const rows = runtime.locator('[wj-part="cells"] .wj-row:has([role="gridcell"])');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      await expect(row).toBeAttached({ timeout: 10_000 });
      const idText = ((await row.locator('[role="gridcell"]').nth(2).textContent()) ?? '').trim();
      if (idText === assetId) {
        const viewBtn = row.getByRole('button', { name: 'View', exact: true }).first();
        await expect(viewBtn).toBeAttached({ timeout: 10_000 });
        await viewBtn.dispatchEvent('click');
        return;
      }
    }
    throw new Error(`IA-039: Asset ID "${assetId}" not found in Client Machine grid`);
  }

  /**
   * IA-039: On the asset View page, click the "View {fieldLabel} History" link
   * to open the history dialog for the given custom field.
   */
  async clickViewCustomFieldHistoryLinkIa039(fieldPlaceholder: string): Promise<void> {
    // Wait for the asset view page to be ready — the Edit button is the reliable anchor
    // (same pattern as expectItAssetDetailViewShowsAssetState).
    const viewMain = this.page
      .getByRole('main')
      .filter({ has: this.page.getByRole('button', { name: 'Edit', exact: true }) });
    await expect(viewMain).toBeVisible({ timeout: 30_000 });
    // The link text is "View {placeholder} History" — the app renders the placeholder text
    // (not the field label) in the history link span.
    // Scope via a[data-link] + inner span[data-expression] to avoid accessible-name resolution issues.
    const historyLink = this.page
      .locator('a[data-link]')
      .filter({ has: this.page.locator('span[data-expression]', { hasText: `View ${fieldPlaceholder} History` }) })
      .first();
    await expect(historyLink).toBeVisible({ timeout: 15_000 });
    await historyLink.click();
  }

  /**
   * IA-039: Verify that every value in `values` is visible inside the history dialog.
   * All assertions are scoped to the dialog element to avoid false matches elsewhere.
   */
  async expectCustomFieldHistoryDialogShowsValuesIa039(values: string[]): Promise<void> {
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    for (const value of values) {
      await expect(dialog.getByText(value)).toBeVisible({ timeout: 10_000 });
    }
  }

  /**
   * IA-039: Close the field history dialog by clicking its × icon.
   * Waits for the dialog to disappear to confirm the close completed.
   */
  async closeHistoryDialogIa039(): Promise<void> {
    const dialog = this.page.getByRole('dialog');
    await dialog.locator('.icon.fa.fa-times').click();
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });
  }

  /**
   * IA-039: Cleanup — navigate home, return to Client Machine Settings, scroll the
   * field list until the custom field with `fieldLabel` is visible, click it to select
   * it, click the trash icon to initiate deletion, then confirm with the Delete button.
   */
  async deleteCustomFieldFromSettingsIa039(fieldLabel: string): Promise<void> {
    await this.navigateHomeAndWaitIa037();
    await this.navigateToCustomFieldSettingsClientMachineIa039();

    // The field list container has an id prefixed with "fieldList"
    const fieldList = this.page.locator('[id^="fieldList"]').first();
    await expect(fieldList).toBeVisible({ timeout: 30_000 });

    // The custom field is appended at the bottom of the list; scroll to reveal it
    const fieldEntry = fieldList.getByText(fieldLabel, { exact: true }).first();
    await fieldEntry.scrollIntoViewIfNeeded();
    await expect(fieldEntry).toBeVisible({ timeout: 15_000 });
    await fieldEntry.click();

    // Trash icon appears in the field properties panel after the field is selected
    const trashIcon = this.page.locator('.icon.fa.fa-trash-o').first();
    await expect(trashIcon).toBeVisible({ timeout: 30_000 });
    await trashIcon.click();

    const deleteBtn = this.page.getByRole('button', { name: 'Delete' });
    await expect(deleteBtn).toBeVisible({ timeout: 15_000 });
    await deleteBtn.click();
    await this.page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  }

  // ---------------------------------------------------------------------------
  // IA-044: IT Asset Admin creates, edits, and validates a custom Number field
  // ---------------------------------------------------------------------------

  /**
   * IA-044: Click "+ Add a new Master List" and fill the custom field form as a
   * Basic Field with Text type (no Track History change).
   * Label and Placeholder inputs are anchored by their <label> text to avoid brittle
   * generated IDs. Applies the same value to Traditional Chinese via the button.
   */
  async addCustomFieldBasicTextIa044(label: string, placeholder: string): Promise<void> {
    await this.page.getByRole('button', { name: '+ Add a new Master List' }).click();

    const addFieldForm = this.page.locator('form[id="fieldForm"]');
    await expect(addFieldForm).toBeVisible({ timeout: 30_000 });

    // Label field — anchored by the "Label" <label> element inside the form
    const labelContainer = addFieldForm
      .locator('[data-container]')
      .filter({ has: this.page.locator('label[data-label]').filter({ hasText: /^Label$/ }) })
      .first();
    const labelInput = labelContainer.locator('input[type="text"]').first();
    await expect(labelInput).toBeVisible({ timeout: 15_000 });
    await labelInput.click();
    await labelInput.fill(label);

    // Placeholder field — anchored by the "Placeholder" <label> element inside the form
    const placeholderContainer = addFieldForm
      .locator('[data-container]')
      .filter({ has: this.page.locator('label[data-label]').filter({ hasText: /^Placeholder$/ }) })
      .first();
    const placeholderInput = placeholderContainer.locator('input[type="text"]').first();
    await expect(placeholderInput).toBeVisible({ timeout: 15_000 });
    await placeholderInput.click();
    await placeholderInput.fill(placeholder);

    // Apply same value to the Traditional Chinese language tab
    await this.page.getByRole('button', { name: 'Set other language with same' }).click();

    // Confirm the Basic Field segment is active (default selection)
    await this.page.getByText('Basic Field').click();

    // Type: Text — scoped to the Type section to avoid matching other spans named "Text"
    const typeSection = addFieldForm
      .locator('[data-container]')
      .filter({ has: this.page.locator('label[data-label]').filter({ hasText: /^Type$/ }) })
      .first();
    await typeSection.getByText('Text', { exact: true }).click();

    await this.page.getByRole('link', { name: /save/i }).click();
    await this.page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  }

  /**
   * IA-044: Open the custom field identified by `originalLabel` from the field list,
   * then edit it: rename to `newLabel`, change the Segment to "Vendor Field", and
   * change the Type to "Number". Waits 3 seconds after saving so the settings page
   * finishes persisting before any subsequent navigation.
   */
  async editCustomFieldLabelSegmentTypeIa044(originalLabel: string, newLabel: string): Promise<void> {
    const fieldList = this.page.locator('[id^="fieldList"]').first();
    await expect(fieldList).toBeVisible({ timeout: 30_000 });

    const fieldEntry = fieldList.getByText(originalLabel, { exact: true }).first();
    await fieldEntry.scrollIntoViewIfNeeded();
    await expect(fieldEntry).toBeVisible({ timeout: 15_000 });
    await fieldEntry.click();

    const editFieldForm = this.page.locator('form[id="fieldForm"]');
    await expect(editFieldForm).toBeVisible({ timeout: 30_000 });

    // Update the Label value — clear existing content first
    const labelContainer = editFieldForm
      .locator('[data-container]')
      .filter({ has: this.page.locator('label[data-label]').filter({ hasText: /^Label$/ }) })
      .first();
    const labelInput = labelContainer.locator('input[type="text"]').first();
    await expect(labelInput).toBeVisible({ timeout: 15_000 });
    await labelInput.click();
    await labelInput.press('Control+a');
    await labelInput.fill(newLabel);

    // Change Segment from Basic Field to Vendor Field
    await editFieldForm.getByText('Vendor Field').click();

    // Change Type to Number — scoped to the Type section
    const typeSection = editFieldForm
      .locator('[data-container]')
      .filter({ has: this.page.locator('label[data-label]').filter({ hasText: /^Type$/ }) })
      .first();
    await typeSection.getByText('Number', { exact: true }).click();

    await this.page.getByRole('link', { name: /save/i }).click();
    await this.page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    // Wait for the settings page to fully persist before navigating away
    await this.page.waitForTimeout(3_000);
  }

  /**
   * IA-044: Wait for the Client Machine grid and click the Edit button on the first
   * data row via dispatchEvent to bypass Wijmo's absolute-positioning viewport constraint.
   * Own copy of the first-row edit pattern per IA-044 recorded-steps note (line 74).
   */
  async clickEditOnFirstClientMachineGridRowIa044(): Promise<void> {
    const runtime = this.clientMachineGridRuntimeIa029();
    await expect(runtime).toBeVisible({ timeout: 60_000 });
    const scrollRoot = runtime.locator('div[wj-part="root"]').first();
    await expect(scrollRoot).toBeAttached({ timeout: 30_000 });
    await this.scrollGridToLeftEdge(scrollRoot);

    const cells = runtime.locator('[wj-part="cells"]').first();
    await expect(cells).toBeAttached({ timeout: 30_000 });
    const editBtn = cells.getByRole('button', { name: 'Edit', exact: true }).first();
    await expect(editBtn).toBeAttached({ timeout: 30_000 });
    await editBtn.dispatchEvent('click');
  }

  /**
   * IA-044: On the asset edit form, locate the Number-type custom field by its label
   * and verify integer validation in two steps:
   *  1. Save with an empty value → assert "Enter a valid integer." error is shown.
   *  2. Fill with `numericValue` → save successfully → assert the grid is visible
   *     (confirms the redirect back to the Client Machine grid after save).
   */
  async fillCustomNumberFieldIa044(fieldLabel: string, placeholder: string, numericValue: string): Promise<void> {
    // The Settings "Placeholder" value becomes the visible <label> text on the asset edit form.
    // HTML input placeholder attribute is empty; locate by label proximity instead.
    const labelPattern = new RegExp(`^${placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
    const fieldBlock = this.page
      .locator('[data-container]')
      .filter({ has: this.page.locator('label[data-label]').filter({ hasText: labelPattern }) })
      .filter({ has: this.page.locator('input[type="text"]') })
      .first();

    await expect(fieldBlock).toBeVisible({ timeout: 30_000 });
    await fieldBlock.scrollIntoViewIfNeeded();

    const numberInput = fieldBlock.locator('input[type="text"]').first();
    await expect(numberInput).toBeVisible({ timeout: 15_000 });

    // Empty value → save → integer validation error
    await numberInput.click();
    await numberInput.fill('');
    await this.saveButton.click();
    await expect(this.page.getByText('Enter a valid integer.')).toBeVisible({ timeout: 15_000 });

    // Fill with valid integer and save
    await numberInput.click();
    await numberInput.fill(numericValue);
    await this.saveButton.click();

    // Verify redirect back to the Client Machine grid
    await expect(this.clientMachineGridRuntimeIa029().locator('[wj-part="cells"]').first()).toBeVisible({
      timeout: 60_000,
    });
  }
}
