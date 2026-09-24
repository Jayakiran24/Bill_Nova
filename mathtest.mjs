import { computeLine, computeTotals, toPaise, toQty, formatMoney, financialYear, toRupees } from './src/lib/money.ts';

let fail = 0;
const eq = (label, got, want) => {
  const ok = String(got) === String(want);
  if (!ok) { fail++; console.log(`FAIL ${label}: got ${got}, want ${want}`); }
  else console.log(`ok   ${label}: ${got}`);
};

// 1. paise conversion, no float drift
eq('toPaise 1234.50', toPaise('1234.50'), 123450);
eq('toPaise 0.1+0.2 case', toPaise('0.30'), 30);
eq('toRupees round trip', toRupees(123450), '1234.50');

// 2. Indian formatting
eq('format 12345678900', formatMoney(12345678900), '₹12,34,56,789.00');
eq('format small', formatMoney(45000), '₹450.00');

// 3. one line, 18% intra-state: 1 x 85000.00
const l1 = { qty: toQty('1'), rate: toPaise('85000'), discountAmt: 0, gstRateBp: 1800 };
const c1 = computeLine(l1, false);
eq('taxable', c1.taxableValue, 8500000);
eq('cgst 9%', c1.cgst, 765000);
eq('sgst 9%', c1.sgst, 765000);
eq('cgst+sgst = 18%', c1.cgst + c1.sgst, 1530000);
eq('line total', c1.lineTotal, 10030000);

// 4. odd-paisa split must never lose a paisa
const odd = { qty: toQty('1'), rate: toPaise('100.05'), discountAmt: 0, gstRateBp: 1800 };
const co = computeLine(odd, false);
const tax = Math.round(10005 * 1800 / 10000);
eq('odd split sums to tax', co.cgst + co.sgst, tax);

// 5. IGST path
const ci = computeLine(l1, true);
eq('igst full 18%', ci.igst, 1530000);
eq('igst has no cgst', ci.cgst, 0);

// 6. rounding happens exactly once at the total
const lines = [
  { qty: toQty('3'), rate: toPaise('1234.57'), discountAmt: 0, gstRateBp: 1800 },
  { qty: toQty('2'), rate: toPaise('99.99'),   discountAmt: 0, gstRateBp: 500  },
  { qty: toQty('1'), rate: toPaise('4500'),    discountAmt: toPaise('250'), gstRateBp: 1800 },
];
const comp = lines.map(l => ({ ...l, ...computeLine(l, false) }));
const t = computeTotals(comp);
const sumLines = comp.reduce((a,c)=>a+c.lineTotal,0);
eq('grand = sum of lines + roundoff', t.grandTotal, sumLines + t.roundOff);
eq('grand is whole rupees', t.grandTotal % 100, 0);
eq('roundoff within 50p', Math.abs(t.roundOff) <= 50, 'true');
eq('taxable+tax+roundoff = grand', t.taxableValue + t.cgst + t.sgst + t.igst + t.roundOff, t.grandTotal);

// 7. financial year boundaries
eq('FY Sep 2026', financialYear('2026-09-21'), '2026-27');
eq('FY Mar 2027', financialYear('2027-03-31'), '2026-27');
eq('FY Apr 2027', financialYear('2027-04-01'), '2027-28');

// 8. discount reduces taxable before tax
const d = computeLine({ qty: toQty('1'), rate: toPaise('1000'), discountAmt: toPaise('100'), gstRateBp: 1800 }, false);
eq('discounted taxable', d.taxableValue, 90000);
eq('tax on discounted value', d.cgst + d.sgst, 16200);

console.log(fail === 0 ? '\nALL MATH TESTS PASSED' : `\n${fail} FAILURES`);
process.exit(fail ? 1 : 0);
