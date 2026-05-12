import { type Page } from '@playwright/test';
import { CSI_LEGACY_LOGIN_PATH, CSI_LOGIN_PATH } from '../../config/csi';
import { BasePage } from '../BasePage';

/**
 * RCSI CSI Avotech OutSystems login (email step → password step).
 */
export class CsiAvotechLoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  readonly emailField = this.page.locator('#Input_email');
  readonly nextButton = this.page.getByRole('button', { name: 'Next' });
  readonly passwordField = this.page.locator('#Input_password');
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

  async gotoLogin() {
    await this.page.goto(CSI_LOGIN_PATH);
    await this.page.waitForLoadState('domcontentloaded');

    const visibleOnPrimary = await this.emailField
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);

    if (!visibleOnPrimary) {
      await this.page.goto(CSI_LEGACY_LOGIN_PATH);
      await this.page.waitForLoadState('domcontentloaded');
      await this.emailField.waitFor({ state: 'visible', timeout: 10_000 });
    }
  }

  async enterEmail(email: string) {
    await this.emailField.fill(email);
  }

  async goToPasswordStep() {
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
    await this.loginButton.click();
  }

  async signInWithEmailAndPassword(email: string, password: string) {
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
      { timeout: 60_000 },
    );
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }
}
