/**
 * Money and quantity maths for Bill Nova.
 *
 * Rules, in order of importance:
 *  1. Money is INTEGER paise. Quantity is INTEGER thousandths. GST rate is INTEGER basis points.
 *  2. Never use a floating point number for a stored amount.
 *  3. Round once per line, once at the grand total. Never twice.
 */

/** Round half away from zero, the way an accountant does it. */
export function roundHalfUp(n: number): number {
  return n < 0 ? -Math.round(-n) : Math.round(n);
}

/** "1234.50" or 1234.5 -> 123450 paise */
export function toPaise(rupees: string | number): number {
  const s = String(rupees ?? '').trim().replace(/,/g, '');
  if (s === '') return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return roundHalfUp(n * 100);
}

/** 123450 paise -> "1234.50" */
export function toRupees(paise: number): string {
  const neg = paise < 0;
  const abs = Math.abs(Math.trunc(paise));
  const s = `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
  return neg ? `-${s}` : s;
}

/** 123450 paise -> "₹1,234.50" with Indian digit grouping. */
export function formatMoney(paise: number): string {
  const neg = paise < 0;
  const abs = Math.abs(Math.trunc(paise));
  const whole = String(Math.floor(abs / 100));
  const frac = String(abs % 100).padStart(2, '0');
  // Indian grouping: last 3 digits, then pairs.
  let grouped: string;
  if (whole.length <= 3) {
    grouped = whole;
  } else {
    const last3 = whole.slice(-3);
    const rest = whole.slice(0, -3);
    grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  }
  return `${neg ? '-' : ''}₹${grouped}.${frac}`;
}

/** "2.5" -> 2500 thousandths */
export function toQty(q: string | number): number {
  const s = String(q ?? '').trim();
  if (s === '') return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return roundHalfUp(n * 1000);
}

/** 2500 thousandths -> "2.5" (trailing zeros trimmed) */
export function fromQty(q: number): string {
  const s = (q / 1000).toFixed(3);
  return s.replace(/\.?0+$/, '');
}

/** 1800 basis points -> "18" */
export function bpToPercent(bp: number): string {
  const s = (bp / 100).toFixed(2);
  return s.replace(/\.?0+$/, '');
}

export function percentToBp(pct: string | number): number {
  const n = Number(String(pct ?? '').trim());
  if (!Number.isFinite(n)) return 0;
  return roundHalfUp(n * 100);
}

export interface LineInput {
  qty: number;          // thousandths
  rate: number;         // paise
  discountAmt: number;  // paise
  gstRateBp: number;
}

export interface LineComputed {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
}

/**
 * Compute one invoice line. Rounds exactly once, to paise.
 * CGST and SGST are split so that cgst + sgst === total tax, with no lost paisa.
 */
export function computeLine(line: LineInput, isIgst: boolean): LineComputed {
  const gross = roundHalfUp((line.qty * line.rate) / 1000);
  const taxableValue = gross - (line.discountAmt || 0);
  const tax = roundHalfUp((taxableValue * line.gstRateBp) / 10000);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (isIgst) {
    igst = tax;
  } else {
    cgst = roundHalfUp(tax / 2);
    sgst = tax - cgst; // the odd paisa lands on SGST, and the two always sum to tax
  }

  return { taxableValue, cgst, sgst, igst, lineTotal: taxableValue + tax };
}

export interface VoucherTotals {
  taxableValue: number;
  discountTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  grandTotal: number;
}

/** Sum the lines, then round the grand total to the nearest rupee exactly once. */
export function computeTotals(
  lines: (LineInput & LineComputed)[],
): VoucherTotals {
  let taxableValue = 0;
  let discountTotal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  for (const l of lines) {
    taxableValue += l.taxableValue;
    discountTotal += l.discountAmt || 0;
    cgst += l.cgst;
    sgst += l.sgst;
    igst += l.igst;
  }

  const beforeRounding = taxableValue + cgst + sgst + igst;
  const rounded = roundHalfUp(beforeRounding / 100) * 100;
  const roundOff = rounded - beforeRounding;

  return { taxableValue, discountTotal, cgst, sgst, igst, roundOff, grandTotal: rounded };
}

/** Indian financial year label for a date: 2026-09-21 -> "2026-27" (FY starts 1 April). */
export function financialYear(dateISO: string): string {
  const [y, m] = dateISO.split('-').map(Number);
  const startYear = m >= 4 ? y : y - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

export function todayISO(): string {
  // The invoice date is a calendar date in India, not a UTC timestamp.
  const now = new Date();
  const ist = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60000);
  return `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, '0')}-${String(ist.getDate()).padStart(2, '0')}`;
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
