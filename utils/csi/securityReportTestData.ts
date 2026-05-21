import * as path from 'node:path';

export const CSI_ATTACK_SURFACE_REPORT_FILENAME = 'Attack_Surface_Report.pdf' as const;
export const CSI_DARKWEB_REPORT_TEST1_FILENAME = 'dark-web-report-test1.pdf' as const;
export const CSI_DARKWEB_REPORT_TEST2_FILENAME = 'dark-web-reprot-test2.pdf' as const;

const SECURITY_REPORT_DATA_DIR = path.join(process.cwd(), 'data', 'csi', 'security-report');

/** SR-005: fixture PDF under `data/csi/security-report/`. */
export function csiAttackSurfaceReportPdfPath(): string {
  return path.join(SECURITY_REPORT_DATA_DIR, CSI_ATTACK_SURFACE_REPORT_FILENAME);
}

/** SR-010: first darkweb upload fixture. */
export function csiDarkwebReportTest1PdfPath(): string {
  return path.join(SECURITY_REPORT_DATA_DIR, CSI_DARKWEB_REPORT_TEST1_FILENAME);
}

/** SR-010: second darkweb upload fixture. */
export function csiDarkwebReportTest2PdfPath(): string {
  return path.join(SECURITY_REPORT_DATA_DIR, CSI_DARKWEB_REPORT_TEST2_FILENAME);
}
