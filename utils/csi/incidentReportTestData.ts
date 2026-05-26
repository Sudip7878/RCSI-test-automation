import * as path from 'node:path';
import incidentReport from '../../data/csi/incidentReport.json';
import { utcDateBasedNumber } from '../dateUtils';

/** IR-019: Org A incident report id (`data/csi/incidentReport.json`). */
export function csiOrgAIncidentReportId(): number {
  return incidentReport.orgIncidentReportIds.orgA;
}

/** IR-019: Org B incident report id (`data/csi/incidentReport.json`). */
export function csiOrgBIncidentReportId(): number {
  return incidentReport.orgIncidentReportIds.orgB;
}

/** IR-005: `Test Incident ` + UTC numeric suffix (see recorded steps). */
export function csiIncidentDescription(uniqueNumeric = utcDateBasedNumber()): string {
  return `Test Incident ${uniqueNumeric}`;
}

/** IR-012: numeric suffix from `csiIncidentDescription()` (e.g. `Test Incident 20260211120000` → `20260211120000`). */
export function parseTestIncidentDescriptionSuffix(description: string): string {
  const m = description.match(/Test Incident\s+(\d+)\s*$/i);
  if (m?.[1]) {
    return m[1];
  }
  throw new Error(`Expected description like "Test Incident <digits>", got: ${description}`);
}

/** Fixture PDF on disk (`Comment_Document.pdf`). */
export function csiIncidentCommentDocumentPdfPath(): string {
  return path.join(process.cwd(), 'data', 'csi', 'incident-report', 'Comment_Document.pdf');
}

export function csiIncidentCommentBody(suffix: string): string {
  return `Test Comment ${suffix}`;
}

export function csiIncidentCommentReplyBody(suffix: string): string {
  return `Test Comment Reply ${suffix}`;
}

export function csiIncidentCommentUploadedPdfAliasName(suffix: string): string {
  return `Comment_Document_${suffix}.pdf`;
}

export function csiIncidentAffectedSystems(): string {
  return 'QA Environment';
}

/** IR-011: handler pick-list label (e.g. `sun wong`). Override with `CSI_INCIDENT_HANDLER_DISPLAY_NAME`. */
export function csiIncidentHandlerDisplayName(): string {
  const n = process.env.CSI_INCIDENT_HANDLER_DISPLAY_NAME?.trim();
  if (n != null && n.length > 0) {
    return n;
  }
  return 'sun wong';
}

/**
 * IR-013: each CSI_TEST transition (detail picker) then reporter dashboard Status assertion.
 * `currentChipText` matches the visible status control (CAPS in UI); `nextPickerLabel` is the option label.
 */
export const CSI_INCIDENT_STATUS_TRANSITIONS_IR013 = [
  {
    currentChipText: 'OPEN',
    nextPickerLabel: 'Under Assesment',
    dashboardStatusContains: 'UNDER ASSESMENT',
  },
  {
    currentChipText: 'UNDER ASSESMENT',
    nextPickerLabel: 'Resolving Case',
    dashboardStatusContains: 'RESOLVING CASE',
  },
  {
    currentChipText: 'RESOLVING CASE',
    nextPickerLabel: 'Case Resolved',
    dashboardStatusContains: 'CASE RESOLVED',
  },
  {
    currentChipText: 'CASE RESOLVED',
    nextPickerLabel: 'Closed',
    dashboardStatusContains: 'CLOSED',
  },
] as const;
