/// <reference lib="dom" />
import { expect, type Locator } from '@playwright/test';
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
}
