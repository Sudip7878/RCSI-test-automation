import * as os from 'os';
import * as path from 'path';
import { expect, test } from '../../../fixtures/csi/testSetup';
import {
  csiOrgASystemOwnerTestEmail,
  csiOrgASystemOwnerTestPassword,
  csiOrgBSystemOwnerTestEmail,
  csiOrgBSystemOwnerTestPassword,
  csiItAssetManagerTestEmail,
  csiItAssetManagerTestPassword,
  csiSystemOwnerTestEmail,
  csiSystemOwnerTestPassword,
  csiTestEmail,
  csiTestPassword,
} from '../../../utils/csi/credentials';
import {
  buildIa003BulkClientMachineWorkbook,
  csiIa003BulkBaseNumeric,
  saveIa003EditedWorkbookArtifact,
} from '../../../utils/csi/itAssetBulkUpload';
import {
  csiOrgAAssetFormId,
  csiOrgBAssetFormId,
  csiItAssetDisplayName,
  csiItAssetIa016EditedDisplayName,
  csiItAssetIa037ManufacturerName,
  csiItAssetIa039CustomFieldLabel,
  csiItAssetIa044CustomFieldLabel,
  csiItAssetIa044EditedCustomFieldLabel,
  csiItAssetIa044ReversedNumericValue,
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
   * IA-004: bulk upload with errors — fix via UI (same flow as IA-003).
   */
  test.describe('IA-004 bulk upload with errors — fix via UI', () => {
    test.describe.configure({ timeout: 300_000 });

    test('IA-004', async ({ csiItAssetManagementPage }) => {
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

/**
 * IA-008: System Owner adds a client machine asset.
 * Same flow as IA-001 but authenticated as CSI_SYSTEM_OWNER_TEST_EMAIL.
 * (recorded-steps/ITAssetManagement/IA-008.txt)
 */
test.describe('CSI · IT Asset Management — system owner', () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ csiLoginPage }) => {
    if (!process.env.CSI_SYSTEM_OWNER_TEST_PASSWORD?.length) {
      test.skip();
      return;
    }

    await csiLoginPage.gotoLogin();
    await csiLoginPage.signInWithEmailAndPassword(csiSystemOwnerTestEmail(), csiSystemOwnerTestPassword());
    await csiLoginPage.expectOnHome();
  });

  test.describe('IA-008 system owner adds client machine asset', () => {
    test('IA-008', async ({ csiItAssetManagementPage }) => {
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
});

/**
 * IA-015: IT Asset Manager edits an existing purchase order.
 * Requires CSI_IT_ASSET_MANAGER_TEST_EMAIL login and CSI_IA015_PURCHASE_PURPOSE to identify the row.
 * (recorded-steps/ITAssetManagement/IA-015.txt)
 */
test.describe('CSI · IT Asset Management — IT asset manager', () => {
  test.describe.configure({ timeout: 300_000 });

  test.beforeEach(async ({ csiLoginPage }) => {
    if (!process.env.CSI_IT_ASSET_MANAGER_TEST_PASSWORD?.length) {
      test.skip();
      return;
    }

    await csiLoginPage.gotoLogin();
    await csiLoginPage.signInWithEmailAndPassword(csiItAssetManagerTestEmail(), csiItAssetManagerTestPassword());
    await csiLoginPage.expectOnHome();
  });

  /**
   * IA-022: IT Asset Manager filters Client Machine grid by Asset State (In Use, Disposed),
   * restores all filters, then sorts by Asset State both ways and verifies the total
   * record count is unchanged after each sort.
   * (recorded-steps/ITAssetManagement/IA-022.txt). Same login as IA-015.
   */
  test.describe('IA-022 filter and sort assets by state', () => {
    test('IA-022', async ({ csiItAssetManagementPage }) => {
      await csiItAssetManagementPage.openClientMachineListViaNav();

      // Capture the unfiltered total immediately after the grid loads — before any
      // scrolling or filtering — so both sort assertions compare against a stable baseline.
      const totalRecordsBefore = await csiItAssetManagementPage.readAssetGridTotalRecordCount();

      // Scroll to Asset State column and confirm it is present in the grid
      await csiItAssetManagementPage.scrollToAndVerifyAssetStateColumnHeader();

      // --- Filter 1: show In Use only ---
      await csiItAssetManagementPage.openAssetStateColumnFilter();
      await csiItAssetManagementPage.applyAssetStateColumnFilter(['In Use']);
      await csiItAssetManagementPage.expectAllVisibleAssetStateCellsMatch('In Use');

      // --- Filter 2: show Disposed only ---
      await csiItAssetManagementPage.openAssetStateColumnFilter();
      await csiItAssetManagementPage.applyAssetStateColumnFilter(['Disposed']);
      await csiItAssetManagementPage.expectAllVisibleAssetStateCellsMatch('Disposed');

      // --- Filter 3: restore all states ---
      await csiItAssetManagementPage.openAssetStateColumnFilter();
      await csiItAssetManagementPage.applyAssetStateColumnFilter(['Disposed', 'Expired', 'In Store', 'In Use']);

      // --- Sort 1: first click → ascending; first row should be Disposed ---
      await csiItAssetManagementPage.clickAssetStateColumnHeaderToSort();
      await csiItAssetManagementPage.expectFirstAssetStateGridCellIs('Disposed');
      expect(
        await csiItAssetManagementPage.readAssetGridTotalRecordCount(),
        'record count must not change after sort 1',
      ).toBe(totalRecordsBefore);

      // --- Sort 2: second click → descending; first row should be In Use ---
      await csiItAssetManagementPage.clickAssetStateColumnHeaderToSort();
      await csiItAssetManagementPage.expectFirstAssetStateGridCellIs('In Use');
      expect(
        await csiItAssetManagementPage.readAssetGridTotalRecordCount(),
        'record count must not change after sort 2',
      ).toBe(totalRecordsBefore);
    });
  });

  /**
   * IA-017: IT Asset Manager selects the first 10 assets on the Desktop Computers tab,
   * opens Bulk Edit, toggles each asset's OS Version between 'Windows 11 24H2' and '11',
   * saves, then verifies each row shows the updated value.
   * (recorded-steps/ITAssetManagement/IA-017.txt). Same login as IA-015 and IA-022.
   */
  test.describe('IA-017 bulk update OS version', () => {
    test('IA-017', async ({ csiItAssetManagementPage }) => {
      await csiItAssetManagementPage.openClientMachineListViaNav();

      // Read first 10 Asset IDs for post-save verification (grid at left scroll, Asset ID column visible)
      const assetIds = await csiItAssetManagementPage.readClientMachineGridFirstNAssetIds(10);

      // Check the row header checkboxes for the first 10 rows
      await csiItAssetManagementPage.selectClientMachineGridFirstNRows(10);

      // Open bulk edit form and wait for all 10 panels to render
      await csiItAssetManagementPage.clickBulkEditAndWaitForForm(10);

      // Toggle OS Version for each of the 10 panels; track new values for assertion
      const newOsVersions = await csiItAssetManagementPage.fillBulkEditOsVersionToggle(10);

      await csiItAssetManagementPage.saveBulkEditAndWaitForGrid();

      // Verify updated OS Version in the grid by row position (same sort order after save)
      await csiItAssetManagementPage.verifyOsVersionForFirstNRows(newOsVersions);
    });
  });

  /**
   * IA-029: capture first-row Asset ID + User, edit, reassign User via dropdown rules, assert grid
   * (recorded-steps/ITAssetManagement/IA-029.txt). Same login as IA-015.
   */
  test.describe('IA-029 reassign asset from one user to another', () => {
    test('IA-029', async ({ csiItAssetManagementPage }) => {
      await csiItAssetManagementPage.openClientMachineListViaNav();

      const [assetId] = await csiItAssetManagementPage.readClientMachineGridFirstNAssetIds(1);
      const initialUser = await csiItAssetManagementPage.readFirstClientMachineGridRowUserIa029();

      await csiItAssetManagementPage.clickEditOnFirstClientMachineAssetRowIa029();
      await csiItAssetManagementPage.expectItAssetEditFormReady();

      const reassignedUser = await csiItAssetManagementPage.reassignUserOnItAssetEditFormIa029(initialUser);
      await csiItAssetManagementPage.saveNewAsset();

      await csiItAssetManagementPage.expectClientMachineGridFirstRowShowsAssetIdAndUserIa029(
        assetId,
        reassignedUser,
      );
    });
  });

  /**
   * IA-002: creates one asset in each of the eight supported categories via the UI
   * and verifies that each newly created asset name appears in its respective grid.
   * Categories: Client Machine (Desktop), Network Switch, Physical Server,
   * Backup/Storage (NAS), Software, SaaS, PaaS, IaaS.
   * Login: CSI_IT_ASSET_MANAGER_TEST_EMAIL (inherited from outer beforeEach).
   * (recorded-steps/ITAssetManagement/IA-002.txt)
   */
  test.describe('IA-002 add assets across all categories via UI', () => {
    test.describe.configure({ timeout: 600_000 });

    test('IA-002', async ({ csiItAssetManagementPage }) => {
      const uniqueNumeric = csiItAssetUniqueNumeric();

      // --- Client Machine (Desktop Computers) — mirrors IA-001 flow ---
      const clientMachineName = csiItAssetDisplayName(uniqueNumeric);
      const modelNumber = uniqueNumeric;
      const serialNumber = csiItAssetSerialFromModelNumber(modelNumber);

      await csiItAssetManagementPage.openClientMachineList();
      await csiItAssetManagementPage.startAddAsset();
      await csiItAssetManagementPage.selectCategoryDesktopComputers();

      const identityParams = {
        displayName: clientMachineName,
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
        { website: csiItAssetWebsite(), purchaseCost: csiItAssetPurchaseCost() },
        identityParams,
      );
      await csiItAssetManagementPage.pickPurchaseDateToday();
      await csiItAssetManagementPage.pickWarrantyOrEndDateOneMonthFromToday();
      await csiItAssetManagementPage.saveNewAsset();
      await csiItAssetManagementPage.expectAssetVisibleInGridAfterAcquisitionSort(clientMachineName);

      // --- Network Device (Office > Network devices > Network Switches) ---
      const networkSwitchName = `TestNetworkSwitch_${uniqueNumeric}`;
      await csiItAssetManagementPage.navigateToNetworkDeviceListAndStartAddIa002();
      await csiItAssetManagementPage.fillAndSaveNetworkSwitchAssetIa002(
        networkSwitchName,
        modelNumber,
        serialNumber,
        csiItAssetIpAddress(),
      );
      await csiItAssetManagementPage.waitForAssetNameInGridIa002(networkSwitchName);

      // --- Physical Asset (Server > Physical) ---
      const physicalName = `TestPhysical_${uniqueNumeric}`;
      await csiItAssetManagementPage.navigateToPhysicalServerListAndStartAddIa002();
      await csiItAssetManagementPage.fillAndSavePhysicalServerAssetIa002(physicalName, modelNumber);
      await csiItAssetManagementPage.waitForAssetNameInGridIa002(physicalName);

      // --- Backup/Storage Asset (Server > Backup/Storage > Network Attached Storage) ---
      const backupStorageName = `TestBackupStorage_${uniqueNumeric}`;
      await csiItAssetManagementPage.navigateToBackupStorageListAndStartAddIa002();
      await csiItAssetManagementPage.fillAndSaveBackupStorageAssetIa002(backupStorageName);
      await csiItAssetManagementPage.waitForAssetNameInGridIa002(backupStorageName);

      // --- Software Asset (Software) ---
      const softwareName = `TestSoftware_${uniqueNumeric}`;
      await csiItAssetManagementPage.navigateToSoftwareListAndStartAddIa002();
      await csiItAssetManagementPage.fillAndSaveSoftwareAssetIa002(softwareName);
      await csiItAssetManagementPage.waitForAssetNameInGridIa002(softwareName);

      // --- SaaS Asset (Cloud > Service > SaaS) ---
      const saasName = `TestSaaS_${uniqueNumeric}`;
      await csiItAssetManagementPage.navigateToSaaSListAndStartAddIa002();
      await csiItAssetManagementPage.fillAndSaveSaaSAssetIa002(saasName);
      await csiItAssetManagementPage.waitForAssetNameInGridIa002(saasName);

      // --- PaaS Asset (Cloud > Service > PaaS) ---
      // fillAndSavePaaSAssetIa002 re-clicks 'PaaS' after save to reload the grid
      const paasName = `TestPaaS_${uniqueNumeric}`;
      await csiItAssetManagementPage.navigateToPaaSListAndStartAddIa002();
      await csiItAssetManagementPage.fillAndSavePaaSAssetIa002(paasName);
      await csiItAssetManagementPage.waitForAssetNameInGridIa002(paasName);

      // --- IaaS Asset (Cloud > Service > IaaS) ---
      // fillAndSaveIaaSAssetIa002 re-clicks 'IaaS' after save to reload the grid
      const iaasName = `TestIaaS_${uniqueNumeric}`;
      await csiItAssetManagementPage.navigateToIaaSListAndStartAddIa002();
      await csiItAssetManagementPage.fillAndSaveIaaSAssetIa002(iaasName);
      await csiItAssetManagementPage.waitForAssetNameInGridIa002(iaasName);
    });
  });

  /**
   * IA-032: navigates to Client Machine via the hub menu, edits the first asset to link
   * a Software Suite Name (first available option), saves, then views the asset and
   * verifies the Software Suite Name is no longer "N/A".
   * Login: CSI_IT_ASSET_MANAGER_TEST_EMAIL (inherited from outer beforeEach).
   * (recorded-steps/ITAssetManagement/IA-032.txt)
   */
  test.describe('IA-032 link software to hardware via Software Suite Name', () => {
    test('IA-032', async ({ csiItAssetManagementPage }) => {
      await csiItAssetManagementPage.openClientMachineListViaNav();

      await csiItAssetManagementPage.clickEditOnFirstClientMachineGridRowIa032();
      await csiItAssetManagementPage.expectItAssetEditFormReady();

      // Select the first available option from the Software Suite Name dropdown
      // (scoped to ITassets.softwareDetailSection to avoid ambiguous 'Select...' placeholders)
      const selectedSoftwareName =
        await csiItAssetManagementPage.selectFirstOptionInSoftwareSuiteNameDropdownIa032();

      await csiItAssetManagementPage.saveNewAsset();

      await csiItAssetManagementPage.clickViewOnFirstClientMachineGridRowIa032();
      await csiItAssetManagementPage.expectSoftwareSuiteNameIsLinkedInAssetViewIa032(selectedSoftwareName);
    });
  });

  test.describe('IA-015 edit existing purchase order', () => {
    test('IA-015', async ({ csiItAssetManagementPage }) => {
      await csiItAssetManagementPage.gotoItAssetPurchaseListUrl();

      // Read the first row's state at runtime — Purpose is the runtime identifier for this test run
      const preState = await csiItAssetManagementPage.readFirstPurchaseGridRowState();
      const { purpose } = preState;

      await csiItAssetManagementPage.clickEditOnPurchaseGridRowByPurpose(purpose);
      await csiItAssetManagementPage.waitForPurchaseEditFormReady();

      // Swap supplier by position (1st ↔ 2nd); add options via popup if fewer than 2 exist
      const newSupplierName = await csiItAssetManagementPage.swapPurchaseEditSupplierAndGetNewName();

      // Delete first doc if 3 are present; otherwise upload Test Quotation.pdf
      const newDocCount = await csiItAssetManagementPage.countAndHandlePurchaseDocuments(ia011QuotationPdfPath);

      await csiItAssetManagementPage.clickPurchaseWizardNext();
      await csiItAssetManagementPage.clickPurchaseWizardSearchAsset();
      await csiItAssetManagementPage.selectFirstPurchaseWizardAssetRow();
      await csiItAssetManagementPage.clickPurchaseWizardNext();
      await csiItAssetManagementPage.clickPurchaseWizardSave();

      await csiItAssetManagementPage.expectPurchaseGridRowAfterEdit(
        purpose,
        newSupplierName,
        newDocCount,
        preState.linkedCount + 1,
      );
    });
  });

  /**
   * IA-037: adds a new Manufacturer custom dropdown value via IT Asset Management Settings,
   * then confirms the newly added option is visible in the Manufacturer dropdown on the
   * Client Machine edit form. Does not select the new value — presence verification only.
   * Login: CSI_IT_ASSET_MANAGER_TEST_EMAIL (inherited from outer beforeEach).
   * (recorded-steps/ITAssetManagement/IA-037.txt)
   */
  test.describe('IA-037 add new Manufacturer value via Settings and verify in edit dropdown', () => {
    test('IA-037', async ({ csiItAssetManagementPage }) => {
      const uniqueNumeric = csiItAssetUniqueNumeric();
      const manufacturerName = csiItAssetIa037ManufacturerName(uniqueNumeric);

      // Navigate to Settings > Client Machine > Manufacturer
      await csiItAssetManagementPage.navigateToItAssetManagementSettingsIa037();
      await csiItAssetManagementPage.openManufacturerFieldSettingsIa037();

      // Add the new manufacturer value in English and Traditional Chinese tabs, then save
      await csiItAssetManagementPage.addNewManufacturerValueIa037(manufacturerName);

      // Return to home and wait for the redirect to complete before navigating further
      await csiItAssetManagementPage.navigateHomeAndWaitIa037();

      // Navigate to the Client Machine grid and open the edit form for the first row
      await csiItAssetManagementPage.openClientMachineListViaNav();
      await csiItAssetManagementPage.clickEditOnFirstClientMachineAssetRowIa029();
      await csiItAssetManagementPage.expectItAssetEditFormReady();

      // Open the Manufacturer dropdown by clicking the currently-selected value
      await csiItAssetManagementPage.openManufacturerDropdownOnEditFormIa037();

      // Verify the newly added Manufacturer option is present in the options list (no selection)
      await csiItAssetManagementPage.expectManufacturerOptionVisibleInDropdownIa037(manufacturerName);
    });
  });

  /**
   * IA-039: Creates a custom text field with Track History enabled via Settings,
   * edits the first Client Machine asset three times (V1 → V2 → V3), opens the View
   * page and verifies all three values are present in the field's history dialog.
   * Cleans up by deleting the custom field from Settings at the end.
   * Login: CSI_IT_ASSET_MANAGER_TEST_EMAIL (inherited from outer beforeEach).
   * (recorded-steps/ITAssetManagement/IA-039.txt)
   */
  test.describe('IA-039 custom field with track history enabled', () => {
    test.describe.configure({ timeout: 300_000 });

    test('IA-039', async ({ csiItAssetManagementPage }) => {
      const uniqueNumeric = csiItAssetUniqueNumeric();
      const customFieldLabel = csiItAssetIa039CustomFieldLabel(uniqueNumeric);
      const customFieldPlaceholder = 'Test Field';

      // --- Create the custom field with Track History in Client Machine Settings ---
      await csiItAssetManagementPage.navigateToCustomFieldSettingsClientMachineIa039();
      await csiItAssetManagementPage.addCustomFieldWithHistoryTrackingIa039(
        customFieldLabel,
        customFieldPlaceholder,
      );

      // --- Navigate to the Client Machine grid and capture the first row's Asset ID ---
      await csiItAssetManagementPage.openClientMachineListViaNav();
      const assetId = await csiItAssetManagementPage.readFirstClientMachineGridRowAssetIdIa039();

      // --- Edit the same asset three times to build up history entries (V1, V2, V3) ---
      await csiItAssetManagementPage.clickEditOnClientMachineGridRowByAssetIdIa039(assetId);
      await csiItAssetManagementPage.expectItAssetEditFormReady();
      await csiItAssetManagementPage.fillCustomTextFieldOnEditFormIa039(
        customFieldLabel,
        customFieldPlaceholder,
        'V1',
      );
      await csiItAssetManagementPage.saveNewAsset();

      await csiItAssetManagementPage.clickEditOnClientMachineGridRowByAssetIdIa039(assetId);
      await csiItAssetManagementPage.expectItAssetEditFormReady();
      await csiItAssetManagementPage.fillCustomTextFieldOnEditFormIa039(
        customFieldLabel,
        customFieldPlaceholder,
        'V2',
      );
      await csiItAssetManagementPage.saveNewAsset();

      await csiItAssetManagementPage.clickEditOnClientMachineGridRowByAssetIdIa039(assetId);
      await csiItAssetManagementPage.expectItAssetEditFormReady();
      await csiItAssetManagementPage.fillCustomTextFieldOnEditFormIa039(
        customFieldLabel,
        customFieldPlaceholder,
        'V3',
      );
      await csiItAssetManagementPage.saveNewAsset();

      // --- Open View, verify history dialog shows V1, V2, V3, then close it ---
      await csiItAssetManagementPage.clickViewOnClientMachineGridRowByAssetIdIa039(assetId);
      await csiItAssetManagementPage.clickViewCustomFieldHistoryLinkIa039(customFieldPlaceholder);
      await csiItAssetManagementPage.expectCustomFieldHistoryDialogShowsValuesIa039(['V1', 'V2', 'V3']);
      await csiItAssetManagementPage.closeHistoryDialogIa039();

      // --- Cleanup: delete the custom field from Settings ---
      await csiItAssetManagementPage.deleteCustomFieldFromSettingsIa039(customFieldLabel);
    });
  });

  /**
   * IA-044: IT Asset Admin creates a custom Text field (Basic Field) for Client Machine,
   * then edits it (rename label + change to Vendor Field / Number type), verifies integer
   * validation on the asset edit form (empty save → error, valid number → redirects to grid),
   * and finally deletes the custom field for cleanup.
   * Login: CSI_IT_ASSET_MANAGER_TEST_EMAIL (inherited from outer beforeEach).
   * (recorded-steps/ITAssetManagement/IA-044.txt)
   */
  test.describe('IA-044 IT Asset Admin edits their own custom field', () => {
    test.describe.configure({ timeout: 300_000 });

    test('IA-044', async ({ csiItAssetManagementPage }) => {
      const uniqueNumeric = csiItAssetUniqueNumeric();
      const originalLabel = csiItAssetIa044CustomFieldLabel(uniqueNumeric);
      const editedLabel = csiItAssetIa044EditedCustomFieldLabel(uniqueNumeric);
      const editedNumericValue = csiItAssetIa044ReversedNumericValue(uniqueNumeric);
      const placeholder = 'Test';

      // --- Create a custom Text field (Basic Field) in Client Machine Settings ---
      await csiItAssetManagementPage.navigateToCustomFieldSettingsClientMachineIa039();
      await csiItAssetManagementPage.addCustomFieldBasicTextIa044(originalLabel, placeholder);

      // --- Edit the field: rename, change Segment to Vendor Field, change Type to Number ---
      // Waits 3 seconds after saving so the settings page fully persists before navigating
      await csiItAssetManagementPage.editCustomFieldLabelSegmentTypeIa044(originalLabel, editedLabel);

      // --- Navigate to Client Machine grid via nav hub ---
      await csiItAssetManagementPage.navigateHomeAndWaitIa037();
      await csiItAssetManagementPage.openClientMachineListViaNav();

      // --- Open the edit form for the first asset row ---
      await csiItAssetManagementPage.clickEditOnFirstClientMachineGridRowIa044();
      await csiItAssetManagementPage.expectItAssetEditFormReady();

      // --- Verify Number type validation: empty → error, valid integer → redirect to grid ---
      await csiItAssetManagementPage.fillCustomNumberFieldIa044(editedLabel, placeholder, editedNumericValue);

      // --- Cleanup: delete the custom field from Settings ---
      await csiItAssetManagementPage.deleteCustomFieldFromSettingsIa039(editedLabel);
    });
  });
});

test.describe('CSI · IT Asset Management — org asset isolation', () => {
  test.describe.configure({ timeout: 120_000 });

  /**
   * IA-048: Org A owner cannot open Org B asset view and vice versa.
   * Form ids in `data/csi/itAssetManagement.json` (recorded-steps/ITAssetManagement/IA-048.txt).
   */
  test.describe('IA-048 cross-org ViewAsset access denied', () => {
    test('IA-048', async ({ csiLoginPage, csiItAssetManagementPage }) => {
      if (
        !process.env.CSI_ORG_A_SYSTEM_OWNER_TEST_PASSWORD?.length ||
        !process.env.CSI_ORG_A_SYSTEM_OWNER_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_ORG_B_SYSTEM_OWNER_TEST_PASSWORD?.length ||
        !process.env.CSI_ORG_B_SYSTEM_OWNER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiOrgASystemOwnerTestEmail(),
        csiOrgASystemOwnerTestPassword(),
      );
      await csiLoginPage.expectOnHome();

      await csiItAssetManagementPage.openViewAsset(csiOrgBAssetFormId());
      await csiItAssetManagementPage.expectViewAssetSomethingWentWrong();

      await csiLoginPage.gotoHome();
      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiOrgBSystemOwnerTestEmail(),
        csiOrgBSystemOwnerTestPassword(),
      );
      await csiLoginPage.expectOnHome();

      await csiItAssetManagementPage.openViewAsset(csiOrgAAssetFormId());
      await csiItAssetManagementPage.expectViewAssetSomethingWentWrong();
    });
  });
});
