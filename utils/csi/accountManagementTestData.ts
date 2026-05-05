const DEFAULT_FIRST_NAME = 'Test';

export function csiAccountManagementFirstName(): string {
  return DEFAULT_FIRST_NAME;
}

/** `Name_${timestamp}_${worker}` so parallel workers do not collide. */
export function csiAccountManagementLastName(): string {
  const worker = process.env.TEST_WORKER_INDEX ?? '0';
  return `Name_${Date.now()}_${worker}`;
}

/** Local part only (`firstName`+`lastName`, lowercased); app supplies the domain. */
export function csiAccountManagementEmailLocalPart(firstName: string, lastName: string): string {
  return `${firstName}${lastName}`.replace(/\s+/g, '').toLowerCase();
}
