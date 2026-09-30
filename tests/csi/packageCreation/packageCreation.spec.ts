import { test } from '../../../fixtures/csi/testSetup';
import { packageDefaults } from '../../../data/csi/salesAndBilling.json';
import { csiTestPassword, csiTestEmail } from '../../../utils/csi/credentials';

test.describe('CSI · Package Management', () => {
  test('creating package with valid credentials', async ({ csiLoginPage, csiPackagePage }) => {
    test.setTimeout(180_000);

    const worker = process.env.TEST_WORKER_INDEX ?? 'w0';
    const packageName = `${packageDefaults.namePrefix}${Date.now()}-${worker}`;

    const password = csiTestPassword();
    const email = csiTestEmail();

    await csiLoginPage.gotoLogin();

    await csiLoginPage.signInWithEmailAndPassword(email, password);
    await csiLoginPage.expectOnHome();

    // 2. Execute package creation using the new page object
    await csiPackagePage.navigateToPackageManagement();
    await csiPackagePage.startAddingPackage();
    await csiPackagePage.fillPackageDetails(
      packageName,
      packageDefaults.salesPartner,
      packageDefaults.unitPricePerModule
    );
    await csiPackagePage.submitPackage();

    // 3. Verify success
    await csiPackagePage.expectPackageCreated(packageName);
  });
});