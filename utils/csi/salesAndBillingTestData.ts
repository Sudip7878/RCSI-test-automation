import salesAndBilling from '../../data/csi/salesAndBilling.json';

export function csiPackageDescription(): string {
  return salesAndBilling.packageDefaults.description;
}

export function csiPackagePricePerModule(): number {
  return salesAndBilling.packageDefaults.unitPricePerModule;
}

export function csiUniquePackageName(
  prefix = salesAndBilling.packageDefaults.namePrefix,
): string {
  const worker = process.env.TEST_WORKER_INDEX ?? 'w0';
  return `${prefix}${Date.now()}-${worker}`;
}

export function csiSalesOrderDuration(): number {
  return salesAndBilling.salesOrderDefaults.duration;
}

export function csiSalesOrderUnitsPerModule(): number {
  return salesAndBilling.salesOrderDefaults.unitsPerModule;
}

/** Unique fragment for test data; includes `TEST_WORKER_INDEX` for parallel workers. */
export function csiUniqueTimestampSuffix(): string {
  const worker = process.env.TEST_WORKER_INDEX ?? 'w0';
  return `${Date.now()}-${worker}`;
}

/** CSI rejects `-` in Sales Partner name; joins worker id with `_`. */
export function csiUniqueSalesPartnerName(): string {
  const worker = process.env.TEST_WORKER_INDEX ?? '0';
  return `Partner_${Date.now()}_${worker}`;
}

export function csiSalesPartnerDomain(): string {
  return salesAndBilling.salesPartnerDefaults.domain;
}

export function csiSalesPartnerS3BucketName(): string {
  return salesAndBilling.salesPartnerDefaults.s3BucketName;
}

export function csiSalesPartnerS3BucketUrl(): string {
  return salesAndBilling.salesPartnerDefaults.s3BucketUrl;
}

export function csiSalesPartnerSendgridSenderName(): string {
  return salesAndBilling.salesPartnerDefaults.sendgridSenderName;
}

export function csiSalesPartnerSendgridReplyToEmail(): string {
  return salesAndBilling.salesPartnerDefaults.sendgridReplyToEmail;
}

export function csiSalesPartnerContactEmail(): string {
  return salesAndBilling.salesPartnerDefaults.salesPartnerContactEmail;
}

const SB067_DEFAULT_ORG_A_SALES_ORDER_ID = 144;

/** SB-067: Org A sales order id for cross-org leak check (`CSI_ORG_A_SALES_ORDER_ID`; default 144). */
export function csiOrgASalesOrderIdForSb067(): number {
  const raw = process.env.CSI_ORG_A_SALES_ORDER_ID?.trim();
  if (raw == null || raw.length === 0) {
    return SB067_DEFAULT_ORG_A_SALES_ORDER_ID;
  }
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('CSI_ORG_A_SALES_ORDER_ID must be a positive integer.');
  }
  return id;
}

/** SB-067: permission message must appear within this window (recorded-steps/Sales&Billing/SB-067.txt). */
export const SB067_NO_PERMISSION_MESSAGE_TIMEOUT_MS = 5_000;

/**
 * SB-024: Sales Partners to assign to a single billing partner.
 * Must both exist in the test environment.
 */
export const SB024_SALES_PARTNERS = ['Avotech', 'Ricoh'] as const;

/** SB-022: unique billing partner name prefix; suffix is timestamp-based to avoid collisions. */
const SB022_BILLING_PARTNER_NAME_PREFIX = 'Billing Test ';

/** SB-022: unique billing partner name for creation test (`Billing Test {timestamp}-{worker}`). */
export function csiUniqueBillingPartnerName(): string {
  return `${SB022_BILLING_PARTNER_NAME_PREFIX}${csiUniqueTimestampSuffix()}`;
}

/**
 * SB-025: generate two unique billing partner names from the same timestamp suffix
 * so they are distinct but share the same creation context.
 */
export function csiUniqueBillingPartnerNamePair(): [string, string] {
  const suffix = csiUniqueTimestampSuffix();
  return [
    `${SB022_BILLING_PARTNER_NAME_PREFIX}${suffix}-1`,
    `${SB022_BILLING_PARTNER_NAME_PREFIX}${suffix}-2`,
  ];
}

const SB027_DEFAULT_EXISTING_BILLING_PARTNER_NAME = 'BillingCo';

/** SB-027: duplicate billing partner name error shown on Submit — mirrors the "X already exist" pattern. */
export const SB027_DUPLICATE_BILLING_PARTNER_NAME_ERROR = 'Billing partner name already exist';

/** SB-027: email submitted in the billing partner form (not the duplicate trigger; name is). */
export const SB027_BILLING_PARTNER_EMAIL = 'dax.manning@appnovation.com';

/** SB-027: partial option label used to select the HSBC payment method in the dropdown. */
export const SB027_BILLING_PARTNER_PAYMENT_METHOD_OPTION = 'HSBC Avo Tech Limited (026–';

/** SB-027: existing billing partner name for duplicate-name check (`CSI_EXISTING_BILLING_PARTNER_NAME`; default BillingCo). */
export function csiExistingBillingPartnerNameForSb027(): string {
  const raw = process.env.CSI_EXISTING_BILLING_PARTNER_NAME?.trim();
  if (raw != null && raw.length > 0) {
    return raw;
  }
  return SB027_DEFAULT_EXISTING_BILLING_PARTNER_NAME;
}

const SB004_DEFAULT_EXISTING_PACKAGE_NAME = 'Avotech FULL';

/** SB-004: duplicate package name error shown on Submit (`CSI_EXISTING_PACKAGE_NAME`; default Avotech FULL). */
export const SB004_DUPLICATE_PACKAGE_NAME_ERROR = 'Package name already exist';

export function csiExistingPackageNameForSb004(): string {
  const raw = process.env.CSI_EXISTING_PACKAGE_NAME?.trim();
  if (raw != null && raw.length > 0) {
    return raw;
  }
  return SB004_DEFAULT_EXISTING_PACKAGE_NAME;
}
