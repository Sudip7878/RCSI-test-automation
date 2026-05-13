import * as os from 'os';
import * as path from 'path';
import { test } from '../../../fixtures/csi/testSetup';
import { csiTestEmail, csiTestPassword } from '../../../utils/csi/credentials';
import {
  buildIa003BulkClientMachineWorkbook,
  csiIa003BulkBaseNumeric,
  saveIa003EditedWorkbookArtifact,
} from '../../../utils/csi/itAssetBulkUpload';
import {
  csiItAssetDisplayName,
  csiItAssetIpAddress,
  csiItAssetLocation,
  csiItAssetOsVersion,
  csiItAssetPurchaseCost,
  csiItAssetSerialFromModelNumber,
  csiItAssetSupplier,
  csiItAssetUniqueNumeric,
  csiItAssetWebsite,
} from '../../../utils/csi/itAssetManagementTestData';
import {
  csiItAssetPurchaseOrderPurposeRemark,
  ia011DeliveryNotesPdfFileName,
  ia011DeliveryNotesPdfPath,
  ia011PurchaseInvoicePdfFileName,
  ia011PurchaseInvoicePdfPath,
  ia011QuotationPdfFileName,
  ia011QuotationPdfPath,
} from '../../../utils/csi/itAssetPurchaseTestData';

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

  test.describe('IA-001 add client machine asset', () => {
    test('IA-001', async ({ csiItAssetManagementPage }) => {
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

  /**
   * IA-003: bulk XLSX → per-row Purchase Cost → Import (see recorded-steps/ITAssetManagement/IA-003/IA-003.txt).
   */
  test.describe('IA-003 bulk client machine upload', () => {
    test.describe.configure({ timeout: 300_000 });

    test('IA-003', async ({ csiItAssetManagementPage }) => {
      const baseNumeric = csiIa003BulkBaseNumeric();

      await csiItAssetManagementPage.gotoItAssetManagementClientMachineBulkUrl();
      await csiItAssetManagementPage.startBulkUploadAsset();
      const downloadedPath = await csiItAssetManagementPage.downloadBulkAssetTemplateTo(os.tmpdir());
      const parsed = path.parse(downloadedPath);
      const editedPath = path.join(parsed.dir, `${parsed.name}${baseNumeric}${parsed.ext || '.xlsx'}`);
      const assetNames = buildIa003BulkClientMachineWorkbook({
        downloadedTemplatePath: downloadedPath,
        outputPath: editedPath,
        baseNumeric,
      });
      saveIa003EditedWorkbookArtifact(editedPath);

      await csiItAssetManagementPage.uploadBulkCompletedTemplate(editedPath);
      await csiItAssetManagementPage.expectBulkTemplateUploadedToast();
      await csiItAssetManagementPage.clickBulkUploadContinueWhenEnabled();

      for (const assetName of assetNames) {
        await csiItAssetManagementPage.clickBulkAssetRowByName(assetName);
        await csiItAssetManagementPage.clickFirstMissingFieldsTag();
        await csiItAssetManagementPage.fillBulkAssetPurchaseCostAndSave('100');
        await csiItAssetManagementPage.expectBulkAssetRowStatus(assetName, 'OK');
      }

      await csiItAssetManagementPage.importBulkAssetsAndExpectClientMachineListUrl();
    });
  });

  /**
   * IA-011: purchase order wizard — purpose, date, supplier, three PDFs, assets, Create
   * (recorded-steps/ITAssetManagement/IA-011.txt). Same login as suite `beforeEach`.
   */
  test.describe('IA-011 purchase order creation', () => {
    test.describe.configure({ timeout: 300_000 });

    test('IA-011', async ({ csiItAssetManagementPage }) => {
      const purpose = csiItAssetPurchaseOrderPurposeRemark();

      await csiItAssetManagementPage.gotoItAssetPurchaseEditUrl();
      await csiItAssetManagementPage.fillItAssetPurchasePurpose(purpose);
      await csiItAssetManagementPage.pickItAssetPurchaseOrderDateToday();
      await csiItAssetManagementPage.selectItAssetPurchaseSupplierByName(csiItAssetSupplier);
      await csiItAssetManagementPage.selectPurchaseWizardQuotationTab();
      await csiItAssetManagementPage.uploadPurchaseWizardDocument(ia011QuotationPdfPath, ia011QuotationPdfFileName);
      await csiItAssetManagementPage.selectPurchaseWizardDeliveryNotesTab();
      await csiItAssetManagementPage.uploadPurchaseWizardDocument(
        ia011DeliveryNotesPdfPath,
        ia011DeliveryNotesPdfFileName,
      );
      await csiItAssetManagementPage.selectPurchaseWizardPurchaseInvoicesTab();
      await csiItAssetManagementPage.uploadPurchaseWizardDocument(
        ia011PurchaseInvoicePdfPath,
        ia011PurchaseInvoicePdfFileName,
      );
      await csiItAssetManagementPage.clickPurchaseWizardNext();
      await csiItAssetManagementPage.clickPurchaseWizardSearchAsset();
      await csiItAssetManagementPage.selectFirstThreePurchaseWizardAssetRows();
      await csiItAssetManagementPage.clickPurchaseWizardNext();
      await csiItAssetManagementPage.clickPurchaseWizardCreate();
      await csiItAssetManagementPage.expectItAssetPurchaseListWithRemark(purpose);
    });
  });
});
