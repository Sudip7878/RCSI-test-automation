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
