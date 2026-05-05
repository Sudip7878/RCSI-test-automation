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
/** Unique fragment for test data; includes `TEST_WORKER_INDEX` for parallel workers. */
}
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
