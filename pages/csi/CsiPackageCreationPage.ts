import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export class CsiPackageCreationPage extends BasePage {
  // 1. Define reusable locators
  private readonly salesAndBillingTab: Locator;
  private readonly packageManagementLink: Locator;
  private readonly addPackageButton: Locator;
  private readonly packageNameInput: Locator;
  private readonly combobox: Locator;
  private readonly moduleGrid: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    
    // Initialize locators
    this.salesAndBillingTab = this.page.getByText('Sales & Billing', { exact: true });
    this.packageManagementLink = this.page.getByRole('link', { name: 'Package Management' });
    this.addPackageButton = this.page.getByRole('button', { name: 'Add Package' });
    this.packageNameInput = this.page.getByRole('textbox', { name: 'Package Name*' });
    this.combobox = this.page.getByRole('combobox', { name: 'Select one or more options' });
    this.moduleGrid = this.page.getByRole('grid');
    this.submitButton = this.page.getByRole('button', { name: 'Submit' });
  }

  // 2. Action methods
  async navigateToPackageManagement() {
    await this.salesAndBillingTab.click();
    await this.waitForElement(this.packageManagementLink);
    await this.packageManagementLink.click({ force: true });
  }

  async startAddingPackage() {
    await this.waitForElement(this.addPackageButton, 30_000);
    await this.addPackageButton.click();
  }

  async fillPackageDetails(packageName: string, salesPartner: string, unitPrice: number) {
    await this.packageNameInput.fill(packageName);

    // Select sales partner
    await this.combobox.click();
    await this.page.getByRole('option', { name: salesPartner, exact: true }).click();

    // Check all modules in the grid
    const checkboxes = this.moduleGrid.getByRole('checkbox');
    const checkboxCount = await checkboxes.count();
    expect(checkboxCount).toBeGreaterThan(0);
    for (let index = 0; index < checkboxCount; index += 1) {
      await checkboxes.nth(index).check();
    }

    // Fill unit prices for modules
    const unitPriceInputs = this.moduleGrid.getByPlaceholder('Enter Unit Price');
    const unitPriceInputCount = await unitPriceInputs.count();
    expect(unitPriceInputCount).toBeGreaterThan(0);
    for (let index = 0; index < unitPriceInputCount; index += 1) {
      const input = unitPriceInputs.nth(index);
      await expect(input).toBeEnabled();
      await input.fill(String(unitPrice));
    }
  }

  async submitPackage() {
    await this.submitButton.click();
  }

  async expectPackageCreated(packageName: string) {
    await expect(this.page).toHaveURL(/\/PackageList/, { timeout: 60_000 });
    await expect(this.page.getByRole('gridcell', { name: packageName })).toBeVisible({
      timeout: 60_000,
    });
  }
}