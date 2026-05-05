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

function toUrl(url: string | URL): URL {
  return url instanceof URL ? url : new URL(url);
}

export function isCsiLoginPageUrl(url: string | URL): boolean {
  const u = toUrl(url);
  return u.hostname === CSI_HOST && u.pathname === CSI_LOGIN_PATH;
}
