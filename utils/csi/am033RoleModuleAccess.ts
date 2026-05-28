/** AM-033: role → module paths and access expectation (recorded-steps/AccountManagement/AM-033.txt). */
export type Am033RoleModuleAccess = {
  /** Role grid label (must match user-list Change Role gridcell text). */
  roleName: string;
  modulePaths: readonly string[];
};

export const AM033_ROLE_MODULE_ACCESS: readonly Am033RoleModuleAccess[] = [
  { roleName: 'Admin', modulePaths: ['/AccountManagement'] },
  { roleName: 'Manager', modulePaths: [] },
  {
    roleName: 'Policy Author',
    modulePaths: ['/ViewPolicies', '/PolicyTemplateLibrary'],
  },
  {
    roleName: 'Policy Owner',
    modulePaths: ['/PolicyDashboard', '/PolicyReport'],
  },
  { roleName: 'Policy User', modulePaths: [] },
  {
    roleName: 'Phishing admin',
    modulePaths: [
      '/phishingDashboard',
      '/phishingTest',
      '/myPhishingLibrary',
      '/phishingLibrary',
      '/phishingReport',
    ],
  },
  { roleName: 'Phishing User', modulePaths: [] },
  {
    roleName: 'IT Asset Manager',
    modulePaths: [
      '/ITAssetManagement?categoryId=1&subCategoryId=1',
      '/ITAssetManagement?categoryId=1&subCategoryId=2',
      '/ITAssetManagement?categoryId=2&subCategoryId=4',
      '/ITAssetManagement?categoryId=2&subCategoryId=3',
      '/ITAssetManagement?categoryId=3',
      '/ITAssetManagement?categoryId=4&subCategoryId=9',
      '/ITAssetPurchase',
      '/Settings',
    ],
  },
  { roleName: 'Incident Reporter', modulePaths: ['/IncidentReportDashboard'] },
  { roleName: 'System Admin', modulePaths: [] },
  { roleName: 'System User', modulePaths: [] },
  {
    roleName: 'Security Assessment Admin',
    modulePaths: ['/RequestHistory', '/AttackSurface'],
  },
  { roleName: 'Training Admin', modulePaths: [] },
  { roleName: 'Training User', modulePaths: [] },
] as const;

/** SI Partner is disabled in the role grid — excluded from assign/uncheck loops. */
export const AM033_ASSIGNABLE_ROLE_NAMES: readonly string[] = AM033_ROLE_MODULE_ACCESS.map(
  (r) => r.roleName,
);

export const AM033_PERMISSION_DENIED_TEXT = "You don't have permissions to view this screen." as const;

export const AM033_MODULE_ACCESS_TIMEOUT_MS = 5_000;

/** All mapped module paths (baseline: user with no roles should be denied on each). */
export function am033AllModulePaths(): string[] {
  const paths = new Set<string>();
  for (const role of AM033_ROLE_MODULE_ACCESS) {
    for (const p of role.modulePaths) {
      paths.add(p);
    }
  }
  return [...paths];
}
