import { isCsiLoginPageUrl } from '../../../config/csi';
import { test, expect } from '../../../fixtures/csi/testSetup';
import { csiTestPassword, csiTestEmail } from '../../../utils/csi/credentials';

test.describe('CSI · Avotech login', () => {
  test('redirects to login, then to home after valid credentials', async ({ page, csiLoginPage }) => {
    if (!process.env.CSI_TEST_PASSWORD?.length) {
      test.skip();
      return;
    }
    const password = csiTestPassword();
    const email = csiTestEmail();

    await csiLoginPage.gotoLogin();
    await expect(page).toHaveURL((url) => isCsiLoginPageUrl(url));

    await csiLoginPage.signInWithEmailAndPassword(email, password);
    await csiLoginPage.expectOnHome();
  });
});
