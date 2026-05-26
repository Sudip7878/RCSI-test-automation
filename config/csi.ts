import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DEFAULT_CSI_BASE_URL = 'https://csi-tst.avotech.com';

const raw = process.env.CSI_BASE_URL?.trim();
const normalized = (raw && raw.length > 0 ? raw : DEFAULT_CSI_BASE_URL).replace(/\/$/, '');

/** App root URL (no trailing slash). Set `CSI_BASE_URL` in `.env` to override. */
export const CSI_BASE_URL = normalized;

const baseUrl = new URL(CSI_BASE_URL + '/');
export const CSI_HOST = baseUrl.hostname;

export const CSI_LOGIN_PATH = '/Login' as const;
export const CSI_LEGACY_LOGIN_PATH = '/Avotech/Login' as const;
export const CSI_HOME_PATH = '/' as const;
export const CSI_PACKAGE_LIST_PATH = '/PackageList' as const;
export const CSI_INCIDENT_REPORT_DASHBOARD_PATH = '/IncidentReportDashboard' as const;
export const CSI_INVOICE_LIST_PATH = '/InvoiceList' as const;
export const CSI_ORGANIZATION_DETAIL_PATH = '/OrganizationDetail' as const;
export const CSI_ORGANIZATION_LIST_PATH = '/avo_organizationlist' as const;
export const CSI_ATTACK_SURFACE_PATH = '/AttackSurface' as const;
export const CSI_REQUEST_HISTORY_PATH = '/RequestHistory' as const;
export const CSI_PENETRATION_TEST_PATH = '/PenetrationTest' as const;
export const CSI_ACCOUNT_MANAGEMENT_PATH = '/AccountManagement' as const;
export const CSI_CYBER_INSURANCE_PATH = '/CyberInsurance' as const;
export const CSI_POLICY_DETAIL_PATH = '/PolicyDetail' as const;
export const CSI_VIEW_ASSET_PATH = '/ViewAsset' as const;
export const CSI_DARKWEB_REPORT_PATH = '/DarkwebReport' as const;

/** IR-016: external Incident Response SSO host (path under this host may vary). */
export const CSI_BLACKPANDA_AUTH_HOST = 'auth.blackpanda.com' as const;

function toUrl(url: string | URL): URL {
  return url instanceof URL ? url : new URL(url);
}

export function isCsiLoginPageUrl(url: string | URL): boolean {
  const u = toUrl(url);
  return u.hostname === CSI_HOST && u.pathname === CSI_LOGIN_PATH;
}
