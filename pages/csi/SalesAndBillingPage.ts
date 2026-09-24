import { readFileSync } from 'node:fs';

import { expect, type Locator } from '@playwright/test';
import {
  CSI_BASE_URL,
  CSI_BILLING_PARTNER_LIST_PATH,
  CSI_CLIENT_LIST_PATH,
  CSI_INVOICE_LIST_PATH,
  CSI_SALES_ORDER_LIST_PATH,
  CSI_VIEW_SALES_ORDER_PATH,
} from '../../config/csi';
import {
  assertSb052SalesOrderReviewPricing,
  parseHongKongCurrencyAmount,
  type SalesOrderReviewPricing,
} from '../../utils/csi/sb052SalesOrderPricing';
import {
  SB030_CLIENT_LIST_SETTLE_MS,
  SB030_CLIENT_NAME_DROPDOWN_SETTLE_MS,
  SB030_DUPLICATE_CLIENT_NAME_ERROR,
} from '../../utils/csi/sb030ClientTestData';
import type { Sb030AddClientFormStep } from '../../utils/csi/sb030ClientTestData';
import { SB031_DUPLICATE_CLIENT_EMAIL_ERROR } from '../../utils/csi/sb031ClientTestData';
import {
  SB004_DUPLICATE_PACKAGE_NAME_ERROR,
  SB027_BILLING_PARTNER_EMAIL,
  SB027_BILLING_PARTNER_PAYMENT_METHOD_OPTION,
  SB027_DUPLICATE_BILLING_PARTNER_NAME_ERROR,
  SB067_NO_PERMISSION_MESSAGE_TIMEOUT_MS,
} from '../../utils/csi/salesAndBillingTestData';
import {
  sb057HeaderOrgLogoLocator,
  sb057WelcomeCardOrgLogoLocator,
} from '../../utils/csi/sb057OrgLogoLocators';
import { SB057_ORG_LOGO_SRC_FRAGMENT, SB057_POST_LOGIN_WAIT_MS } from '../../utils/csi/sb057WhiteLabelTestData';
import {
  CC022_POLICY_HUB_VISIBILITY_TIMEOUT_MS,
  CC022_POLICY_MANAGEMENT_MODULE_NAME,
  CC022_POLICY_MANAGEMENT_UNITS,
  CC022_SALES_ORDER_UPDATED_MESSAGE,
  CC023_HUB_MODULE_VISIBILITY_TIMEOUT_MS,
  CC023_REVOKED_HUB_MODULE_LABELS,
} from '../../utils/csi/crossCuttingTestData';
import { BasePage } from '../BasePage';

/** Pause before each sales-order VirtualSelect open (AM-009, SB-046, SB-052). */
export const CSI_SALES_ORDER_DROPDOWN_SETTLE_MS = 5_000;

export class CsiSalesAndBillingPage extends BasePage {
  readonly salesOrderLink = this.page.getByRole('link', { name: 'Sales Order' });
  readonly addSalesOrderButton = this.page.getByRole('button', { name: 'Add Sales Order' });
  readonly salesAndBillingNav = this.page.getByText('Sales & Billing', { exact: true });
  readonly packageManagementLink = this.page.getByRole('link', { name: 'Package Management' });
  readonly addPackageButton = this.page.getByRole('button', { name: 'Add Package' });
  readonly addClientButton = this.page.getByRole('button', { name: 'Add Client' });
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

  readonly addBillingPartnerButton = this.page.getByRole('button', { name: 'Add Billing Partner' });
  readonly billingPartnerNameInput = this.page.getByRole('textbox', { name: 'Billing Partner Name*' });
  readonly salesPartnerListSearchBox = this.page.getByRole('searchbox', { name: 'Enter Sales Partner' });

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
    const expanded = this.page.getByRole('combobox', { expanded: true });
    await expect(expanded).toBeVisible({ timeout: 12_000 });

    const listbox = this.page.getByRole('listbox');
    const option = listbox.getByRole('option').first();
    await expect(option).toBeVisible({ timeout: 30_000 });
    await option.click();
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

  private salesOrderReviewModuleDetailsGrid(): Locator {
    return this.page
      .locator('div.container')
      .filter({ has: this.page.getByText('Module Details', { exact: true }) })
      .getByRole('grid');
  }

  private salesOrderReviewSummaryRow(label: string | RegExp): Locator {
    if (typeof label === 'string') {
      return this.page.locator('.columns.columns2').filter({
        has: this.page.getByText(label, { exact: true }),
      });
    }
    return this.page.locator('.columns.columns2').filter({
      has: this.page.locator('.columns-item').first().filter({ hasText: label }),
    });
  }

  private salesOrderReviewSummaryAmount(label: string | RegExp): Locator {
    return this.salesOrderReviewSummaryRow(label)
      .locator('.columns-item')
      .last()
      .locator('.text-align-right .bold');
  }

  /** SB-052: review step ready (Submit visible); does not submit. */
  async expectSalesOrderReviewStepReady() {
    await expect(this.page.getByText('Module Details', { exact: true })).toBeVisible({
      timeout: 60_000,
    });
    await this.waitForElement(this.submitButton);
    await expect(this.submitButton).toBeVisible();
  }

  async readSalesOrderReviewLineItemTotals(): Promise<number[]> {
    const grid = this.salesOrderReviewModuleDetailsGrid();
    await expect(grid).toBeVisible({ timeout: 60_000 });

    const rows = grid.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    const totals: number[] = [];
    for (let i = 0; i < rowCount; i += 1) {
      const totalCell = rows.nth(i).locator('[data-header="Total"]');
      const text = (await totalCell.innerText()).trim();
      totals.push(parseHongKongCurrencyAmount(text));
    }
    return totals;
  }

  async readSalesOrderReviewPricing(): Promise<SalesOrderReviewPricing> {
    const lineItemTotals = await this.readSalesOrderReviewLineItemTotals();
    const subtotal = parseHongKongCurrencyAmount(
      await this.readSalesOrderReviewSummaryAmountText('Subtotal'),
    );
    const tax = parseHongKongCurrencyAmount(
      await this.readSalesOrderReviewSummaryAmountText(/^Tax\s*\(/),
    );
    const grandTotal = parseHongKongCurrencyAmount(
      await this.readSalesOrderReviewSummaryAmountText('Grand Total'),
    );
    return { lineItemTotals, subtotal, tax, grandTotal };
  }

  private async readSalesOrderReviewSummaryAmountText(label: string | RegExp): Promise<string> {
    const amount = this.salesOrderReviewSummaryAmount(label);
    await expect(amount).toBeVisible({ timeout: 30_000 });
    return (await amount.innerText()).trim();
  }

  async expectSb052SalesOrderReviewPricingConsistent() {
    const pricing = await this.readSalesOrderReviewPricing();
    assertSb052SalesOrderReviewPricing(pricing);
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

  /** SB-004: Submit with an existing package name must not create a new package. */
  async expectPackageDuplicateNameRejected() {
    await expect(
      this.page.getByText(SB004_DUPLICATE_PACKAGE_NAME_ERROR, { exact: true }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(this.page).not.toHaveURL(/\/PackageList/);
  }

  async openClientList() {
    await this.page.goto(`${CSI_BASE_URL}${CSI_CLIENT_LIST_PATH}`);
    await expect(this.addClientButton).toBeVisible({ timeout: 60_000 });
    await this.safeSleep(SB030_CLIENT_LIST_SETTLE_MS);
  }

  async clickAddClient() {
    await this.waitForElement(this.addClientButton);
    await this.addClientButton.click();
    await expect(this.page.getByRole('textbox', { name: 'Client Name*' })).toBeVisible({
      timeout: 30_000,
    });
  }

  private async selectVirtualSelectOption(triggerText: string, optionName: string, maxAttempts = 4) {
    const trigger = this.page.getByText(triggerText, { exact: true });
    const option = this.page.getByRole('option', { name: optionName });
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (attempt > 0) {
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.safeSleep(500);
      }

      await trigger.click();

      try {
        await expect(option).toBeVisible({ timeout: 15_000 });
        await option.click();
        return;
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts - 1) {
          throw lastError;
        }
      }
    }
  }

  private organizationSizeCombobox(): Locator {
    return this.page.getByRole('combobox').filter({
      has: this.page.getByRole('option', { name: 'Select Size', exact: true }),
    });
  }

  private async selectFirstOrganizationSizeOption() {
    const select = this.organizationSizeCombobox();
    await this.waitForElement(select);
    const firstValue = await select.evaluate((el) => {
      const selectEl = el as HTMLSelectElement;
      const option = Array.from(selectEl.options).find(
        (entry) => entry.value !== '-1' && entry.value !== '',
      );
      return option?.value ?? '';
    });
    expect(firstValue.length).toBeGreaterThan(0);
    await select.selectOption(firstValue);
  }

  async fillAddClientFormSb030(steps: Sb030AddClientFormStep[]) {
    for (const step of steps) {
      if (step.type === 'textbox') {
        const input = this.page.getByRole('textbox', { name: step.name });
        await this.waitForElement(input);
        await input.fill(step.value);
        if (step.name === 'Client Name*') {
          await this.safeSleep(SB030_CLIENT_NAME_DROPDOWN_SETTLE_MS);
        }
        continue;
      }

      if (step.type === 'virtualSelect') {
        await this.selectVirtualSelectOption(step.triggerText, step.optionName);
        continue;
      }

      await this.selectFirstOrganizationSizeOption();
    }
  }

  /** SB-029: successful client creation must redirect back to ClientList with a success message. */
  async expectClientCreated() {
    await expect(
      this.page.getByText('You have successfully added', { exact: false }),
    ).toBeVisible({ timeout: 60_000 });
    await this.page.waitForURL(/\/ClientList/, { timeout: 60_000 });
  }

  /** SB-030: Submit with an existing client name must not create a new client. */
  async expectClientDuplicateNameRejected() {
    await expect(
      this.page.getByText(SB030_DUPLICATE_CLIENT_NAME_ERROR, { exact: true }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(this.page.getByRole('textbox', { name: 'Client Name*' })).toBeVisible();
  }

  /** SB-031: Submit with an existing owner email must not create a new client. */
  async expectClientDuplicateEmailRejected() {
    await expect(
      this.page.getByText(SB031_DUPLICATE_CLIENT_EMAIL_ERROR, { exact: true }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(this.page.getByRole('textbox', { name: 'Owner Email*' })).toBeVisible();
  }

  async openBillingPartnerList() {
    await this.page.goto(`${CSI_BASE_URL}${CSI_BILLING_PARTNER_LIST_PATH}`);
    await expect(this.addBillingPartnerButton).toBeVisible({ timeout: 30_000 });
  }

  async clickAddBillingPartner() {
    await this.waitForElement(this.addBillingPartnerButton);
    await this.addBillingPartnerButton.click();
    await expect(this.billingPartnerNameInput).toBeVisible({ timeout: 30_000 });
  }

  /**
   * SB-022: fill the Add Billing Partner form for a successful creation.
   * Payment method uses the same HSBC option as SB-027 (test-env specific).
   */
  async fillAddBillingPartnerForm(billingPartnerName: string, email: string) {
    await this.billingPartnerNameInput.click();
    await this.billingPartnerNameInput.fill(billingPartnerName);

    const emailInput = this.page.getByRole('textbox', { name: 'Email*' });
    await emailInput.click();
    await emailInput.fill(email);

    await this.selectVirtualSelectOption('Select Sales Partner', 'Avotech');
    await this.selectVirtualSelectOption(
      'Select Payment Method',
      SB027_BILLING_PARTNER_PAYMENT_METHOD_OPTION,
    );

    const addressInput = this.page.getByRole('textbox', { name: 'Address*' });
    await addressInput.click();
    await addressInput.fill('Test Address');
  }

  /** SB-022: successful creation must redirect back to BillingPartnerList with a success message. */
  async expectBillingPartnerCreated() {
    await expect(
      this.page.getByText('You have successfully added Billing Partner'),
    ).toBeVisible({ timeout: 60_000 });
    await this.page.waitForURL(/\/BillingPartnerList/, { timeout: 60_000 });
  }

  /**
   * SB-024: open dropdown and select multiple Sales Partner options in sequence.
   * VirtualSelect multi-select keeps the dropdown open after each selection; if it
   * closes between selections the combobox is re-clicked to reopen it.
   */
  private async selectMultipleSalesPartnersInForm(partnerNames: readonly string[]) {
    if (partnerNames.length === 0) return;

    await this.page.getByText('Select Sales Partner', { exact: true }).click();

    for (const name of partnerNames) {
      // If the dropdown closed after the previous selection, reopen it via the first
      // collapsed combobox (Sales Partner multi-select precedes Payment Method in DOM order)
      const listbox = this.page.getByRole('listbox');
      if (!(await listbox.isVisible().catch(() => false))) {
        await this.page.getByRole('combobox', { expanded: false }).first().click();
        await expect(listbox).toBeVisible({ timeout: 10_000 });
      }

      // Use the dropdown's built-in search to filter options; avoids stale-element
      // issues from VirtualSelect's JS translate3d scroll during scroll
      const searchInput = this.page.getByPlaceholder('Search sales Partner');
      await expect(searchInput).toBeVisible({ timeout: 10_000 });
      await searchInput.fill(name);

      const option = listbox.getByRole('option', { name, exact: true });
      await expect(option).toBeVisible({ timeout: 15_000 });
      await option.click();

      // Clear the search so the next iteration starts with the full option list
      await searchInput.clear().catch(() => {});
      await this.safeSleep(300);
    }

    await this.page.keyboard.press('Escape').catch(() => {});
  }

  /**
   * SB-024: fill the Add Billing Partner form assigning to multiple Sales Partners.
   * Differs from fillAddBillingPartnerForm only in the Sales Partner selection step.
   */
  async fillAddBillingPartnerFormSb024(
    billingPartnerName: string,
    email: string,
    salesPartners: readonly string[],
  ) {
    await this.billingPartnerNameInput.click();
    await this.billingPartnerNameInput.fill(billingPartnerName);

    const emailInput = this.page.getByRole('textbox', { name: 'Email*' });
    await emailInput.click();
    await emailInput.fill(email);

    await this.selectMultipleSalesPartnersInForm(salesPartners);
    await this.selectVirtualSelectOption(
      'Select Payment Method',
      SB027_BILLING_PARTNER_PAYMENT_METHOD_OPTION,
    );

    const addressInput = this.page.getByRole('textbox', { name: 'Address*' });
    await addressInput.click();
    await addressInput.fill('Test Address');
  }

  private salesPartnerListGrid() {
    return this.page.getByRole('grid').filter({
      has: this.page.getByRole('columnheader', { name: 'Partner Name' }),
    });
  }

  /** SB-024: search for a Sales Partner by name using the list searchbox. */
  async searchSalesPartnerByName(partnerName: string) {
    await expect(this.salesPartnerListSearchBox).toBeVisible({ timeout: 30_000 });
    await this.salesPartnerListSearchBox.click();
    await this.salesPartnerListSearchBox.fill(partnerName);
    await this.salesOrderListSearchButton.click();
    await expect(
      this.salesPartnerListGrid().getByRole('gridcell', { name: partnerName }).first(),
    ).toBeVisible({ timeout: 30_000 });
  }

  /**
   * SB-024: click the Action cell of the matching Sales Partner row then follow
   * the View Details link.
   */
  async openSalesPartnerViewDetailsForName(partnerName: string) {
    const row = this.salesPartnerListGrid()
      .getByRole('row')
      .filter({ has: this.page.getByRole('gridcell', { name: partnerName }) })
      .first();
    await expect(row).toBeVisible({ timeout: 30_000 });

    const cells = await row.getByRole('gridcell').all();
    expect(cells.length).toBeGreaterThan(0);
    await cells[cells.length - 1].click();

    const viewDetailsLink = this.page.getByRole('link', { name: 'View Details' });
    await expect(viewDetailsLink).toBeVisible({ timeout: 10_000 });
    await viewDetailsLink.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** SB-024: click the 'Invoice & Billing Partners' tab on the Sales Partner detail page. */
  async clickInvoiceAndBillingPartnersTab() {
    const tab = this.page.getByRole('tab', { name: 'Invoice & Billing Partners' });
    await expect(tab).toBeVisible({ timeout: 30_000 });
    await tab.click();
  }

  /** SB-024: billing partner name must appear in the Billing Partners grid of the detail page. */
  async expectBillingPartnerVisibleInSalesPartnerDetail(billingPartnerName: string) {
    await expect(
      this.page.getByRole('gridcell', { name: billingPartnerName }).first(),
    ).toBeVisible({ timeout: 30_000 });
  }

  /**
   * SB-027: fill the Add Billing Partner form with a duplicate name.
   * Only the billing partner name is env-configurable; email, sales partner, payment method,
   * and address are fixed test-env values sufficient to reach the duplicate-name rejection.
   */
  async fillBillingPartnerFormSb027(billingPartnerName: string) {
    await this.billingPartnerNameInput.click();
    await this.billingPartnerNameInput.fill(billingPartnerName);

    const emailInput = this.page.getByRole('textbox', { name: 'Email*' });
    await emailInput.click();
    await emailInput.fill(SB027_BILLING_PARTNER_EMAIL);

    await this.selectVirtualSelectOption('Select Sales Partner', 'Avotech');
    await this.selectVirtualSelectOption(
      'Select Payment Method',
      SB027_BILLING_PARTNER_PAYMENT_METHOD_OPTION,
    );

    const addressInput = this.page.getByRole('textbox', { name: 'Address*' });
    await addressInput.click();
    await addressInput.fill('Test');
  }

  /** SB-027: Submit with an existing billing partner name must not create a new entry. */
  async expectBillingPartnerDuplicateNameRejected() {
    await expect(
      this.page.getByText(SB027_DUPLICATE_BILLING_PARTNER_NAME_ERROR, { exact: true }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(this.billingPartnerNameInput).toBeVisible();
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

  /** SB-057: settle after custom-org login before logo / theme assertions. */
  async waitSb057PostLoginSettle() {
    await this.safeSleep(SB057_POST_LOGIN_WAIT_MS);
    await this.page.waitForFunction((srcFragment) => {
      return Array.from(document.querySelectorAll('img')).some((image) =>
        (image.currentSrc || image.src || '').includes(srcFragment),
      );
    }, SB057_ORG_LOGO_SRC_FRAGMENT);
  }

  sb057HeaderOrgLogo() {
    return sb057HeaderOrgLogoLocator(this.page);
  }

  sb057WelcomeCardOrgLogo() {
    return sb057WelcomeCardOrgLogoLocator(this.page);
  }

  sb057VisibleOrgLogoImages() {
    return this.page.locator(`img[src*="${SB057_ORG_LOGO_SRC_FRAGMENT}"]`).filter({ visible: true });
  }

  async expectSb057LogosVisible(timeoutMs = 30_000) {
    await expect(this.sb057WelcomeCardOrgLogo()).toBeVisible({ timeout: timeoutMs });
    if ((await this.sb057VisibleOrgLogoImages().count()) >= 2) {
      await expect(this.sb057HeaderOrgLogo()).toBeVisible({ timeout: timeoutMs });
    }
  }

  /** CC-006: header (`img.app-logo`) and welcome-card (`img#AppLogo`) logos, independent of the org's logo file name. */
  cc006VisibleOrgLogoImages() {
    return this.page.locator('img.app-logo, img#AppLogo').filter({ visible: true });
  }

  cc006HeaderOrgLogo() {
    return this.cc006VisibleOrgLogoImages().first();
  }

  cc006WelcomeCardOrgLogo() {
    return this.cc006VisibleOrgLogoImages().last();
  }

  /** CC-006: settle after org login before logo / theme assertions. */
  async waitCc006PostLoginSettle() {
    await this.safeSleep(SB057_POST_LOGIN_WAIT_MS);
  }

  async expectCc006LogosVisible(timeoutMs = 30_000) {
    await expect(this.cc006WelcomeCardOrgLogo()).toBeVisible({ timeout: timeoutMs });
    if ((await this.cc006VisibleOrgLogoImages().count()) >= 2) {
      await expect(this.cc006HeaderOrgLogo()).toBeVisible({ timeout: timeoutMs });
    }
  }
}
