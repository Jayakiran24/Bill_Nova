/** Plain constants and label helpers. Safe to import from client components. */

export const GST_RATES = [0, 500, 1800, 4000]; // basis points: 0%, 5%, 18%, 40%

export const UNITS = ['PCS', 'SET', 'NOS', 'KG', 'MTR', 'LTR', 'BOX', 'JOB'];

export const PAYMENT_MODES = ['cash', 'upi', 'bank', 'cheque', 'card'];

export function bpToPercentLabel(bp: number): string {
  const s = (bp / 100).toFixed(2).replace(/\.?0+$/, '');
  return `${s}%`;
}

export const VOUCHER_LABEL: Record<string, string> = {
  sales_invoice: 'Tax Invoice',
  estimate: 'Estimate / Quotation',
  sales_return: 'Credit Note',
  purchase_bill: 'Purchase Bill',
  purchase_return: 'Debit Note',
};
