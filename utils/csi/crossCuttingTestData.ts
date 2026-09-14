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
