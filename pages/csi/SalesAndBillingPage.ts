import { readFileSync } from 'node:fs';

import { expect, type Locator } from '@playwright/test';
import {
  CSI_BASE_URL,
  CSI_INVOICE_LIST_PATH,
  CSI_SALES_ORDER_LIST_PATH,
  CSI_VIEW_SALES_ORDER_PATH,
} from '../../config/csi';
import { SB067_NO_PERMISSION_MESSAGE_TIMEOUT_MS } from '../../utils/csi/salesAndBillingTestData';
import {
  CC022_POLICY_HUB_VISIBILITY_TIMEOUT_MS,
  CC022_POLICY_MANAGEMENT_MODULE_NAME,
  CC022_POLICY_MANAGEMENT_UNITS,
  CC022_SALES_ORDER_UPDATED_MESSAGE,
  CC023_HUB_MODULE_VISIBILITY_TIMEOUT_MS,
  CC023_REVOKED_HUB_MODULE_LABELS,
} from '../../utils/csi/crossCuttingTestData';
import { BasePage } from '../BasePage';

/** Pause before each sales-order VirtualSelect open (AM-009, SB-046). */
export const CSI_SALES_ORDER_DROPDOWN_SETTLE_MS = 5_000;

export class CsiSalesAndBillingPage extends BasePage {
  readonly salesOrderLink = this.page.getByRole('link', { name: 'Sales Order' });
  readonly addSalesOrderButton = this.page.getByRole('button', { name: 'Add Sales Order' });
  readonly salesAndBillingNav = this.page.getByText('Sales & Billing', { exact: true });
  readonly packageManagementLink = this.page.getByRole('link', { name: 'Package Management' });
  readonly addPackageButton = this.page.getByRole('button', { name: 'Add Package' });
  readonly downloadInvoiceButton = this.page.getByRole('button', { name: 'Download' });

  readonly packageNameInput = this.page.getByRole('textbox', { name: 'Package Name*' });
  readonly packageDescriptionInput = this.page.getByRole('textbox', { name: /description/i });

  readonly salesPartnerDropdown = this.page.getByText('Select Sales Partner');
  readonly avotechSalesPartnerOption = this.page.getByRole('option', { name: 'Avotech' });

  readonly submitButton = this.page.getByRole('button', { name: 'Submit' });
  readonly continueToReviewButton = this.page.getByRole('button', { name: 'Continue to Review' });
  readonly updateSalesOrderButton = this.page.getByRole('button', { name: 'Update' });
  readonly salesOrderListSearchBox = this.page.getByRole('searchbox', {
    name: /Enter Client\/Billing Partner/i,
  });
  readonly salesOrderListSearchButton = this.page.getByRole('button', { name: 'Search' });
  readonly addSalesOrderFormReady = this.page.getByText('Select Client', { exact: true });

  private async safeSleep(ms: number) {
    if (this.page.isClosed()) {
      return;
    }
    await this.page.waitForTimeout(ms).catch(() => {});
  }

  readonly addSalesPartnerButton = this.page.getByRole('button', { name: 'Add Sales Partner' });
  readonly salesPartnerPartnerNameInput = this.page.getByRole('textbox', { name: 'Partner Name*' });
  readonly salesPartnerDomainInput = this.page.getByRole('textbox', { name: 'Domain*' });
  readonly salesPartnerS3BucketNameInput = this.page.getByRole('textbox', { name: 'S3 Bucket Name*' });
  readonly salesPartnerS3BucketUrlInput = this.page.getByRole('textbox', { name: 'S3 Bucket URL*' });
  readonly salesPartnerSendgridSenderNameInput = this.page.getByRole('textbox', {
    name: 'Sendgrid Sender Name*',
  });
  readonly salesPartnerSendgridReplyToInput = this.page.getByRole('textbox', {
    name: 'Sendgrid Reply To Email*',
  });
  readonly salesPartnerContactEmailInput = this.page.getByRole('textbox', {
    name: 'Sales Partner Contact Email*',
  });
  readonly salesPartnerSubdomainExampleInput = this.page.getByRole('textbox', { name: 'ex: google.com' });
  readonly nextButton = this.page.getByRole('button', { name: 'Next' });

  private salesOrderFieldTrigger(triggerText: string): Locator {
    return this.page.getByText(triggerText, { exact: true });
  }

  private async clickFirstVisibleListboxOption() {
    const clicked = await this.page.getByRole('option').evaluateAll((options) => {
      for (const node of options) {
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

  private async clickLastVisibleListboxOption() {
    const expanded = this.page.getByRole('combobox', { expanded: true });
    await expect(expanded).toBeVisible({ timeout: 12_000 });

    const clicked = await expanded.evaluate((combo) => {
      const panelId = combo.getAttribute('aria-controls');
      const panel = panelId ? document.getElementById(panelId) : null;

      const scrollOptions = (root: ParentNode) => {
        const scrollArea = root.querySelector('.vscomp-options') as HTMLElement | null;
        if (scrollArea) {
          scrollArea.scrollTop = scrollArea.scrollHeight;
        }
        const options = Array.from(root.querySelectorAll('[role="option"]')) as HTMLElement[];
        if (options.length === 0) {
          return false;
        }

        let best: HTMLElement | null = null;
        let bestIdx = -1;
        for (const opt of options) {
          const raw = opt.getAttribute('data-index');
          const v = raw !== null ? Number.parseInt(raw, 10) : Number.NaN;
          if (!Number.isNaN(v) && v >= bestIdx) {
            bestIdx = v;
            best = opt;
          }
        }
        if (best) {
          best.click();
          return true;
        }

        for (let i = options.length - 1; i >= 0; i -= 1) {
          const el = options[i];
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
      };

      if (panel && scrollOptions(panel)) {
        return true;
      }
      return scrollOptions(document.body);
    });
    expect(clicked).toBe(true);
  }

  async openSalesAndBilling() {
    await this.waitForElement(this.salesAndBillingNav);
    await expect(this.salesAndBillingNav).toBeVisible();
    await this.salesAndBillingNav.click();
  }

  async openPackageManagement() {
    await this.waitForElement(this.packageManagementLink);
    await expect(this.packageManagementLink).toBeVisible();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await this.packageManagementLink.click({ force: true });
      const loaded = await this.addPackageButton.isVisible({ timeout: 5_000 }).catch(() => false);
      if (loaded) {
        return;
      }
    }

    await this.waitForElement(this.addPackageButton, 10_000);
  }

  async clickAddPackage() {
    await this.waitForElement(this.addPackageButton);
    await expect(this.addPackageButton).toBeVisible({ timeout: 15_000 });
    await this.addPackageButton.click();
  }

  async openSalesOrder() {
    await this.waitForElement(this.salesOrderLink);
    await this.salesOrderLink.click();
  }

  async clickAddSalesOrder() {
    await this.waitForElement(this.addSalesOrderButton);
    await this.addSalesOrderButton.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.waitForSalesOrderDropdownToSettle();
    await this.waitForElement(this.addSalesOrderFormReady, 30_000);
  }

  async waitForSalesOrderDropdownToSettle(ms = CSI_SALES_ORDER_DROPDOWN_SETTLE_MS) {
    await this.safeSleep(ms);
  }

  async fillPackageDetails(name: string, description: string) {
    await this.waitForElement(this.packageNameInput);
    await this.packageNameInput.fill(name);

    if (await this.packageDescriptionInput.isVisible().catch(() => false)) {
      await this.packageDescriptionInput.fill(description);
    }
  }

  async selectSalesPartnerAvotech() {
    await this.salesPartnerDropdown.click();
    await this.waitForElement(this.avotechSalesPartnerOption);
    await this.avotechSalesPartnerOption.click();
  }

  private async clickFirstDropdownOption() {
    await this.clickFirstVisibleListboxOption();
  }

  private async clickLastDropdownOption() {
    await this.clickLastVisibleListboxOption();
  }

  async selectFirstOptionByTriggerText(triggerText: string, maxAttempts = 1) {
    const trigger = this.salesOrderFieldTrigger(triggerText);
    await this.waitForElement(trigger);

    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await this.waitForSalesOrderDropdownToSettle();
      await trigger.click();

      try {
        await this.clickFirstDropdownOption();
        return;
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts - 1) {
          throw lastError;
        }
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.safeSleep(500);
      }
    }
  }

  /**
   * AM-009: search Client Name for the organization created in the same flow.
   * Separate from {@link selectLastOptionByTriggerText}; uses the same dropdown settle as SB-046.
   */
  async selectSalesOrderClientByOrganizationNameForAm009(clientName: string, maxAttempts = 4) {
    const trigger = this.salesOrderFieldTrigger('Select Client');
    await this.waitForElement(trigger);

    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await this.waitForSalesOrderDropdownToSettle();
      await trigger.click();

      try {
        const search = this.page.getByPlaceholder('Search Client');
        await expect(search).toBeVisible({ timeout: 12_000 });
        await search.fill(clientName);

        const clientListbox = this.page.getByRole('listbox');
        const option = clientListbox.getByRole('option', { name: clientName }).first();
        await expect(option).toBeVisible({ timeout: 30_000 });
        await option.click();
        return;
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts - 1) {
          throw lastError;
        }
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.safeSleep(500);
      }
    }
  }

  async selectLastOptionByTriggerText(triggerText: string, maxAttempts = 1) {
    const trigger = this.salesOrderFieldTrigger(triggerText);
    await this.waitForElement(trigger);

    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await this.waitForSalesOrderDropdownToSettle();
      await trigger.click();

      try {
        await this.clickLastDropdownOption();
        return;
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts - 1) {
          throw lastError;
        }
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.safeSleep(500);
      }
    }
  }

  async selectFirstBillingPartnerOption(maxAttempts = 1) {
    await this.selectFirstOptionByTriggerText('Select Billing Partner', maxAttempts);
  }

  /** AM-009: Billing Partner listbox is portaled; pick the first option from the open listbox. */
  async selectFirstBillingPartnerOptionForAm009(maxAttempts = 4) {
    await this.page.waitForTimeout(3_000);
    const trigger = this.salesOrderFieldTrigger('Select Billing Partner');
    await this.waitForElement(trigger);

    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await this.waitForSalesOrderDropdownToSettle();
      await trigger.click();

      try {
        const listbox = this.page.getByRole('listbox');
        const option = listbox.getByRole('option').first();
        await expect(option).toBeVisible({ timeout: 30_000 });
        await option.click();
        return;
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts - 1) {
          throw lastError;
        }
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.safeSleep(500);
      }
    }
  }

  async selectAllModulesAndSetUnitPrice(unitPrice: number) {
    const moduleGrid = this.page.getByRole('grid');
    const checkboxes = await moduleGrid.getByRole('checkbox').all();
    expect(checkboxes.length).toBeGreaterThan(0);

    for (const checkbox of checkboxes) {
      await checkbox.check();
    }

    const unitPriceInputs = await moduleGrid.getByPlaceholder('Enter Unit Price').all();
    expect(unitPriceInputs.length).toBeGreaterThan(0);

    for (const unitPriceInput of unitPriceInputs) {
      await expect(unitPriceInput).toBeEnabled();
      await unitPriceInput.fill(String(unitPrice));
    }
  }

  private async clickTodayInOpenDatepicker() {
    const calendar = this.page.getByRole('dialog');
    await this.waitForElement(calendar);

    const today = new Date();
    const fullDateLabel = today.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const todayButton = calendar.getByRole('button', { name: fullDateLabel });
    if (await todayButton.isVisible().catch(() => false)) {
      await todayButton.click();
      return;
    }

    const todayShort = today.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const shortButton = calendar.getByRole('button', { name: todayShort });
    await this.waitForElement(shortButton);
    await shortButton.click();
  }

  async pickTodaySalesStartDate(maxAttempts = 1) {
    await this.safeSleep(3000);
    const dateCombobox = this.page.getByRole('combobox', { name: 'Select a date' });
    await this.waitForElement(dateCombobox);

    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        await dateCombobox.click();
        await this.clickTodayInOpenDatepicker();
        return;
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts - 1) {
          throw lastError;
        }
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.safeSleep(500);
      }
    }
  }

  async fillSalesOrderDuration(duration: number) {
    const durationInput = this.page.getByLabel('Duration');
    await this.waitForElement(durationInput);
    await durationInput.fill(String(duration));
  }

  async selectFirstBillingMode() {
    await this.page.getByLabel('Billing Mode').selectOption('0');
  }

  async selectAllSalesOrderModulesAndSetUnits(unitCount: number) {
    const moduleGrid = this.page.getByRole('grid');
    const checkboxes = await moduleGrid.getByRole('checkbox').all();
    expect(checkboxes.length).toBeGreaterThan(0);

    for (const checkbox of checkboxes) {
      await checkbox.check();
    }

    const unitsInputs = await moduleGrid.getByPlaceholder('Enter Number of Units').all();
    expect(unitsInputs.length).toBeGreaterThan(0);

    for (const unitsInput of unitsInputs) {
      await expect(unitsInput).toBeEnabled();
      await unitsInput.fill(String(unitCount));
    }
  }

  async continueSalesOrderToReview() {
    await this.waitForElement(this.continueToReviewButton);
    await this.continueToReviewButton.click();
  }

  async submitPackage() {
    await this.waitForElement(this.submitButton);
    await this.submitButton.click();
  }

  async expectPackageCreated(packageName: string) {
    await this.page.waitForURL(/\/PackageList/, { timeout: 60000 });
    const packageCell = this.page.getByRole('gridcell', { name: packageName });
    await this.waitForElement(packageCell, 60_000);
  }

  async expectSalesOrderCreated() {
    await expect(this.page.getByText(/You have successfully added/i)).toBeVisible({ timeout: 60_000 });
    await this.page.waitForURL(/\/SalesOrderList/, { timeout: 60000 });
  }

  async openSalesPartnerList() {
    await this.page.goto(`${CSI_BASE_URL}/SalesPartnerList`);
    await expect(this.addSalesPartnerButton).toBeVisible({ timeout: 30_000 });
  }

  async clickAddSalesPartner() {
    await expect(this.addSalesPartnerButton).toBeVisible();
    await this.addSalesPartnerButton.click();
    await expect(this.salesPartnerPartnerNameInput).toBeVisible({ timeout: 30_000 });
  }

  async fillSalesPartnerBasicInformation(params: {
    partnerName: string;
    domain: string;
    s3BucketName: string;
    s3BucketUrl: string;
    sendgridSenderName: string;
    sendgridReplyToEmail: string;
    salesPartnerContactEmail: string;
    subdomainExampleHost: string;
  }) {
    await expect(this.salesPartnerPartnerNameInput).toBeVisible();
    await this.salesPartnerPartnerNameInput.click();
    await this.salesPartnerPartnerNameInput.fill(params.partnerName);

    await this.salesPartnerDomainInput.click();
    await this.salesPartnerDomainInput.fill(params.domain);

    await this.salesPartnerS3BucketNameInput.click();
    await this.salesPartnerS3BucketNameInput.fill(params.s3BucketName);

    await this.salesPartnerS3BucketUrlInput.click();
    await this.salesPartnerS3BucketUrlInput.fill(params.s3BucketUrl);

    await this.salesPartnerSendgridSenderNameInput.click();
    await this.salesPartnerSendgridSenderNameInput.fill(params.sendgridSenderName);

    await this.salesPartnerSendgridReplyToInput.click();
    await this.salesPartnerSendgridReplyToInput.fill(params.sendgridReplyToEmail);

    await this.salesPartnerContactEmailInput.click();
    await this.salesPartnerContactEmailInput.fill(params.salesPartnerContactEmail);

    await this.salesPartnerSubdomainExampleInput.click();
    await this.salesPartnerSubdomainExampleInput.fill(params.subdomainExampleHost);
  }

  async clickNextOnAddSalesPartnerWizard() {
    await expect(this.nextButton).toBeVisible();
    await this.nextButton.click();
  }

  async fillSalesPartnerEmailTemplateStep(uniqueSuffix: string) {
    const categoryInputs = await this.page.getByPlaceholder('Category').all();
    expect(categoryInputs.length).toBeGreaterThan(0);

    const categoryValue = `test-category-${uniqueSuffix}`;
    const templateIdValue = `test-temp-id-${uniqueSuffix}`;

    for (const categoryInput of categoryInputs) {
      await categoryInput.click();
      await categoryInput.fill(categoryValue);
    }

    for (const templateIdInput of await this.page.getByPlaceholder('Template Id').all()) {
      await templateIdInput.click();
      await templateIdInput.fill(templateIdValue);
    }
  }

  async submitAddSalesPartnerWizard() {
    await expect(this.submitButton).toBeVisible({ timeout: 30_000 });
    await this.submitButton.click();
  }

  async expectSalesPartnerCreated(partnerName: string) {
    await expect(this.page.getByText('You have successfully added')).toBeVisible({ timeout: 60_000 });
    await this.page.waitForURL(/\/SalesPartnerList/, { timeout: 60_000 });
    await expect(this.page.getByRole('gridcell', { name: partnerName })).toBeVisible();
  }

  async openInvoiceList() {
    await this.page.goto(`${CSI_BASE_URL}${CSI_INVOICE_LIST_PATH}`);
    await expect(this.page.getByRole('columnheader', { name: /Invoice No/i })).toBeVisible({
      timeout: 60_000,
    });
  }

  private invoiceListGrid() {
    return this.page.getByRole('grid').filter({
      has: this.page.getByRole('columnheader', { name: /Invoice No/i }),
    });
  }

  async openFirstInvoiceViewDetails() {
    await this.safeSleep(3000);
    await expect(this.page.getByRole('columnheader', { name: /Invoice No/i })).toBeVisible({
      timeout: 60_000,
    });
    const grid = this.invoiceListGrid();
    let viewDetailsActions = await grid.getByText('View Details', { exact: true }).all();
    if (viewDetailsActions.length === 0) {
      viewDetailsActions = await this.page.getByText('View Details', { exact: true }).all();
    }
    expect(viewDetailsActions.length).toBeGreaterThan(0);
    await viewDetailsActions[0].click();
  }

  private invoicePreviewHeading() {
    return this.page.getByText('INVOICE', { exact: true });
  }

  async expectInvoiceDetailPreviewReady() {
    await expect(this.downloadInvoiceButton).toBeVisible({ timeout: 60_000 });
    await expect(this.invoicePreviewHeading()).toBeVisible({ timeout: 60_000 });
    await this.page.waitForTimeout(5_000);
  }

  async readInvoiceTemplatePreviewText(): Promise<string> {
    await expect(this.invoicePreviewHeading()).toBeVisible();
    return this.invoicePreviewHeading().evaluate((heading) => {
      const root =
        heading.closest('[data-block="Invoice.InvoiceTemplateDetails"]') ??
        heading.closest('div') ??
        heading.parentElement;
      return (root as HTMLElement | null)?.innerText.trim() ?? (heading as HTMLElement).innerText.trim();
    });
  }

  async readInvoiceTemplateKeyValues(): Promise<Array<{ key: string; value: string }>> {
    await expect(this.invoicePreviewHeading()).toBeVisible();
    return this.invoicePreviewHeading().evaluate((heading) => {
      const root =
        (heading.closest('[data-block="Invoice.InvoiceTemplateDetails"]') as HTMLElement | null) ??
        (heading.parentElement as HTMLElement | null);
      if (!root) {
        return [];
      }

      const rows: { key: string; value: string }[] = [];
      const seen = new Set<string>();
      const inner = (el: Element) => (el as HTMLElement).innerText;

      const push = (key: string, value: string) => {
        const k = key.replace(/\s+/g, ' ').trim();
        const v = value.replace(/\s+/g, ' ').trim();
        if (!k || !v || k.length > 400 || v.length > 4000) {
          return;
        }
        const sig = `${k}\0${v}`;
        if (seen.has(sig)) {
          return;
        }
        seen.add(sig);
        rows.push({ key: k, value: v });
      };

      root.querySelectorAll('label').forEach((label) => {
        const key = inner(label).replace(/\s+/g, ' ').trim();
        if (!key) {
          return;
        }
        let el: Element | null = label.nextElementSibling;
        while (el) {
          if (el.matches('span[data-expression]')) {
            const v = (el as HTMLElement).innerText.trim();
            if (v) {
              push(key, v);
            }
          }
          el.querySelectorAll(':scope span[data-expression]').forEach((sp) => {
            const v = sp.textContent?.trim() ?? '';
            if (v) {
              push(key, v);
            }
          });
          el = el.nextElementSibling;
        }
      });

      root.querySelectorAll('div.columns2').forEach((wrapper) => {
        const items = wrapper.querySelectorAll(':scope > .columns-item');
        if (items.length < 2) {
          return;
        }
        const key = inner(items[0]).replace(/\s+/g, ' ').trim();
        if (!key) {
          return;
        }
        items[1].querySelectorAll('span[data-expression]').forEach((sp) => {
          const v = sp.textContent?.trim() ?? '';
          if (v) {
            push(key, v);
          }
        });
      });

      root.querySelectorAll('div.columns-medium-left').forEach((row) => {
        const items = row.querySelectorAll(':scope > .columns-item');
        if (items.length < 2) {
          return;
        }
        const valueSpans = items[1].querySelectorAll('span[data-expression]');
        if (valueSpans.length === 0) {
          return;
        }
        const key = inner(items[0]).replace(/\s+/g, ' ').trim();
        if (!key) {
          return;
        }
        const parts: string[] = [];
        valueSpans.forEach((sp) => {
          const t = sp.textContent?.trim() ?? '';
          if (t) {
            parts.push(t);
          }
        });
        if (parts.length) {
          push(key, parts.join(' | '));
        }
      });

      root.querySelectorAll('.margin-bottom-base').forEach((block) => {
        const sp = block.querySelector(':scope > span[data-expression]');
        if (!sp) {
          return;
        }
        const val = sp.textContent?.trim() ?? '';
        const full = inner(block).trim();
        if (!val || !full.includes(val)) {
          return;
        }
        const key = full.slice(0, full.indexOf(val)).replace(/:\s*$/u, '').trim();
        if (key) {
          push(key, val);
        }
      });

      return rows;
    });
  }

  async downloadInvoicePdfBytes(): Promise<Buffer> {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 120_000 });
    await this.downloadInvoiceButton.click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path, 'browser should materialize download to a temp path').toBeTruthy();
    return readFileSync(path as string);
  }

  private readonly sb056RestrictedHubLabels = [
    'Policy Management',
    'IT Asset Management',
    'Security Assessment',
    'Sales & Billing',
    'Avo Management',
    'Incident Response',
  ] as const;

  /** Hub sidebar group row (`Hub-Module-Menu.txt`), not submenu `a[data-link]`. */
  private async clickHubMenuLabel(label: string) {
    const clicked = await this.page.getByText(label, { exact: true }).evaluateAll((nodes) => {
      for (const node of nodes) {
        const el = node as HTMLElement;
        if (el.closest('a')) {
          continue;
        }
        const menuItem = el.closest('.menu-item') as HTMLElement | null;
        if (menuItem) {
          menuItem.click();
          return true;
        }
      }
      return false;
    });
    expect(clicked).toBe(true);
  }

  async expectSb056TrainingAndPhishingNavVisible() {
    await expect(this.page.getByText('Training', { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByText('Phishing', { exact: true })).toBeVisible({ timeout: 30_000 });
  }

  async navigateSb056TrainingPhishingThenAccountManagement() {
    await this.clickHubMenuLabel('Training');
    await this.safeSleep(400);
    await this.clickHubMenuLabel('Phishing');
    await this.safeSleep(400);
    await this.clickHubMenuLabel('Account Management');
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.safeSleep(800);
  }

  private async countVisibleHubMenuLabels(label: string): Promise<number> {
    return this.page.getByText(label, { exact: true }).evaluateAll((nodes) => {
      return nodes.filter((node) => {
        const el = node as HTMLElement;
        if (el.closest('a')) {
          return false;
        }
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return false;
        }
        return el.getClientRects().length > 0;
      }).length;
    });
  }

  async expectSb056RestrictedHubModulesNotVisible() {
    for (const label of this.sb056RestrictedHubLabels) {
      expect(await this.countVisibleHubMenuLabels(label)).toBe(0);
    }
  }

  /**
   * CC-023: after login, revoked hub modules must stay hidden for the full window (default 10s).
   */
  async expectCc023RevokedHubModulesNotVisible(
    timeoutMs = CC023_HUB_MODULE_VISIBILITY_TIMEOUT_MS,
  ) {
    const pollIntervalMs = 250;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      for (const label of CC023_REVOKED_HUB_MODULE_LABELS) {
        expect(await this.countVisibleHubMenuLabels(label)).toBe(0);
      }
      await this.page.waitForTimeout(pollIntervalMs);
    }
  }

  private salesOrderListGrid() {
    return this.page.getByRole('grid').filter({
      has: this.page.getByRole('columnheader', { name: 'Client Name' }),
    });
  }

  private salesOrderModulePackageGrid() {
    return this.page.getByRole('grid').filter({
      has: this.page.getByRole('columnheader', { name: 'Module Name' }),
    });
  }

  private salesOrderModulePackageRow(moduleName: string) {
    return this.salesOrderModulePackageGrid().getByRole('row', {
      name: new RegExp(moduleName, 'i'),
    });
  }

  async openSalesOrderList() {
    await this.page.goto(`${CSI_BASE_URL}${CSI_SALES_ORDER_LIST_PATH}`);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.salesOrderListSearchBox).toBeVisible({ timeout: 30_000 });
  }

  async searchSalesOrderListByOrganization(organizationName: string) {
    await this.salesOrderListSearchBox.click();
    await this.salesOrderListSearchBox.fill(organizationName.trim());
    await this.salesOrderListSearchButton.click();
    await expect(this.salesOrderListSearchButton).toBeEnabled({ timeout: 30_000 });
    await expect(
      this.salesOrderListGrid().getByRole('gridcell', { name: organizationName }).first(),
    ).toBeVisible({ timeout: 90_000 });
  }

  /** CC-022: open Edit on the Active sales order row matching `clientName`. */
  async openEditOnActiveSalesOrderForClient(clientName: string) {
    const row = this.salesOrderListGrid()
      .getByRole('row')
      .filter({
        has: this.page.getByRole('gridcell', { name: clientName }),
      })
      .filter({
        has: this.page.getByRole('gridcell', { name: 'Active', exact: true }),
      })
      .first();
    await expect(row).toBeVisible({ timeout: 60_000 });

    const actionCells = await row.getByRole('gridcell').all();
    expect(actionCells.length).toBeGreaterThan(0);
    await actionCells[actionCells.length - 1].click();

    const editLink = this.page.getByRole('link', { name: 'Edit' });
    await expect(editLink).toBeVisible({ timeout: 15_000 });
    await editLink.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectPolicyManagementModuleOnEditScreen() {
    await expect(this.salesOrderModulePackageRow(CC022_POLICY_MANAGEMENT_MODULE_NAME)).toBeVisible({
      timeout: 60_000,
    });
  }

  async setPolicyManagementModuleIncluded(
    included: boolean,
    units = CC022_POLICY_MANAGEMENT_UNITS,
    options?: { allowAlreadyRevoked?: boolean },
  ) {
    await this.expectPolicyManagementModuleOnEditScreen();
    const row = this.salesOrderModulePackageRow(CC022_POLICY_MANAGEMENT_MODULE_NAME);
    const checkbox = row.getByRole('checkbox');

    if (included) {
      if (!(await checkbox.isChecked())) {
        await checkbox.check();
      }
      const unitsInput = row.getByPlaceholder('Enter Number of Units');
      await expect(unitsInput).toBeEnabled({ timeout: 15_000 });
      await unitsInput.fill(String(units));
    } else {
      if (!options?.allowAlreadyRevoked) {
        await expect(checkbox).toBeChecked({ timeout: 15_000 });
      }
      if (await checkbox.isChecked()) {
        await checkbox.uncheck();
      }
    }
  }

  async submitSalesOrderEditUpdate() {
    await this.continueSalesOrderToReview();
    await expect(this.updateSalesOrderButton).toBeVisible({ timeout: 60_000 });
    await this.updateSalesOrderButton.click();

    const successToast = this.page.getByText(CC022_SALES_ORDER_UPDATED_MESSAGE);
    await successToast.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    await expect(this.page).toHaveURL(/\/SalesOrderList/i, { timeout: 60_000 });
    await expect(this.salesOrderListSearchBox).toBeVisible({ timeout: 30_000 });
  }

  /** CC-022: Policy Management hub label must stay hidden for the full window (default 5s). */
  async isPolicyManagementHubMenuVisible(): Promise<boolean> {
    return (await this.countVisibleHubMenuLabels(CC022_POLICY_MANAGEMENT_MODULE_NAME)) > 0;
  }

  /** CC-022: true when Policy Management hub label becomes visible within `timeoutMs` (hub loads after login). */
  async isPolicyManagementHubMenuVisibleWithin(
    timeoutMs = CC022_POLICY_HUB_VISIBILITY_TIMEOUT_MS,
  ): Promise<boolean> {
    const pollIntervalMs = 250;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (await this.isPolicyManagementHubMenuVisible()) {
        return true;
      }
      await this.page.waitForTimeout(pollIntervalMs);
    }

    return false;
  }

  /**
   * CC-022 preflight: ensure Policy Management is off on the active sales order for `clientName`.
   * When hub access and the checkbox disagree, grant then revoke so Update persists a real change.
   */
  async ensurePolicyManagementRevokedOnActiveSalesOrderForClient(clientName: string) {
    await this.openSalesOrderList();
    await this.searchSalesOrderListByOrganization(clientName);
    await this.openEditOnActiveSalesOrderForClient(clientName);

    const row = this.salesOrderModulePackageRow(CC022_POLICY_MANAGEMENT_MODULE_NAME);
    const checkbox = row.getByRole('checkbox');

    if (await checkbox.isChecked()) {
      await this.setPolicyManagementModuleIncluded(false);
      await this.submitSalesOrderEditUpdate();
      return;
    }

    await this.setPolicyManagementModuleIncluded(true);
    await this.submitSalesOrderEditUpdate();

    await this.openSalesOrderList();
    await this.searchSalesOrderListByOrganization(clientName);
    await this.openEditOnActiveSalesOrderForClient(clientName);
    await this.setPolicyManagementModuleIncluded(false);
    await this.submitSalesOrderEditUpdate();
  }

  async expectPolicyManagementHubNotVisible(timeoutMs = CC022_POLICY_HUB_VISIBILITY_TIMEOUT_MS) {
    const pollIntervalMs = 250;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      expect(await this.countVisibleHubMenuLabels(CC022_POLICY_MANAGEMENT_MODULE_NAME)).toBe(0);
      await this.page.waitForTimeout(pollIntervalMs);
    }
  }

  async expectPolicyManagementHubVisible() {
    await expect(
      this.page.getByText(CC022_POLICY_MANAGEMENT_MODULE_NAME, { exact: true }),
    ).toBeVisible({ timeout: 60_000 });
  }

  /** SB-067: direct navigation to sales order detail (cross-org data leak check). */
  async openViewSalesOrder(salesOrderId: number) {
    await this.page.goto(
      `${CSI_BASE_URL}${CSI_VIEW_SALES_ORDER_PATH}?SalesOrderId=${salesOrderId}`,
    );
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectViewSalesOrderNoPermissionMessage(
    timeoutMs = SB067_NO_PERMISSION_MESSAGE_TIMEOUT_MS,
  ) {
    await expect(
      this.page.getByText("You don't have permissions to view this screen.", { exact: true }),
    ).toBeVisible({ timeout: timeoutMs });
  }
}
