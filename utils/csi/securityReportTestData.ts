import * as path from 'node:path';

export const CSI_ATTACK_SURFACE_REPORT_FILENAME = 'Attack_Surface_Report.pdf' as const;

/** SR-005: fixture PDF under `data/csi/security-report/`. */
export function csiAttackSurfaceReportPdfPath(): string {
  return path.join(process.cwd(), 'data', 'csi', 'security-report', CSI_ATTACK_SURFACE_REPORT_FILENAME);
}
