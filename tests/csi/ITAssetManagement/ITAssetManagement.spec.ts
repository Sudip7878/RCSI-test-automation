import { test } from '../../../fixtures/csi/testSetup';
import { csiTestEmail, csiTestPassword } from '../../../utils/csi/credentials';
import {
  csiItAssetDisplayName,
  csiItAssetIpAddress,
  csiItAssetLocation,
  csiItAssetOsVersion,
  csiItAssetPurchaseCost,
  csiItAssetSerialFromModelNumber,
  csiItAssetUniqueNumeric,
  csiItAssetWebsite,
} from '../../../utils/csi/itAssetManagementTestData';

test.describe('CSI · IT Asset Management', () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ csiLoginPage }) => {
    if (!process.env.CSI_TEST_PASSWORD?.length) {
      test.skip();
      return;
    }

    await csiLoginPage.gotoLogin();
    await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
    await csiLoginPage.expectOnHome();
  });

  test('IA-001 add client machine asset', async ({ csiItAssetManagementPage }) => {
    const uniqueNumeric = csiItAssetUniqueNumeric();
    const displayName = csiItAssetDisplayName(uniqueNumeric);
    const modelNumber = uniqueNumeric;
    const serialNumber = csiItAssetSerialFromModelNumber(modelNumber);

    await csiItAssetManagementPage.openClientMachineList();
    await csiItAssetManagementPage.startAddAsset();
    await csiItAssetManagementPage.selectCategoryDesktopComputers();

    await csiItAssetManagementPage.fillAssetIdentity({
      displayName,
      modelNumber,
      serialNumber,
      osVersion: csiItAssetOsVersion(),
      ipAddress: csiItAssetIpAddress(),
    });

    await csiItAssetManagementPage.fillAssetStateAndLocation({
      location: csiItAssetLocation(),
    });

    await csiItAssetManagementPage.fillSupplierAndCommercial({
      website: csiItAssetWebsite(),
      purchaseCost: csiItAssetPurchaseCost(),
    });

    await csiItAssetManagementPage.pickPurchaseDateToday();
    await csiItAssetManagementPage.pickWarrantyOrEndDateOneMonthFromToday();
    await csiItAssetManagementPage.saveNewAsset();

    await csiItAssetManagementPage.expectAssetVisibleInGridAfterAcquisitionSort(displayName);
  });
});
