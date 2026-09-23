/** CC-022: Policy Management module on sales-order edit (recorded-steps/CrossCutting/CC-022.txt). */
export const CC022_POLICY_MANAGEMENT_MODULE_NAME = 'Policy Management' as const;

export const CC022_POLICY_MANAGEMENT_UNITS = 100;

export const CC022_POLICY_HUB_VISIBILITY_TIMEOUT_MS = 5_000;

export const CC022_SALES_ORDER_UPDATED_MESSAGE = /sales order updated/i;

/** CC-023: hub modules revoked for expired sales system owner (recorded-steps/CrossCutting/CC-023.txt). */
export const CC023_REVOKED_HUB_MODULE_LABELS = [
  'Training',
  'Phishing',
  'Policy Management',
  'IT Asset Management',
  'Security Assessment',
  'Incident Response',
] as const;

export const CC023_HUB_MODULE_VISIBILITY_TIMEOUT_MS = 10_000;

export const CC009_ADMIN_ACCESSIBLE_MODULE_PATHS = [
  '/AccountManagement',
  '/courseDashboard',
  '/myCourse',
  '/courseLibrary',
  '/CourseDistribution',
  '/CourseReport',
  '/MyPolicies',
  '/ITAssetManagement?categoryId=1&subCategoryId=1',
  '/ITAssetManagement?categoryId=1&subCategoryId=2',
  '/ITAssetManagement?categoryId=2&subCategoryId=4',
  '/ITAssetManagement?categoryId=2&subCategoryId=3',
  '/ITAssetManagement?categoryId=3',
  '/ITAssetManagement?categoryId=4&subCategoryId=9',
  '/ITAssetPurchase',
  '/Settings',
  '/IncidentReportDashboard',
  '/RequestHistory',
  '/AttackSurface',
] as const;

export const CC009_SALES_MODULE_PATHS = [
  '/PackageList',
  '/BillingPartnerList',
  '/ClientList',
  '/SalesPartnerList',
  '/InvoiceList',
  '/SalesOrderList',
] as const;

export const CC009_ADMIN_DENIED_MODULE_PATHS = [
  '/phishingDashboard',
  '/phishingTest',
  '/myPhishingLibrary',
  '/phishingLibrary',
  '/phishingReport',
  '/ViewPolicies',
  '/PolicyTemplateLibrary',
  '/PolicyDashboard',
  '/PolicyReport',
  ...CC009_SALES_MODULE_PATHS,
] as const;

export const CC009_MODULE_ACCESS_TIMEOUT_MS = 5_000;

export const CC009_CC010_PERMISSION_DENIED_TIMEOUT_MS = 10_000;

export function cc009SystemOwnerAccessibleModulePaths(): string[] {
  const salesPaths = new Set<string>(CC009_SALES_MODULE_PATHS);
  const adminDeniedExceptSales = CC009_ADMIN_DENIED_MODULE_PATHS.filter((p) => !salesPaths.has(p));
  return [...CC009_ADMIN_ACCESSIBLE_MODULE_PATHS, ...adminDeniedExceptSales];
}

/** CC-010: Training Admin module URLs (recorded-steps/CrossCutting/CC-010.txt). */
export const CC010_TRAINING_MODULE_PATHS = [
  '/courseDashboard',
  '/myCourse',
  '/courseLibrary',
  '/CourseDistribution',
  '/CourseReport',
] as const;

/** CC-010: phishing admin is denied these training paths; the rest stay reachable. */
export const CC010_PHISHING_ADMIN_DENIED_TRAINING_PATHS = [
  '/CourseDistribution',
  '/CourseReport',
] as const;

export function cc010PhishingAdminAccessibleTrainingPaths(): string[] {
  const denied = new Set<string>(CC010_PHISHING_ADMIN_DENIED_TRAINING_PATHS);
  return CC010_TRAINING_MODULE_PATHS.filter((modulePath) => !denied.has(modulePath));
}

/** CC-010: Phishing Admin module URLs. Training admin must be denied on these paths. */
export const CC010_PHISHING_MODULE_PATHS = [
  '/phishingDashboard',
  '/phishingTest',
  '/myPhishingLibrary',
  '/phishingLibrary',
  '/phishingReport',
] as const;

export const CC010_MODULE_ACCESS_TIMEOUT_MS = 5_000;
