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
  csiItAssetIa016EditedDisplayName,
  csiItAssetIncrementOsVersionString,
  csiItAssetIpAddress,
  csiItAssetLocation,
  csiItAssetOsVersion,
  csiItAssetPurchaseCost,
  csiItAssetSerialFromModelNumber,
  csiItAssetStateLabelDisposed,
  csiItAssetStateLabelExpired,
  csiItAssetStateLabelInRepair,
  csiItAssetStateLabelInStore,
  csiItAssetStateLabelInUse,
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

      const identityParams = {
        displayName,
        modelNumber,
        serialNumber,
        osVersion: csiItAssetOsVersion(),
        ipAddress: csiItAssetIpAddress(),
      };
      await csiItAssetManagementPage.fillAssetIdentity(identityParams);

      await csiItAssetManagementPage.fillAssetStateAndLocation(
        { location: csiItAssetLocation() },
        identityParams,
      );

      await csiItAssetManagementPage.fillSupplierAndCommercial(
        {
          website: csiItAssetWebsite(),
          purchaseCost: csiItAssetPurchaseCost(),
        },
        identityParams,
      );

      await csiItAssetManagementPage.pickPurchaseDateToday();
      await csiItAssetManagementPage.pickWarrantyOrEndDateOneMonthFromToday();
      await csiItAssetManagementPage.saveNewAsset();

      await csiItAssetManagementPage.expectAssetVisibleInGridAfterAcquisitionSort(displayName);
    });
  });

  /**
   * IA-020: create (In Store) → view/assert → edit from view → state chain with grid pagination finder
   * (recorded-steps/ITAssetManagement/IA-020.txt). Suite `beforeEach` login.
   */
  test.describe('IA-020 client machine asset state lifecycle', () => {
    test.describe.configure({ timeout: 300_000 });

    test('IA-020', async ({ csiItAssetManagementPage }) => {
      const uniqueNumeric = csiItAssetUniqueNumeric();
      const displayName = csiItAssetDisplayName(uniqueNumeric);
      const modelNumber = uniqueNumeric;
      const serialNumber = csiItAssetSerialFromModelNumber(modelNumber);

      await csiItAssetManagementPage.openClientMachineList();
      await csiItAssetManagementPage.startAddAssetIa020();
      await csiItAssetManagementPage.selectCategoryDesktopComputersIa020();

      const identityParams = {
        displayName,
        modelNumber,
        serialNumber,
        osVersion: csiItAssetOsVersion(),
        ipAddress: csiItAssetIpAddress(),
      };
      await csiItAssetManagementPage.fillAssetIdentityIa020(identityParams);

      await csiItAssetManagementPage.fillAssetStateAndLocationUsingStateOptionIa020(
        {
          location: csiItAssetLocation(),
          stateOptionName: csiItAssetStateLabelInStore,
        },
        identityParams,
      );

      await csiItAssetManagementPage.fillSupplierAndCommercialIa020(
        {
          website: csiItAssetWebsite(),
          purchaseCost: csiItAssetPurchaseCost(),
        },
        identityParams,
      );

      await csiItAssetManagementPage.pickPurchaseDateToday();
      await csiItAssetManagementPage.pickWarrantyOrEndDateOneMonthFromToday();
      await csiItAssetManagementPage.saveNewAsset();
      await csiItAssetManagementPage.openClientMachineList();

      await csiItAssetManagementPage.expectClientMachineAutogenerateGridShowsAssetName(displayName);

      await csiItAssetManagementPage.clickViewOnClientMachineAutogenerateGridRowByAssetName(displayName);
      await csiItAssetManagementPage.expectItAssetDetailViewShowsAssetState(csiItAssetStateLabelInStore);

      const stateTransitions: readonly string[] = [
        csiItAssetStateLabelInUse,
        csiItAssetStateLabelInRepair,
        csiItAssetStateLabelInUse,
        csiItAssetStateLabelDisposed,
      ];

      for (const nextState of stateTransitions) {
        await csiItAssetManagementPage.clickEditOnItAssetViewPage();
        await csiItAssetManagementPage.expectItAssetEditFormReady();
        await csiItAssetManagementPage.selectAssetStateOnItAssetEditForm(nextState);
        await csiItAssetManagementPage.saveNewAsset();
        await csiItAssetManagementPage.openClientMachineList();
        await csiItAssetManagementPage.clickViewOnClientMachineAutogenerateGridRowByAssetName(displayName);
        await csiItAssetManagementPage.expectItAssetDetailViewShowsAssetState(nextState);
      }

      const uniqueNumeric2 = csiItAssetUniqueNumeric();
      const displayName2 = csiItAssetDisplayName(uniqueNumeric2);
      const modelNumber2 = uniqueNumeric2;
      const serialNumber2 = csiItAssetSerialFromModelNumber(modelNumber2);

      await csiItAssetManagementPage.openClientMachineList();
      await csiItAssetManagementPage.startAddAssetIa020();
      await csiItAssetManagementPage.selectCategoryDesktopComputersIa020();

      const identityParams2 = {
        displayName: displayName2,
        modelNumber: modelNumber2,
        serialNumber: serialNumber2,
        osVersion: csiItAssetOsVersion(),
        ipAddress: csiItAssetIpAddress(),
      };
      await csiItAssetManagementPage.fillAssetIdentityIa020(identityParams2);

      await csiItAssetManagementPage.fillAssetStateAndLocationUsingStateOptionIa020(
        {
          location: csiItAssetLocation(),
          stateOptionName: csiItAssetStateLabelExpired,
        },
        identityParams2,
      );

      await csiItAssetManagementPage.fillSupplierAndCommercialIa020(
        {
          website: csiItAssetWebsite(),
          purchaseCost: csiItAssetPurchaseCost(),
        },
        identityParams2,
      );

      await csiItAssetManagementPage.pickPurchaseDateToday();
      await csiItAssetManagementPage.pickWarrantyOrEndDateOneMonthFromToday();
      await csiItAssetManagementPage.saveNewAsset();
      await csiItAssetManagementPage.openClientMachineList();

      await csiItAssetManagementPage.expectClientMachineAutogenerateGridShowsAssetName(displayName2);
      await csiItAssetManagementPage.clickViewOnClientMachineAutogenerateGridRowByAssetName(displayName2);
      await csiItAssetManagementPage.expectItAssetDetailViewShowsAssetState(csiItAssetStateLabelExpired);
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
      await csiItAssetManagementPage.startBulkUploadAssetIa003();
      const downloadedPath = await csiItAssetManagementPage.downloadBulkAssetTemplateIa003(os.tmpdir());
      const parsed = path.parse(downloadedPath);
      const editedPath = path.join(parsed.dir, `${parsed.name}${baseNumeric}${parsed.ext || '.xlsx'}`);
      const assetNames = buildIa003BulkClientMachineWorkbook({
        downloadedTemplatePath: downloadedPath,
        outputPath: editedPath,
        baseNumeric,
      });
      saveIa003EditedWorkbookArtifact(editedPath);

      await csiItAssetManagementPage.uploadBulkCompletedTemplateIa003(editedPath);
      await csiItAssetManagementPage.clickBulkUploadContinueWhenEnabled();

      for (const assetName of assetNames) {
        await csiItAssetManagementPage.fixBulkAssetMissingPurchaseCostIa003(assetName, '100');
      }

      await csiItAssetManagementPage.importBulkAssetsIa003();
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

  /**
   * IA-016: edit first desktop row — asset name + OS version; grid assertions (IA-016.txt).
   */
  test.describe('IA-016 edit client machine asset', () => {
    test('IA-016', async ({ csiItAssetManagementPage }) => {
      const uniqueNumeric = csiItAssetUniqueNumeric();

      await csiItAssetManagementPage.gotoItAssetManagementClientMachineDesktopListUrl();
      await csiItAssetManagementPage.clickDesktopComputersExpectClientMachineGrid();
      await csiItAssetManagementPage.clickEditOnFirstClientMachineAssetRow();
      await csiItAssetManagementPage.expectItAssetEditFormReady();

      const currentName = await csiItAssetManagementPage.readItAssetEditFormAssetName();
      const newName = csiItAssetIa016EditedDisplayName(currentName, uniqueNumeric);
      const currentOs = await csiItAssetManagementPage.readItAssetEditFormOsVersion();
      const newOs = csiItAssetIncrementOsVersionString(currentOs);

      await csiItAssetManagementPage.fillItAssetEditFormAssetName(newName);
      await csiItAssetManagementPage.fillItAssetEditFormOsVersion(newOs);
      await csiItAssetManagementPage.saveNewAsset();

      await csiItAssetManagementPage.expectClientMachineGridCellVisibleExact(newName);
      await csiItAssetManagementPage.expectClientMachineGridRowShowsOsVersionForAsset(newName, newOs);
    });
  });

  /**
   * IA-025: create client machine (IA-001) → desktop list → edit same row by Asset Name (IA-016-style),
   * assign first User → View row and assert User visible (recorded-steps/ITAssetManagement/IA-025.txt).
   * Single login: suite `beforeEach`.
   */
  test.describe('IA-025 create then edit client machine with user and view', () => {
    test.describe.configure({ timeout: 300_000 });

    test('IA-025', async ({ csiItAssetManagementPage }) => {
      const uniqueNumeric = csiItAssetUniqueNumeric();
      const displayName = csiItAssetDisplayName(uniqueNumeric);
      const modelNumber = uniqueNumeric;
      const serialNumber = csiItAssetSerialFromModelNumber(modelNumber);

      await csiItAssetManagementPage.openClientMachineList();
      await csiItAssetManagementPage.startAddAsset();
      await csiItAssetManagementPage.selectCategoryDesktopComputers();

      const identityParams = {
        displayName,
        modelNumber,
        serialNumber,
        osVersion: csiItAssetOsVersion(),
        ipAddress: csiItAssetIpAddress(),
      };
      await csiItAssetManagementPage.fillAssetIdentity(identityParams);

      await csiItAssetManagementPage.fillAssetStateAndLocation(
        { location: csiItAssetLocation() },
        identityParams,
      );

      await csiItAssetManagementPage.fillSupplierAndCommercial(
        {
          website: csiItAssetWebsite(),
          purchaseCost: csiItAssetPurchaseCost(),
        },
        identityParams,
      );

      await csiItAssetManagementPage.pickPurchaseDateToday();
      await csiItAssetManagementPage.pickWarrantyOrEndDateOneMonthFromToday();
      await csiItAssetManagementPage.saveNewAsset();

      await csiItAssetManagementPage.expectAssetVisibleInGridAfterAcquisitionSort(displayName);

      await csiItAssetManagementPage.gotoItAssetManagementClientMachineDesktopListUrl();
      await csiItAssetManagementPage.clickDesktopComputersExpectClientMachineGrid();
      await csiItAssetManagementPage.clickEditOnClientMachineGridRowByAssetNameIa025(displayName);
      await csiItAssetManagementPage.expectItAssetEditFormReady();

      const currentName = await csiItAssetManagementPage.readItAssetEditFormAssetName();
      const newName = csiItAssetIa016EditedDisplayName(currentName, uniqueNumeric);
      const currentOs = await csiItAssetManagementPage.readItAssetEditFormOsVersion();
      const newOs = csiItAssetIncrementOsVersionString(currentOs);

      await csiItAssetManagementPage.fillItAssetEditFormAssetName(newName);
      await csiItAssetManagementPage.fillItAssetEditFormOsVersion(newOs);
      const assignedUserLabel = await csiItAssetManagementPage.selectFirstUserOnItAssetEditFormIa025();
      await csiItAssetManagementPage.saveNewAsset();

      await csiItAssetManagementPage.expectClientMachineGridRowShowsOsVersionForAssetAfterAcquisitionSortIa025(
        newName,
        newOs,
      );

      await csiItAssetManagementPage.gotoItAssetManagementClientMachineDesktopListUrl();
      await csiItAssetManagementPage.clickDesktopComputersExpectClientMachineGrid();
      await csiItAssetManagementPage.clickViewOnClientMachineGridRowByAssetNameIa025(newName);
      await csiItAssetManagementPage.expectItAssetViewShowsTextIa025(assignedUserLabel);
    });
  });
});
