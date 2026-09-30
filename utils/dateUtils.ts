export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Numeric UTC timestamp (`YYYYMMDDHHmmss`) for unique names. */
export function utcDateBasedNumber(): string {
  return new Date().toISOString().replace(/\D/g, '').slice(0, 14);
}
