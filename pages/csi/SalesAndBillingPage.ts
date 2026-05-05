import { expect, type Locator } from '@playwright/test';
import { CSI_BASE_URL } from '../../config/csi';
import { BasePage } from '../BasePage';

/** OutSystems `#bNN-Input_*` ids for Add Sales Partner → email template step (fragile if module is republished). */
const SALES_PARTNER_EMAIL_TEMPLATE_ROW_IDS = [
  'b38',
  'b39',
  'b40',
  'b41',
  'b42',
  'b44',
  'b45',
  'b47',
  'b49',
  'b50',
  'b51',
  'b52',
  'b53',
  'b55',
  'b56',
  'b58',
] as const;

export class CsiSalesAndBillingPage extends BasePage {
  readonly salesOrderLink = this.page.getByRole('link', { name: 'Sales Order' });
  readonly addSalesOrderButton = this.page.getByRole('button', { name: 'Add Sales Order' });
  readonly salesAndBillingNav = this.page.locator('#b3-Sales_Billing2').getByText('Sales & Billing');
  readonly packageManagementLink = this.page.getByRole('link', { name: 'Package Management' });
  readonly addPackageButton = this.page.getByRole('button', { name: 'Add Package' });

  readonly packageNameInput = this.page.getByRole('textbox', { name: 'Package Name*' });
  readonly packageDescriptionInput = this.page.getByRole('textbox', { name: /description/i });

  readonly salesPartnerDropdown = this.page.getByText('Select Sales Partner');
  readonly avotechSalesPartnerOption = this.page.getByRole('option', { name: 'Avotech' });

  readonly moduleTableRows = this.page.locator('table[role="grid"] tbody tr.table-row');
  readonly submitButton = this.page.getByRole('button', { name: 'Submit' });
  readonly continueToReviewButton = this.page.getByRole('button', { name: 'Continue to Review' });
  /** Present when the Add Sales Order form has finished loading. */
  readonly addSalesOrderFormReady = this.page.getByText('Select Client', { exact: true });

  /** No-op if `page` is already closed (avoids throwing after timeouts). */
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

  async openSalesAndBilling() {
    await this.waitForElement(this.salesAndBillingNav);
    await expect(this.salesAndBillingNav).toBeVisible();
    await this.salesAndBillingNav.click();
  }

  async openPackageManagement() {
    await this.waitForElement(this.packageManagementLink);
    // Hub link sometimes needs another click before PackageList renders.
    await expect(this.packageManagementLink).toBeVisible();
    // First click sometimes does not leave the hub; retry until Package Management UI is up.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await this.packageManagementLink.click({ force: true });
      const loaded = await this.addPackageButton
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
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
    // OutSystems / VirtualSelect mount before opening dropdowns
    await this.safeSleep(2_000);
    await this.waitForElement(this.addSalesOrderFormReady, 30_000);
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

  /** First visible `[role=option]`; VirtualSelect may leave non-visible rows attached in the DOM. */
  private async clickFirstDropdownOption() {
    const roleOptions = this.page.getByRole('option');
    await expect(roleOptions.first()).toBeAttached({ timeout: 12_000 });

    const count = await roleOptions.count();
    for (let i = 0; i < count; i += 1) {
      const opt = roleOptions.nth(i);
      if (await opt.isVisible().catch(() => false)) {
        await opt.click();
        return;
      }
    }

    const vsRenderedRow = this.page.locator('[role="option"][data-visible-index="0"]');
    if ((await vsRenderedRow.count()) > 0) {
      await vsRenderedRow.first().click({ force: true });
      return;
    }

    const first = roleOptions.first();
    await first.scrollIntoViewIfNeeded().catch(() => {});
    await first.click({ force: true });
  }

  /**
   * Last option in an open VirtualSelect list (`aria-controls` panel, options often have `data-index`).
   * Scrolls the options panel to the end, then prefers the highest `data-index`.
   */
  private async clickLastDropdownOption() {
    const expandedCombo = this.page.locator('[role="combobox"][aria-expanded="true"]').first();
    await expect(expandedCombo).toBeVisible({ timeout: 12_000 });

    const controlsId = await expandedCombo.getAttribute('aria-controls');
    if (controlsId?.length) {
      const dropbox = this.page.locator(`[id=${JSON.stringify(controlsId)}]`);
      await expect(dropbox).toBeAttached({ timeout: 8_000 });

      const scrollArea = dropbox.locator('.vscomp-options').first();
      if ((await scrollArea.count()) > 0) {
        for (let pass = 0; pass < 6; pass += 1) {
          await scrollArea
            .evaluate((el) => {
              const node = el as { scrollTop: number; scrollHeight: number };
              node.scrollTop = node.scrollHeight;
            })
            .catch(() => {});
          await this.safeSleep(120);
        }
      }

      const optionsInDropbox = dropbox.locator('[role="option"]');
      await expect(optionsInDropbox.first()).toBeAttached({ timeout: 8_000 });
      const n = await optionsInDropbox.count();
      expect(n).toBeGreaterThan(0);

      let bestIdx = -1;
      let bestLoc: Locator | null = null;
      for (let i = 0; i < n; i += 1) {
        const opt = optionsInDropbox.nth(i);
        const raw = await opt.getAttribute('data-index');
        const v = raw !== null ? Number.parseInt(raw, 10) : Number.NaN;
        if (!Number.isNaN(v) && v >= bestIdx) {
          bestIdx = v;
          bestLoc = opt;
        }
      }
      if (bestLoc && bestIdx >= 0) {
        await bestLoc.scrollIntoViewIfNeeded().catch(() => {});
        await bestLoc.click({ force: true });
        return;
      }

      for (let i = n - 1; i >= 0; i -= 1) {
        const opt = optionsInDropbox.nth(i);
        if (await opt.isVisible().catch(() => false)) {
          await opt.click();
          return;
        }
      }

      const lastInBox = optionsInDropbox.nth(n - 1);
      await lastInBox.scrollIntoViewIfNeeded().catch(() => {});
      await lastInBox.click({ force: true });
      return;
    }

    const roleOptions = this.page.getByRole('option');
    await expect(roleOptions.first()).toBeAttached({ timeout: 8_000 });
    const count = await roleOptions.count();
    expect(count).toBeGreaterThan(0);

    for (let i = count - 1; i >= 0; i -= 1) {
      const opt = roleOptions.nth(i);
      if (await opt.isVisible().catch(() => false)) {
        await opt.click();
        return;
      }
    }

    const last = roleOptions.nth(count - 1);
    await last.scrollIntoViewIfNeeded().catch(() => {});
    await last.click({ force: true });
  }

  /**
   * Opens a dropdown by its trigger label and selects the first option.
   * @param maxAttempts When greater than 1, retries clicking the trigger if the first option does not
   *   become visible in time (e.g. sales order form). Use `4` for one try plus three retries.
   */
  async selectFirstOptionByTriggerText(triggerText: string, maxAttempts = 1) {
    const trigger = this.page.getByText(triggerText, { exact: true });
    await this.waitForElement(trigger);

    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
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
   * Opens a dropdown by its trigger label and selects the last option in the list.
   * @param maxAttempts Same retry semantics as {@link selectFirstOptionByTriggerText}.
   */
  async selectLastOptionByTriggerText(triggerText: string, maxAttempts = 1) {
    const trigger = this.page.getByText(triggerText, { exact: true });
    await this.waitForElement(trigger);

    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
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

  /** Billing partner search combobox lives under `#BillingPartner`. */
  async selectFirstBillingPartnerOption(maxAttempts = 1) {
    const billingPartnerCombobox = this.page.locator('#BillingPartner [role="combobox"]').first();
    await this.waitForElement(billingPartnerCombobox);

    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await billingPartnerCombobox.click();

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

  async selectAllModulesAndSetUnitPrice(unitPrice: number) {
    const rowCount = await this.moduleTableRows.count();
    expect(rowCount).toBeGreaterThan(0);
    for (let i = 0; i < rowCount; i += 1) {
      const row = this.moduleTableRows.nth(i);
      const checkbox = row.locator('input[type="checkbox"]');
      const unitPriceInput = row.getByRole('spinbutton');

      await this.waitForElement(checkbox);
      await checkbox.check();

      await expect(unitPriceInput).toBeEnabled();
      await unitPriceInput.fill(String(unitPrice));
    }
  }

  private async clickTodayInOpenDatepicker() {
    const calendar = this.page.locator('.flatpickr-calendar.open[role="dialog"]');
    await this.waitForElement(calendar);

    const todayCell = calendar.locator('.flatpickr-day.today[role="button"]').first();
    if (await todayCell.isVisible().catch(() => false)) {
      await todayCell.click();
      return;
    }

    const today = new Date();
    const fullDateLabel = today.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const labelCell = calendar.locator(`.flatpickr-day[role="button"][aria-label="${fullDateLabel}"]`);
    await this.waitForElement(labelCell.first());
    await labelCell.first().click();
  }

  async pickTodaySalesStartDate(maxAttempts = 1) {
    const dateCombobox = this.page
      .locator('div')
      .filter({ has: this.page.getByText('Effective Start Date', { exact: true }) })
      .getByRole('combobox', { name: 'Select a date' })
      .first();
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
    const durationInput = this.page.locator('#Input_DurationName');
    await this.waitForElement(durationInput);
    await durationInput.fill(String(duration));
  }

  async selectFirstBillingMode() {
    await this.page.getByLabel('Billing Mode').selectOption('0');
  }

  async selectAllSalesOrderModulesAndSetUnits(unitCount: number) {
    const rowCount = await this.moduleTableRows.count();
    expect(rowCount).toBeGreaterThan(0);

    for (let i = 0; i < rowCount; i += 1) {
      const row = this.moduleTableRows.nth(i);
      const checkbox = row.locator('input[type="checkbox"]');
      const unitsInput = row.getByPlaceholder('Enter Number of Units');

      await this.waitForElement(checkbox);
      await checkbox.check();

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
    const successMessage = this.page
      .locator('div')
      .filter({ hasText: 'You have successfully added' })
      .first();
    await this.waitForElement(successMessage, 60_000);
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
    const firstCategory = this.page.locator(`#${SALES_PARTNER_EMAIL_TEMPLATE_ROW_IDS[0]}-Input_Category`);
    await expect(firstCategory).toBeVisible({ timeout: 30_000 });

    const categoryValue = `test-category-${uniqueSuffix}`;
    const templateIdValue = `test-temp-id-${uniqueSuffix}`;

    for (const rowId of SALES_PARTNER_EMAIL_TEMPLATE_ROW_IDS) {
      const categoryInput = this.page.locator(`#${rowId}-Input_Category`);
      await expect(categoryInput).toBeVisible();
      await categoryInput.click();
      await categoryInput.fill(categoryValue);
    }
    for (const rowId of SALES_PARTNER_EMAIL_TEMPLATE_ROW_IDS) {
      const templateIdInput = this.page.locator(`#${rowId}-Input_TemplateId`);
      await expect(templateIdInput).toBeVisible();
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
}
