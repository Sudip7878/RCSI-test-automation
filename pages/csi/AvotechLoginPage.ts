import { expect, type Page } from '@playwright/test';
import { CSI_ACCOUNT_MANAGEMENT_PATH, CSI_LEGACY_LOGIN_PATH, CSI_LOGIN_PATH } from '../../config/csi';
import { BasePage } from '../BasePage';

/**
 * RCSI CSI Avotech OutSystems login (email step → password step).
 * Selectors: role/text only — see `refactor-selector/Auth/Login-Form.txt`.
 */
export class CsiAvotechLoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  readonly emailField = this.page.getByRole('textbox', { name: 'Enter your email' });
  readonly nextButton = this.page.getByRole('button', { name: 'Next' });
  readonly passwordField = this.page.getByRole('textbox', { name: 'Enter your password' });
  readonly staySignedInCheckbox = this.page.getByRole('checkbox', { name: 'Stay signed in for a week' });
  readonly loginButton = this.page.getByRole('button', { name: 'Log in' });

  private pathnameLooksLikeHome(pathname: string): boolean {
    const noTrail = pathname.replace(/\/$/, '');
    const norm = noTrail === '' ? '/' : noTrail;
    return (
      norm === '/' ||
      norm === '/Home' ||
      norm === '/Avotech' ||
      norm === '/Avotech/Home'
    );
  }

  private isAtHomePath(): boolean {
    try {
      return this.pathnameLooksLikeHome(new URL(this.page.url()).pathname);
    } catch {
      return false;
    }
  }

  private pathnameLooksLikeAccountManagement(pathname: string): boolean {
    const noTrail = pathname.replace(/\/$/, '');
    const norm = noTrail === '' ? '/' : noTrail;
    return (
      norm === CSI_ACCOUNT_MANAGEMENT_PATH ||
      norm === `/Avotech${CSI_ACCOUNT_MANAGEMENT_PATH}`
    );
  }

  private isAtAccountManagementPath(): boolean {
    try {
      return this.pathnameLooksLikeAccountManagement(new URL(this.page.url()).pathname);
    } catch {
      return false;
    }
  }

  async gotoLogin() {
    await this.page.goto(CSI_LOGIN_PATH);
    await this.page.waitForLoadState('domcontentloaded');
    if (this.isAtHomePath()) {
      return;
    }

    const visibleOnPrimary = await this.emailField
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);

    if (!visibleOnPrimary) {
      await this.page.goto(CSI_LEGACY_LOGIN_PATH);
      await this.page.waitForLoadState('domcontentloaded');
      if (this.isAtHomePath()) {
        return;
      }
      await this.emailField.waitFor({ state: 'visible', timeout: 10_000 });
    }
  }

  async enterEmail(email: string) {
    await this.emailField.fill(email);
  }

  async goToPasswordStep() {
    const nextVisible = await this.nextButton.isVisible({ timeout: 2_000 }).catch(() => false);
    if (!nextVisible) {
      return;
    }
    await this.waitForElement(this.nextButton);
    await this.nextButton.click();
  }

  async expectPasswordFieldVisible() {
    await this.waitForElement(this.passwordField);
  }

  async enterPassword(password: string) {
    await this.passwordField.fill(password);
  }

  async submitLogin() {
    await this.waitForElement(this.loginButton);
    await this.staySignedInCheckbox.check();
    await this.loginButton.click();
  }

  async signInWithEmailAndPassword(email: string, password: string) {
    const emailStepVisible = await this.emailField.isVisible({ timeout: 2_000 }).catch(() => false);
    if (!emailStepVisible && (this.isAtHomePath() || this.isAtAccountManagementPath())) {
      return;
    }
    await this.enterEmail(email);
    await this.goToPasswordStep();
    await this.expectPasswordFieldVisible();
    await this.enterPassword(password);
    await this.submitLogin();
  }

  async expectOnHome() {
    await this.page.waitForURL(
      (url) => {
        try {
          return this.pathnameLooksLikeHome(new URL(url).pathname);
        } catch {
          return false;
        }
      },
      { timeout: 30_000 },
    );
  }

  async expectOnAccountManagement() {
    await this.page.waitForURL(
      (url) => {
        try {
          return this.pathnameLooksLikeAccountManagement(new URL(url).pathname);
        } catch {
          return false;
        }
      },
      { timeout: 30_000 },
    );
  }

  async openHeaderAccountMenu() {
    const userMenuTrigger = this.page.getByText(/^Hi,\s/i);
    await expect(userMenuTrigger).toBeVisible({ timeout: 15_000 });
    await userMenuTrigger.click();
  }

  async logoutViaHeaderMenu() {
    await this.openHeaderAccountMenu();
    const logoutLink = this.page.getByRole('link', { name: /Logout/i });
    await expect(logoutLink).toBeVisible({ timeout: 15_000 });
    await logoutLink.click();
  }

  async expectEmailStepVisible() {
    await expect(this.emailField).toBeVisible({ timeout: 60_000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }
}
