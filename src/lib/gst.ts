/**
 * GST helpers.
 *
 * The one rule that decides whether an invoice is legal:
 *   supplier state === place of supply  ->  CGST + SGST
 *   supplier state !== place of supply  ->  IGST
 */

export const STATE_CODES: { code: string; name: string }[] = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

export function stateName(code: string | null | undefined): string {
  return STATE_CODES.find((s) => s.code === code)?.name ?? '';
}

/** True when the supply is inter-state, so IGST applies instead of CGST + SGST. */
export function isInterState(
  supplierStateCode: string | null | undefined,
  placeOfSupplyCode: string | null | undefined,
): boolean {
  if (!supplierStateCode || !placeOfSupplyCode) return false;
  return supplierStateCode !== placeOfSupplyCode;
}

/** A GSTIN's first two characters are the state code. */
export function stateCodeFromGstin(gstin: string | null | undefined): string | null {
  if (!gstin || gstin.length < 2) return null;
  const code = gstin.slice(0, 2);
  return STATE_CODES.some((s) => s.code === code) ? code : null;
}

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][Z][0-9A-Z]$/;

export function isValidGstinFormat(gstin: string): boolean {
  return GSTIN_RE.test(gstin.toUpperCase().trim());
}

/**
 * Print only as many HSN digits as the turnover band requires (4 up to ₹5 crore,
 * 6 above). Service codes are the exception: a SAC is reported at 6 digits, so a
 * code in chapter 99 never gets truncated below that.
 */
export function hsnForPrint(hsn: string | null | undefined, digits: number): string {
  if (!hsn) return '';
  const isSac = hsn.startsWith('99');
  return hsn.slice(0, isSac ? Math.max(6, digits || 4) : (digits || 4));
}

export const GST_RATES = [0, 500, 1800, 4000]; // basis points: 0%, 5%, 18%, 40%

export const UNITS = ['PCS', 'SET', 'NOS', 'KG', 'MTR', 'LTR', 'BOX', 'JOB'];

export const PAYMENT_MODES = ['cash', 'upi', 'bank', 'cheque', 'card'] as const;

/** Amount in words, Indian system, for the invoice footer. */
export function amountInWords(paise: number): string {
  const rupees = Math.floor(Math.abs(paise) / 100);
  const paisePart = Math.abs(paise) % 100;
  let out = `${numToWords(rupees)} Rupees`;
  if (paisePart > 0) out += ` and ${numToWords(paisePart)} Paise`;
  return `${out} Only`;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? ' ' + ONES[o] : '');
}

function numToWords(n: number): string {
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = Math.floor(n / 100);
  const rest = n % 100;

  if (crore) parts.push(`${numToWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(' ');
}
