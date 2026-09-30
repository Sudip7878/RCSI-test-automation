import { expect } from '@playwright/test';

export type SalesOrderReviewPricing = Readonly<{
  lineItemTotals: number[];
  subtotal: number;
  tax: number;
  grandTotal: number;
}>;

/** Parse displayed HK$ amounts (e.g. `HK$3,850,000.00`). */
export function parseHongKongCurrencyAmount(raw: string): number {
  const normalized = raw.replace(/HK\$/gi, '').replace(/,/g, '').trim();
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) {
    throw new Error(`Cannot parse HK currency amount from: ${raw}`);
  }
  return value;
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** SB-052: line-item sum must match subtotal; subtotal + tax must match grand total. */
export function assertSb052SalesOrderReviewPricing(pricing: SalesOrderReviewPricing): void {
  const { lineItemTotals, subtotal, tax, grandTotal } = pricing;
  expect(lineItemTotals.length).toBeGreaterThan(0);

  let lineSum = 0;
  for (const lineTotal of lineItemTotals) {
    lineSum += lineTotal;
  }

  const lineSumCents = toCents(lineSum);
  const subtotalCents = toCents(subtotal);
  const taxCents = toCents(tax);
  const grandTotalCents = toCents(grandTotal);

  expect(lineSumCents, 'sum of Module Details row totals vs Subtotal').toBe(subtotalCents);
  expect(
    subtotalCents + taxCents,
    'Subtotal + Tax vs Grand Total',
  ).toBe(grandTotalCents);
}
