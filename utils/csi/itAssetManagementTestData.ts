import itAssetManagement from '../../data/csi/itAssetManagement.json';
import { utcDateBasedNumber } from '../dateUtils';

/** IA-048: Org A asset form id (`data/csi/itAssetManagement.json`). */
export function csiOrgAAssetFormId(): number {
  return itAssetManagement.orgAssetFormIds.orgA;
}

/** IA-048: Org B asset form id (`data/csi/itAssetManagement.json`). */
export function csiOrgBAssetFormId(): number {
  return itAssetManagement.orgAssetFormIds.orgB;
}

export const csiItAssetManufacturer = 'Acer' as const;
export const csiItAssetOperatingSystem = 'Windows' as const;
export const csiItAssetState = 'Disposed' as const;

/** IA-020: asset state labels as shown in listbox / view (match UI option text). */
export const csiItAssetStateLabelInStore = 'In Store' as const;
export const csiItAssetStateLabelInUse = 'In Use' as const;
export const csiItAssetStateLabelInRepair = 'In Repair' as const;
export const csiItAssetStateLabelDisposed = 'Disposed' as const;
export const csiItAssetStateLabelExpired = 'Expired' as const;
export const csiItAssetSupplier = 'ABC Computer Company' as const;
export const csiItAssetCurrency = 'HKD' as const;

export function csiItAssetOsVersion(): string {
  return '11';
}

export function csiItAssetIpAddress(): string {
  return '192.0.2.1';
}

export function csiItAssetLocation(): string {
  return 'Test Location';
}

export function csiItAssetWebsite(): string {
  return 'www.example.com';
}

export function csiItAssetPurchaseCost(): string {
  return '1000';
}

export function csiItAssetUniqueNumeric(): string {
  return utcDateBasedNumber();
}

/** `TestAsset_<uniqueNumeric>` — IA-001; use same `uniqueNumeric` as model number. */
export function csiItAssetDisplayName(uniqueNumeric: string): string {
  return `TestAsset_${uniqueNumeric}`;
}

export function csiItAssetSerialFromModelNumber(modelNumber: string): string {
  return modelNumber.split('').reverse().join('');
}

/** IA-016: replace trailing digits with `uniqueNumeric`; if none, append ` uniqueNumeric`. */
export function csiItAssetIa016EditedDisplayName(original: string, uniqueNumeric: string): string {
  const t = original.trim();
  const m = /^(.*?)(\d+)$/.exec(t);
  if (m?.[1] != null && m[2] != null) {
    return `${m[1]}${uniqueNumeric}`;
  }
  if (t.length === 0) {
    return uniqueNumeric;
  }
  return `${t} ${uniqueNumeric}`;
}

/** IA-037: new Manufacturer custom dropdown value added via Settings. */
export function csiItAssetIa037ManufacturerName(uniqueNumeric: string): string {
  return `Lenovo ${uniqueNumeric}`;
}

/** IA-039: custom field label created in Settings — `Test <uniqueNumeric>`. */
export function csiItAssetIa039CustomFieldLabel(uniqueNumeric: string): string {
  return `Test ${uniqueNumeric}`;
}

/** IA-044: initial custom field label created in Settings — `Test <uniqueNumeric>`. */
export function csiItAssetIa044CustomFieldLabel(uniqueNumeric: string): string {
  return `Test ${uniqueNumeric}`;
}

/** IA-044: edited custom field label after the rename step — `Test <uniqueNumeric reversed>`. */
export function csiItAssetIa044EditedCustomFieldLabel(uniqueNumeric: string): string {
  return `Test ${uniqueNumeric.split('').reverse().join('')}`;
}

/** IA-044: numeric value entered into the Number-type custom field — reversed uniqueNumeric. */
export function csiItAssetIa044ReversedNumericValue(uniqueNumeric: string): string {
  return uniqueNumeric.split('').reverse().join('');
}

/** IA-016: increment integer OS version; empty or non-numeric → `"1"`. */
export function csiItAssetIncrementOsVersionString(current: string): string {
  const t = String(current ?? '').trim();
  if (t.length === 0) {
    return '1';
  }
  const n = Number.parseInt(t, 10);
  if (Number.isFinite(n)) {
    return String(n + 1);
  }
  return '1';
}
