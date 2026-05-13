/** Acknowledgement / review “due in” days (policy distribution step). */
export function csiPolicyDistributionDueInDays(): number {
  return 7;
}

/**
 * Shorter than `YYYYMMDDHHmmss` (14 digits): `YYMMDDHHmm` plus worker index when parallel runs
 * could create two policies in the same minute.
 */
export function csiPolicyUniqueSuffix(): string {
  const iso = new Date().toISOString();
  const stamp =
    iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10) + iso.slice(11, 13) + iso.slice(14, 16);
  const worker = (process.env.TEST_WORKER_INDEX ?? '0').replace(/\D/g, '') || '0';
  return `${stamp}${worker}`;
}

/** PM-026: replace the last whitespace-separated token (suffix) with `newSuffix`. */
export function replacePolicyTitleLastToken(fullTitle: string, newSuffix: string): string {
  const parts = fullTitle.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return newSuffix;
  }
  parts[parts.length - 1] = newSuffix;
  return parts.join(' ');
}
