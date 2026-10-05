import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../BasePage'; // Adjust path as needed

export class CsiSignupPage extends BasePage {
  // 1. Define reusable locators
  private readonly workEmailInput: Locator;
  private readonly nextStepButton: Locator;
  private readonly firstNameInput: Locator;
  private readonly lastNameInput: Locator;
  private readonly organizationNameInput: Locator;
  private readonly categoryDropdown: Locator;
  private readonly phoneNumberInput: Locator;
  private readonly languageDropdown: Locator;
  private readonly passwordInput: Locator;
  private readonly confirmPasswordInput: Locator;
  private readonly termsCheckbox: Locator;
  private readonly passwordErrorSpan: Locator;
  private readonly passwordNoErrorSpan: Locator;
  private readonly createAccountButton: Locator;

  constructor(page: Page) {
    super(page);

    // Initialize locators
    this.workEmailInput = this.page.getByRole('textbox', { name: 'Enter your work email' });
    this.nextStepButton = this.page.getByRole('button', { name: 'Next Step' });
    this.firstNameInput = this.page.getByRole('textbox', { name: 'First name' });
    this.lastNameInput = this.page.getByRole('textbox', { name: 'Last name' });
    this.organizationNameInput = this.page.getByRole('textbox', { name: 'Organization name' });
    this.categoryDropdown = this.page.locator('.vscomp-value', { hasText: 'Category' });
    this.phoneNumberInput = this.page.getByRole('textbox', { name: 'Phone number' });
    this.languageDropdown = this.page.locator('.vscomp-value', { hasText: 'Language' });
    this.passwordInput = this.page.locator('#Input_password4');
    this.confirmPasswordInput = this.page.locator('#Input_password5');
    this.termsCheckbox = this.page.locator('#Checkbox3');
    this.passwordErrorSpan = this.page.locator('.margin-bottom-m.ul span');
    this.passwordNoErrorSpan = this.page.locator('.margin-bottom-m.ul');
    this.createAccountButton = this.page.getByRole('button', { name: 'Create account' });
  }

  // 2. Action methods
  async gotoSignup() {
    await this.page.goto('https://rcsi-tst.avotech.com/signup', { waitUntil: 'networkidle' });
  }

  async enterEmail(email: string) {
    await this.workEmailInput.fill(email);
    await this.nextStepButton.click();
  }

  async fillSignupDetails(firstName: string, lastName: string, orgName: string, category: string, phone: string, language: string, weakPassword: string) {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.organizationNameInput.fill(orgName);

    // Select Category dropdown
    await this.categoryDropdown.click();
    await this.page.locator('.vscomp-dropbox:visible').getByText(category, { exact: true }).click();

    await this.phoneNumberInput.fill(phone);

    // Select Language dropdown
    await this.languageDropdown.click();
    await this.page.locator('.vscomp-dropbox:visible').getByText(language, { exact: true }).click();

    // Fill weak passwords
    await this.passwordInput.fill(weakPassword);
    await this.confirmPasswordInput.fill(weakPassword);

    // Agree to terms checkbox
    await this.termsCheckbox.check();
  }

  async expectWeakPasswordError() {
    //await expect(this.passwordErrorSpan).toHaveClass(/text-error/);

    await expect(this.passwordErrorSpan.first()).toBeVisible();
    const hasRedSpan = await this.passwordErrorSpan.evaluateAll((spans) => {
      return spans.some((span) => {
        const computedColor = window.getComputedStyle(span).color;
        return computedColor === 'rgb(220, 32, 32)';
      });
    });
    await expect(this.createAccountButton).toBeDisabled();
  }

  async expectNoPasswordError() {
    await expect(this.createAccountButton).toBeDisabled();
  }
}