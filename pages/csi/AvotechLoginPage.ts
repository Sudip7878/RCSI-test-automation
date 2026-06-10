import { expect, type Page } from '@playwright/test';
import {
  CSI_ACCOUNT_MANAGEMENT_PATH,
  CSI_BASE_URL,
  CSI_HOME_PATH,
  CSI_LEGACY_LOGIN_PATH,
  CSI_LOGIN_PATH,
} from '../../config/csi';
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

  private async hasAuthenticatedHeader(): Promise<boolean> {
    return this.page.getByText(/^Hi,\s/i).isVisible({ timeout: 2_000 }).catch(() => false);
  }

  async gotoLogin() {
    await this.page.goto(CSI_LOGIN_PATH);
    await this.page.waitForLoadState('domcontentloaded');
    if (this.isAtHomePath()) {
      return;
    }

    if (await this.emailField.isVisible({ timeout: 5_000 }).catch(() => false)) {
      return;
    }

    if (await this.hasAuthenticatedHeader()) {
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
      if (await this.emailField.isVisible({ timeout: 5_000 }).catch(() => false)) {
        return;
      }
      if (await this.hasAuthenticatedHeader()) {
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

  async gotoHome() {
    await this.page.goto(`${CSI_BASE_URL}${CSI_HOME_PATH}`);
    await this.page.waitForLoadState('domcontentloaded');
    await this.expectOnHome();
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

  /** Post-login hub: role-specific landing URLs are valid (AM-033 subject re-login). */
  async expectAuthenticatedAppSession() {
    await expect(this.page.getByText(/^Hi,\s/i)).toBeVisible({ timeout: 60_000 });
    await this.page.waitForLoadState('domcontentloaded');
  }

  async openHeaderAccountMenu() {
    const userMenuTrigger = this.page.getByText(/^Hi,\s/i).first();
    await expect(userMenuTrigger).toBeVisible({ timeout: 15_000 });
    await userMenuTrigger.click();
  }

  async logoutViaHeaderMenu() {
    await this.openHeaderAccountMenu();
    const logoutLink = this.page.getByRole('link', { name: /Logout/i });
    await expect(logoutLink).toBeVisible({ timeout: 15_000 });
    await logoutLink.click();
  }

  /** AM-033: allow header chrome to finish loading, then retry menu logout until session ends. */
  async logoutViaHeaderMenuForAm033(headerSettleMs = 3_000) {
    await this.page.waitForTimeout(headerSettleMs);

    for (let attempt = 0; attempt < 3; attempt++) {
      if (!(await this.hasAuthenticatedHeader())) {
        return;
      }

      await this.openHeaderAccountMenu();
      const logoutLink = this.page.getByRole('link', { name: /Logout/i });
      await expect(logoutLink).toBeVisible({ timeout: 15_000 });
      await logoutLink.click();
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});

      if (await this.emailField.isVisible({ timeout: 10_000 }).catch(() => false)) {
        return;
      }
      if (!(await this.hasAuthenticatedHeader())) {
        return;
      }

      await this.page.waitForTimeout(1_000);
    }
  }

  /** AM-033 last resort when header logout does not clear the OutSystems session cookie. */
  private async forceAm033LoginScreen() {
    await this.page.context().clearCookies();
    await this.page.goto(`${CSI_BASE_URL}${CSI_LOGIN_PATH}`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Ends any CSI session; lands on the email login step (header logout or direct /Login). */
  async ensureLoggedOut() {
    const headerMenu = this.page.getByText(/^Hi,\s/i);
    if (await headerMenu.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.logoutViaHeaderMenu();
      try {
        await this.expectEmailStepVisible();
        return;
      } catch {
        // permission / error pages may block logout navigation
      }
    }

    await this.gotoLogin();
    await this.expectEmailStepVisible();
  }

  /** AM-033: return to hub home so header logout is reliable after deep-linked module URLs. */
  async gotoHomeForAm033() {
    await this.page.goto(`${CSI_BASE_URL}${CSI_HOME_PATH}`);
    await this.page.waitForLoadState('domcontentloaded');
    if (await this.hasAuthenticatedHeader()) {
      await this.expectOnHome();
    }
  }

  /** AM-033 recorded flow: home → header logout → login step ready for next account. */
  async gotoHomeAndLogoutForAm033() {
    await this.gotoHomeForAm033();
    await this.ensureLoggedOutForAm033();
  }

  /**
   * AM-033 only — dismiss toast first (caller), 3s header settle, retry logout until login step shows.
   * Does not call {@link gotoLogin} while a session is still active (that route never shows the email field).
   */
  async ensureLoggedOutForAm033() {
    if (!(await this.hasAuthenticatedHeader())) {
      if (await this.emailField.isVisible({ timeout: 5_000 }).catch(() => false)) {
        return;
      }
      await this.forceAm033LoginScreen();
      await this.expectEmailStepVisible();
      return;
    }

    await this.logoutViaHeaderMenuForAm033(0);

    if (
      (await this.hasAuthenticatedHeader()) &&
      !(await this.emailField.isVisible({ timeout: 5_000 }).catch(() => false))
    ) {
      await this.forceAm033LoginScreen();
    }

    await this.expectEmailStepVisible();
  }

  async expectEmailStepVisible() {
    await expect(this.emailField).toBeVisible({ timeout: 60_000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  /**
   * AM-061: waits up to 8 s for the "Invalid username or password." error text to appear after
   * a login attempt. Returns true if the error surfaces (login failed), false if it never
   * appears within the timeout (login succeeded and the page navigated away).
   * Uses waitFor so the check actively watches for the element rather than sampling once.
   */
  async isInvalidCredentialsVisible(): Promise<boolean> {
    return this.page
      .getByText('Invalid username or password.', { exact: true })
      .waitFor({ state: 'visible', timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
  }
}
