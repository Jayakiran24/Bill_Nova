import { NextRequest } from 'next/server';
import { currentUser } from '@/lib/auth';
import { saleRegister, gstSummary, outstandingReport, stockReport } from '@/lib/queries';
import { toRupees, fromQty, todayISO } from '@/lib/money';
import { bpToPercentLabel } from '@/lib/labels';

export const dynamic = 'force-dynamic';

function csv(rows: (string | number)[][]): string {
  return rows
    .map((r) => r.map((c) => {
      const s = String(c ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','))
    .join('\n');
}

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return new Response('Not signed in', { status: 401 });

  const sp = req.nextUrl.searchParams;
  const r = sp.get('r') || 'sales';
  const today = todayISO();
  const from = sp.get('from') || today.slice(0, 8) + '01';
  const to = sp.get('to') || today;

  let rows: (string | number)[][] = [];
  let name = 'report';

  if (r === 'sales') {
    name = `sale-register-${from}-to-${to}`;
    rows = [['Invoice No', 'Date', 'Party', 'GSTIN', 'Place of supply', 'Taxable', 'CGST', 'SGST', 'IGST', 'Round off', 'Total', 'Status']];
    for (const v of saleRegister(user.business_id, from, to)) {
      rows.push([v.number, v.date, v.party_name || '', v.party_gstin || '', v.place_of_supply_code || '',
        toRupees(v.taxable_value), toRupees(v.cgst), toRupees(v.sgst), toRupees(v.igst),
        toRupees(v.round_off), toRupees(v.grand_total), v.status]);
    }
  } else if (r === 'gst') {
    name = `gst-summary-${from}-to-${to}`;
    rows = [['HSN/SAC', 'Rate', 'Quantity', 'Taxable value', 'CGST', 'SGST', 'IGST']];
    for (const g of gstSummary(user.business_id, from, to)) {
      rows.push([g.hsn_sac, bpToPercentLabel(g.gst_rate_bp), fromQty(g.qty),
        toRupees(g.taxable_value), toRupees(g.cgst), toRupees(g.sgst), toRupees(g.igst)]);
    }
  } else if (r === 'outstanding') {
    name = `outstanding-${today}`;
    rows = [['Party', 'Balance', 'Direction']];
    for (const p of outstandingReport(user.business_id)) {
      rows.push([p.name, toRupees(Math.abs(p.balance)), p.balance > 0 ? 'they owe us' : 'we owe them']);
    }
  } else if (r === 'stock') {
    name = `stock-${today}`;
    rows = [['Item', 'HSN', 'Unit', 'On hand', 'Cost price', 'Sale price', 'Stock value at cost']];
    for (const i of stockReport(user.business_id)) {
      rows.push([i.name, i.hsn_sac, i.unit, fromQty(i.stock), toRupees(i.purchase_price),
        toRupees(i.sale_price), toRupees(Math.round((i.stock * i.purchase_price) / 1000))]);
    }
  }

  // The BOM makes Excel open ₹ and Indian names correctly.
  return new Response('﻿' + csv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}.csv"`,
    },
  });
}
