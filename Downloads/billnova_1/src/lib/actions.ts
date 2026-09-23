'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { all, get, run, tx, nextNumber, audit, verifyPassword, hashPassword } from './db';
import { createSession, destroySession, requireUser, currentUser } from './auth';
import { computeLine, computeTotals, financialYear, toPaise, toQty, todayISO } from './money';
import { isInterState } from './gst';
import { getBusiness } from './queries';
import { validateStockAvailability } from './stock';

export interface LineInputDTO {
  itemId?: number | null;
  description: string;
  sku?: string;
  hsn: string;
  unit: string;
  qty: string;
  rate: string;
  discount: string;
  gstBp: number;
}

export interface SaveVoucherInput {
  type: 'sales_invoice' | 'estimate' | 'purchase_bill';
  date: string;
  partyId: number;
  placeOfSupplyCode?: string;
  notes?: string;
  transporter?: string;
  vehicleNo?: string;
  lines: LineInputDTO[];
  paymentNow?: string;
  paymentMode?: string;
}

const PREFIX: Record<string, string> = {
  sales_invoice: 'INV/',
  estimate: 'EST/',
  purchase_bill: 'PUR/',
  sales_return: 'CRN/',
  purchase_return: 'DRN/',
};

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export async function loginAction(_prev: unknown, formData: FormData) {
  const phone = String(formData.get('phone') || '').trim();
  const password = String(formData.get('password') || '');
  if (!phone || !password) return { error: 'Enter phone number and password.' };

  const user = get<{ id: number; password_hash: string; is_active: number }>(
    'SELECT id, password_hash, is_active FROM app_user WHERE phone = ?',
    phone,
  );
  if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) {
    return { error: 'Wrong phone number or password.' };
  }
  await createSession(user.id);
  redirect('/');
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}

/* ------------------------------------------------------------------ */
/* Vouchers                                                            */
/* ------------------------------------------------------------------ */

export async function saveVoucher(input: SaveVoucherInput) {
  const user = await currentUser();
  if (!user) return { ok: false as const, error: 'Session expired. Please log in again.' };

  const business = getBusiness(user.business_id);

  const party = get<{ id: number; name: string; gstin: string | null; billing_address: string | null; state_code: string | null }>(
    'SELECT id, name, gstin, billing_address, state_code FROM party WHERE id = ? AND business_id = ?',
    input.partyId, user.business_id,
  );
  if (!party) return { ok: false as const, error: 'Select a customer or supplier.' };

  const lines = (input.lines || []).filter((l) => l.description?.trim() && toQty(l.qty) > 0);
  if (lines.length === 0) return { ok: false as const, error: 'Add at least one item with a quantity.' };

  const pos = input.placeOfSupplyCode || party.state_code || business.state_code;
  // A purchase is taxed on the supplier's state vs ours, the same comparison either way.
  const igst = isInterState(business.state_code, pos);
  const date = input.date || todayISO();
  const fy = financialYear(date);

  if (input.type === 'sales_invoice') {
    for (const l of lines) {
      if (!l.itemId) continue;
      const item = get<{ id: number; name: string; is_service: number; stock: number; unit: string }>(
        `SELECT i.id, i.name, i.is_service, i.unit, COALESCE(s.qty, 0) AS stock
           FROM item i LEFT JOIN stock_on_hand s ON s.item_id = i.id
          WHERE i.id = ? AND i.business_id = ?`,
        l.itemId, user.business_id,
      );
      if (!item || item.is_service) continue;
      const requested = toQty(l.qty) / 1000;
      const result = validateStockAvailability({ available: item.stock / 1000, requested });
      if (!result.ok) {
        return { ok: false as const, error: `${item.name}: ${result.message}` };
      }
    }
  }

  const computed = lines.map((l) => {
    const base = {
      qty: toQty(l.qty),
      rate: toPaise(l.rate),
      discountAmt: toPaise(l.discount || '0'),
      gstRateBp: Number(l.gstBp) || 0,
    };
    return { ...base, ...computeLine(base, igst), src: l };
  });

  const totals = computeTotals(computed);

  try {
    const result = tx(() => {
      const number = nextNumber(user.business_id, input.type, fy, PREFIX[input.type] + fy.slice(2) + '/');

      run(
        `INSERT INTO voucher (business_id, type, number, financial_year, date, party_id, party_name,
           party_gstin, party_address, place_of_supply_code, is_igst, taxable_value, discount_total,
           cgst, sgst, igst, round_off, grand_total, status, notes, transporter, vehicle_no, created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        user.business_id, input.type, number, fy, date, party.id, party.name,
        party.gstin, party.billing_address, pos, igst ? 1 : 0,
        totals.taxableValue, totals.discountTotal, totals.cgst, totals.sgst, totals.igst,
        totals.roundOff, totals.grandTotal,
        input.type === 'estimate' ? 'draft' : 'final',
        input.notes || null, input.transporter || null, input.vehicleNo || null, user.id,
      );

      const voucherId = Number(get<{ id: number }>('SELECT last_insert_rowid() AS id')!.id);

      let lineNo = 0;
      for (const c of computed) {
        lineNo += 1;
        run(
          `INSERT INTO voucher_line (voucher_id, line_no, item_id, description, sku, hsn_sac, unit, qty, rate,
             discount_amt, taxable_value, gst_rate_bp, cgst, sgst, igst, line_total)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          voucherId, lineNo, c.src.itemId || null, c.src.description.trim(),
          c.src.sku || null, c.src.hsn || null,
          c.src.unit || 'PCS', c.qty, c.rate, c.discountAmt, c.taxableValue, c.gstRateBp,
          c.cgst, c.sgst, c.igst, c.lineTotal,
        );
      }

      // An estimate is not a transaction: no ledger, no stock movement.
      if (input.type !== 'estimate') {
        const isSale = input.type === 'sales_invoice';

        run(
          `INSERT INTO party_ledger (business_id, party_id, date, source_type, source_id, narration, debit, credit)
           VALUES (?,?,?,?,?,?,?,?)`,
          user.business_id, party.id, date, input.type, voucherId,
          `${isSale ? 'Invoice' : 'Purchase'} ${number}`,
          isSale ? totals.grandTotal : 0,
          isSale ? 0 : totals.grandTotal,
        );

        for (const c of computed) {
          if (!c.src.itemId) continue;
          const item = get<{ is_service: number }>('SELECT is_service FROM item WHERE id = ?', c.src.itemId);
          if (item?.is_service) continue;
          run(
            `INSERT INTO stock_ledger (business_id, item_id, date, source_type, source_id, narration, qty_in, qty_out, rate)
             VALUES (?,?,?,?,?,?,?,?,?)`,
            user.business_id, c.src.itemId, date, input.type, voucherId,
            `${isSale ? 'Sold on' : 'Purchased on'} ${number}`,
            isSale ? 0 : c.qty,
            isSale ? c.qty : 0,
            c.rate,
          );
        }

        // Money handed over at the counter, recorded and allocated in the same breath.
        const paidNow = toPaise(input.paymentNow || '0');
        if (paidNow > 0) {
          const payNo = nextNumber(user.business_id, isSale ? 'receipt' : 'payment', fy, (isSale ? 'RCP/' : 'PAY/') + fy.slice(2) + '/');
          run(
            `INSERT INTO payment (business_id, type, number, date, party_id, party_name, mode, amount, reference, created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?)`,
            user.business_id, isSale ? 'in' : 'out', payNo, date, party.id, party.name,
            input.paymentMode || 'cash', paidNow, `Against ${number}`, user.id,
          );
          const paymentId = Number(get<{ id: number }>('SELECT last_insert_rowid() AS id')!.id);
          run('INSERT INTO payment_allocation (payment_id, voucher_id, amount) VALUES (?,?,?)',
            paymentId, voucherId, Math.min(paidNow, totals.grandTotal));
          run(
            `INSERT INTO party_ledger (business_id, party_id, date, source_type, source_id, narration, debit, credit)
             VALUES (?,?,?,?,?,?,?,?)`,
            user.business_id, party.id, date, isSale ? 'receipt' : 'payment', paymentId,
            `${isSale ? 'Received' : 'Paid'} ${payNo}`,
            isSale ? 0 : paidNow,
            isSale ? paidNow : 0,
          );
        }
      }

      audit(user.business_id, user.id, 'create', 'voucher', voucherId, null, { number, total: totals.grandTotal });
      return { id: voucherId, number };
    });

    revalidatePath('/');
    revalidatePath('/invoices');
    revalidatePath('/parties');
    revalidatePath('/items');
    return { ok: true as const, ...result };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Could not save.' };
  }
}

export async function cancelVoucher(voucherId: number, reason: string) {
  const user = await requireUser();
  if (user.role !== 'owner') return { ok: false as const, error: 'Only the owner can cancel a bill.' };

  try {
    tx(() => {
      const v = get<{ id: number; number: string; type: string; status: string; party_id: number; grand_total: number; date: string }>(
        'SELECT * FROM voucher WHERE id = ? AND business_id = ?', voucherId, user.business_id,
      );
      if (!v) throw new Error('Bill not found.');
      if (v.status === 'cancelled') throw new Error('Already cancelled.');

      run("UPDATE voucher SET status = 'cancelled', cancel_reason = ? WHERE id = ?", reason || null, voucherId);

      // The number keeps its place in the sequence. We reverse with new rows;
      // we never delete the originals.
      const isSale = v.type === 'sales_invoice';
      if (v.type !== 'estimate') {
        run(
          `INSERT INTO party_ledger (business_id, party_id, date, source_type, source_id, narration, debit, credit)
           VALUES (?,?,?,?,?,?,?,?)`,
          user.business_id, v.party_id, todayISO(), v.type + '_cancel', voucherId,
          `Cancelled ${v.number}`,
          isSale ? 0 : v.grand_total,
          isSale ? v.grand_total : 0,
        );

        const lines = all<{ item_id: number | null; qty: number; rate: number }>(
          'SELECT item_id, qty, rate FROM voucher_line WHERE voucher_id = ?', voucherId,
        );
        for (const l of lines) {
          if (!l.item_id) continue;
          const item = get<{ is_service: number }>('SELECT is_service FROM item WHERE id = ?', l.item_id);
          if (item?.is_service) continue;
          run(
            `INSERT INTO stock_ledger (business_id, item_id, date, source_type, source_id, narration, qty_in, qty_out, rate)
             VALUES (?,?,?,?,?,?,?,?,?)`,
            user.business_id, l.item_id, todayISO(), v.type + '_cancel', voucherId,
            `Reversal of ${v.number}`,
            isSale ? l.qty : 0,
            isSale ? 0 : l.qty,
            l.rate,
          );
        }
      }
      audit(user.business_id, user.id, 'cancel', 'voucher', voucherId, { status: v.status }, { status: 'cancelled', reason });
    });
    revalidatePath('/invoices');
    revalidatePath('/');
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Could not cancel.' };
  }
}

/* ------------------------------------------------------------------ */
/* Parties, items, payments, settings                                  */
/* ------------------------------------------------------------------ */

export async function saveParty(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get('id') || 0);
  const f = (k: string) => String(formData.get(k) || '').trim();

  const name = f('name');
  if (!name) return { ok: false as const, error: 'Name is required.' };

  const fields = [
    name, f('type') || 'customer', f('phone'), f('email'), f('gstin').toUpperCase(),
    f('billing_address'), f('shipping_address'), f('state_code'),
  ];

  if (id) {
    run(
      `UPDATE party SET name=?, type=?, phone=?, email=?, gstin=?, billing_address=?,
         shipping_address=?, state_code=? WHERE id=? AND business_id=?`,
      ...fields, id, user.business_id,
    );
    audit(user.business_id, user.id, 'update', 'party', id, null, { name });
  } else {
    run(
      `INSERT INTO party (business_id, name, type, phone, email, gstin, billing_address,
         shipping_address, state_code, opening_balance)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      user.business_id, ...fields, toPaise(f('opening_balance') || '0'),
    );
    const newId = Number(get<{ id: number }>('SELECT last_insert_rowid() AS id')!.id);
    const ob = toPaise(f('opening_balance') || '0');
    if (ob !== 0) {
      run(
        `INSERT INTO party_ledger (business_id, party_id, date, source_type, source_id, narration, debit, credit)
         VALUES (?,?,?,?,?,?,0,0)`,
        user.business_id, newId, todayISO(), 'opening', newId, 'Opening balance',
      );
    }
    audit(user.business_id, user.id, 'create', 'party', newId, null, { name });
  }
  revalidatePath('/parties');
  return { ok: true as const };
}

/** Used by the invoice screen so a new customer never interrupts a bill. */
export async function quickAddParty(name: string, phone: string, stateCode: string) {
  const user = await requireUser();
  if (!name.trim()) return { ok: false as const, error: 'Name is required.' };
  run(
    'INSERT INTO party (business_id, name, type, phone, state_code) VALUES (?,?,?,?,?)',
    user.business_id, name.trim(), 'customer', phone.trim() || null, stateCode || null,
  );
  const id = Number(get<{ id: number }>('SELECT last_insert_rowid() AS id')!.id);
  revalidatePath('/parties');
  return { ok: true as const, id, name: name.trim() };
}

export async function saveItem(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get('id') || 0);
  const f = (k: string) => String(formData.get(k) || '').trim();

  const name = f('name');
  if (!name) return { ok: false as const, error: 'Name is required.' };

  const isService = f('is_service') === 'on' || f('is_service') === '1' ? 1 : 0;
  const vals = [
    name, f('sku'), f('brand'), f('category'), f('hsn_sac'), f('unit') || 'PCS',
    toPaise(f('sale_price') || '0'), toPaise(f('purchase_price') || '0'),
    toPaise(f('mrp') || '0'), toPaise(f('dealer_price') || '0'),
    Number(f('gst_rate_bp') || 1800), isService,
    toQty(f('low_stock_level') || '0'),
  ];

  try {
    if (id) {
      run(
        `UPDATE item SET name=?, sku=?, brand=?, category=?, hsn_sac=?, unit=?,
           sale_price=?, purchase_price=?, mrp=?, dealer_price=?,
           gst_rate_bp=?, is_service=?, low_stock_level=? WHERE id=? AND business_id=?`,
        ...vals, id, user.business_id,
      );
      audit(user.business_id, user.id, 'update', 'item', id, null, { name });
    } else {
      run(
        `INSERT INTO item (business_id, name, sku, brand, category, hsn_sac, unit,
           sale_price, purchase_price, mrp, dealer_price,
           gst_rate_bp, is_service, low_stock_level, opening_stock)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        user.business_id, ...vals, toQty(f('opening_stock') || '0'),
      );
      audit(user.business_id, user.id, 'create', 'item', null, null, { name });
    }
  } catch {
    return { ok: false as const, error: `An item with model code "${f('sku')}" already exists for brand "${f('brand')}".` };
  }
  revalidatePath('/items');
  return { ok: true as const };
}

/* ------------------------------------------------------------------ */
/* Price-list import                                                   */
/* ------------------------------------------------------------------ */

/** Split one CSV line, honouring quoted fields that contain commas. */
function csvSplit(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** Map many spellings of a column heading onto one field name. */
const HEADER_ALIASES: Record<string, string> = {
  sku: 'sku', model: 'sku', 'model code': 'sku', code: 'sku', 'model no': 'sku',
  name: 'name', description: 'name', product: 'name', 'product name': 'name', item: 'name',
  brand: 'brand', company: 'brand', make: 'brand', manufacturer: 'brand',
  category: 'category', type: 'category', range: 'category', group: 'category',
  hsn: 'hsn_sac', 'hsn code': 'hsn_sac', sac: 'hsn_sac', hsn_sac: 'hsn_sac', 'hsn/sac': 'hsn_sac',
  unit: 'unit', uom: 'unit',
  gst: 'gst', 'gst rate': 'gst', 'gst%': 'gst', tax: 'gst', 'tax rate': 'gst',
  mrp: 'mrp', 'list price': 'mrp', 'retail price': 'mrp',
  dp: 'dealer_price', 'dealer price': 'dealer_price', 'dealer_price': 'dealer_price',
  cost: 'dealer_price', 'purchase price': 'dealer_price', 'cost price': 'dealer_price',
  'dp including gst': 'dealer_price',
  'sale price': 'sale_price', 'selling price': 'sale_price', 'sale_price': 'sale_price',
  'opening stock': 'opening_stock', stock: 'opening_stock', qty: 'opening_stock',
  'low stock': 'low_stock_level', 'low stock level': 'low_stock_level', reorder: 'low_stock_level',
  service: 'is_service', 'is service': 'is_service',
};

export interface ImportRowResult {
  line: number; sku: string; name: string; action: 'create' | 'update' | 'error'; message?: string;
}

export async function importItems(input: {
  csv: string;
  pricesIncludeGst: boolean;
  defaultBrand: string;
  dryRun: boolean;
}) {
  const user = await currentUser();
  if (!user) return { ok: false as const, error: 'Session expired. Please log in again.' };
  if (user.role !== 'owner') return { ok: false as const, error: 'Only the owner can import a price list.' };

  const lines = input.csv.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) {
    return { ok: false as const, error: 'Need a heading row and at least one item row.' };
  }

  const rawHeaders = csvSplit(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ' ').trim());
  const headers = rawHeaders.map((h) => HEADER_ALIASES[h] || h);
  if (!headers.includes('sku') && !headers.includes('name')) {
    return {
      ok: false as const,
      error: `Could not find a model or name column. Headings read: ${rawHeaders.join(', ')}`,
    };
  }

  const results: ImportRowResult[] = [];
  let created = 0;
  let updated = 0;

  const apply = () => {
    for (let i = 1; i < lines.length; i++) {
      const cells = csvSplit(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = cells[idx] ?? ''; });

      const sku = (row.sku || '').trim();
      const name = (row.name || '').trim() || sku;
      const brand = (row.brand || input.defaultBrand || '').trim();

      if (!sku && !name) {
        results.push({ line: i + 1, sku, name, action: 'error', message: 'No model code and no name.' });
        continue;
      }

      const gstPct = Number(row.gst || '18');
      const gstBp = Number.isFinite(gstPct) && gstPct >= 0 ? Math.round(gstPct * 100) : 1800;
      const factor = 1 + gstBp / 10000;

      const mrpIn = toPaise(row.mrp || '0');
      const dpIn = toPaise(row.dealer_price || '0');
      const saleIn = toPaise(row.sale_price || '0');

      let salePrice: number;
      let purchasePrice: number;
      let mrp: number;
      let dealerPrice: number;

      if (input.pricesIncludeGst) {
        mrp = mrpIn;
        dealerPrice = dpIn;
        salePrice = saleIn > 0 ? saleIn : Math.round(mrpIn / factor);
        purchasePrice = Math.round(dpIn / factor);
      } else {
        salePrice = saleIn > 0 ? saleIn : mrpIn;
        purchasePrice = dpIn;
        mrp = Math.round(salePrice * factor);
        dealerPrice = Math.round(purchasePrice * factor);
      }

      const isService = /^(1|y|yes|true|service)$/i.test(row.is_service || '') ? 1 : 0;
      const unit = (row.unit || 'PCS').toUpperCase();
      const hsn = (row.hsn_sac || '').replace(/\s/g, '');
      const category = (row.category || '').trim();

      const existing = sku
        ? get<{ id: number }>(
            'SELECT id FROM item WHERE business_id = ? AND IFNULL(brand,\'\') = ? AND sku = ?',
            user.business_id, brand, sku)
        : undefined;

      if (input.dryRun) {
        results.push({ line: i + 1, sku, name, action: existing ? 'update' : 'create' });
        existing ? updated++ : created++;
        continue;
      }

      try {
        if (existing) {
          run(
            `UPDATE item SET name=?, brand=?, category=?, hsn_sac=?, unit=?,
               sale_price=?, purchase_price=?, mrp=?, dealer_price=?, gst_rate_bp=?, is_service=?
             WHERE id=?`,
            name, brand || null, category || null, hsn || null, unit,
            salePrice, purchasePrice, mrp, dealerPrice, gstBp, isService, existing.id,
          );
          updated++;
          results.push({ line: i + 1, sku, name, action: 'update' });
        } else {
          run(
            `INSERT INTO item (business_id, name, sku, brand, category, hsn_sac, unit,
               sale_price, purchase_price, mrp, dealer_price, gst_rate_bp, is_service,
               opening_stock, low_stock_level)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            user.business_id, name, sku || null, brand || null, category || null, hsn || null, unit,
            salePrice, purchasePrice, mrp, dealerPrice, gstBp, isService,
            toQty(row.opening_stock || '0'), toQty(row.low_stock_level || '0'),
          );
          created++;
          results.push({ line: i + 1, sku, name, action: 'create' });
        }
      } catch (e) {
        results.push({
          line: i + 1, sku, name, action: 'error',
          message: e instanceof Error ? e.message : 'Could not save this row.',
        });
      }
    }
  };

  try {
    if (input.dryRun) apply();
    else tx(apply);
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Import failed; nothing was changed.' };
  }

  if (!input.dryRun) {
    audit(user.business_id, user.id, 'import', 'item', null, null, { created, updated });
    revalidatePath('/items');
  }
  return { ok: true as const, created, updated, results };
}

export async function adjustStock(formData: FormData) {
  const user = await requireUser();
  const itemId = Number(formData.get('item_id') || 0);
  const deltaQty = Number(formData.get('delta_qty') || 0);
  const direction = String(formData.get('direction') || 'add').trim();
  const reason = String(formData.get('reason') || '').trim();

  const qty = Number.isFinite(deltaQty) && deltaQty > 0 ? deltaQty : 0;
  if (!itemId || qty <= 0) {
    return { ok: false as const, error: 'Enter a quantity to add or remove.' };
  }

  const item = get<{ id: number; name: string; is_service: number; stock: number }>(
    `SELECT i.id, i.name, i.is_service, COALESCE(s.qty, 0) AS stock
       FROM item i LEFT JOIN stock_on_hand s ON s.item_id = i.id
      WHERE i.id = ? AND i.business_id = ?`,
    itemId, user.business_id,
  );
  if (!item) return { ok: false as const, error: 'Item not found.' };
  if (item.is_service) return { ok: false as const, error: 'Services do not use stock.' };

  const signedQty = direction === 'remove' ? -qty : qty;
  const newStock = item.stock + toQty(String(signedQty));
  if (newStock < 0) {
    return { ok: false as const, error: 'You cannot reduce stock below zero.' };
  }

  try {
    tx(() => {
      run(
        `INSERT INTO stock_ledger (business_id, item_id, date, source_type, source_id, narration, qty_in, qty_out, rate)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        user.business_id, itemId, todayISO(), 'manual_adjust', itemId,
        reason || `Stock adjustment for ${item.name}`,
        signedQty > 0 ? toQty(String(signedQty)) : 0,
        signedQty < 0 ? Math.abs(toQty(String(signedQty))) : 0,
        0,
      );
    });
    revalidatePath('/items');
    revalidatePath('/');
    return { ok: true as const, newStock };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Could not adjust stock.' };
  }
}

export async function savePayment(formData: FormData) {
  const user = await requireUser();
  const f = (k: string) => String(formData.get(k) || '').trim();

  const partyId = Number(f('party_id') || 0);
  const amount = toPaise(f('amount') || '0');
  const type = f('type') === 'out' ? 'out' : 'in';
  const date = f('date') || todayISO();

  if (!partyId) return { ok: false as const, error: 'Select a party.' };
  if (amount <= 0) return { ok: false as const, error: 'Enter an amount.' };

  const party = get<{ id: number; name: string }>('SELECT id, name FROM party WHERE id = ? AND business_id = ?', partyId, user.business_id);
  if (!party) return { ok: false as const, error: 'Party not found.' };

  try {
    tx(() => {
      const fy = financialYear(date);
      const number = nextNumber(user.business_id, type === 'in' ? 'receipt' : 'payment', fy,
        (type === 'in' ? 'RCP/' : 'PAY/') + fy.slice(2) + '/');

      run(
        `INSERT INTO payment (business_id, type, number, date, party_id, party_name, mode, amount, reference, notes, created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        user.business_id, type, number, date, party.id, party.name,
        f('mode') || 'cash', amount, f('reference') || null, f('notes') || null, user.id,
      );
      const paymentId = Number(get<{ id: number }>('SELECT last_insert_rowid() AS id')!.id);

      // Settle the oldest open bills first, which is what a shop actually does.
      let left = amount;
      const open = all<{ id: number; due: number }>(
        `SELECT * FROM (
           SELECT v.id, v.grand_total - COALESCE((SELECT SUM(a.amount) FROM payment_allocation a
               JOIN payment p ON p.id = a.payment_id WHERE a.voucher_id = v.id AND p.status='final'),0) AS due
             FROM voucher v
            WHERE v.party_id = ? AND v.status = 'final'
              AND v.type = ?
         ) WHERE due > 0 ORDER BY id`,
        party.id, type === 'in' ? 'sales_invoice' : 'purchase_bill',
      );
      for (const bill of open) {
        if (left <= 0) break;
        const alloc = Math.min(left, bill.due);
        run('INSERT INTO payment_allocation (payment_id, voucher_id, amount) VALUES (?,?,?)', paymentId, bill.id, alloc);
        left -= alloc;
      }

      run(
        `INSERT INTO party_ledger (business_id, party_id, date, source_type, source_id, narration, debit, credit)
         VALUES (?,?,?,?,?,?,?,?)`,
        user.business_id, party.id, date, type === 'in' ? 'receipt' : 'payment', paymentId,
        `${type === 'in' ? 'Received' : 'Paid'} ${number} by ${f('mode') || 'cash'}`,
        type === 'in' ? 0 : amount,
        type === 'in' ? amount : 0,
      );
      audit(user.business_id, user.id, 'create', 'payment', paymentId, null, { number, amount });
    });
    revalidatePath('/payments');
    revalidatePath('/parties');
    revalidatePath('/');
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Could not save payment.' };
  }
}

export async function saveBusiness(formData: FormData) {
  const user = await requireUser();
  if (user.role !== 'owner') return { ok: false as const, error: 'Only the owner can change settings.' };
  const f = (k: string) => String(formData.get(k) || '').trim();

  run(
    `UPDATE business SET name=?, legal_name=?, gstin=?, address_line1=?, address_line2=?, city=?,
       pincode=?, state_code=?, phone=?, email=?, bank_name=?, bank_account=?, bank_ifsc=?,
       upi_id=?, terms=?, hsn_digits=?, is_composition=? WHERE id=?`,
    f('name'), f('legal_name'), f('gstin').toUpperCase(), f('address_line1'), f('address_line2'),
    f('city'), f('pincode'), f('state_code'), f('phone'), f('email'), f('bank_name'),
    f('bank_account'), f('bank_ifsc').toUpperCase(), f('upi_id'), f('terms'),
    Number(f('hsn_digits') || 4), f('is_composition') === 'on' ? 1 : 0, user.business_id,
  );
  audit(user.business_id, user.id, 'update', 'business', user.business_id, null, { name: f('name') });
  revalidatePath('/settings');
  return { ok: true as const };
}

export async function saveNumberSeries(formData: FormData) {
  const user = await requireUser();
  if (user.role !== 'owner') return { ok: false as const, error: 'Only the owner can change settings.' };
  const id = Number(formData.get('id'));
  const prefix = String(formData.get('prefix') || '').trim();
  const last = Number(formData.get('last_number') || 0);
  run('UPDATE number_series SET prefix = ?, last_number = ? WHERE id = ? AND business_id = ?',
    prefix, last, id, user.business_id);
  revalidatePath('/settings');
  return { ok: true as const };
}

/* ------------------------------------------------------------------ */
/* Form wrappers                                                       */
/*                                                                     */
/* A <form action={...}> must resolve to void, so these thin wrappers  */
/* run the real action and then redirect back with a message. Each     */
/* form carries a hidden _back field saying where to return to.        */
/* ------------------------------------------------------------------ */

function backTo(formData: FormData, fallback: string) {
  return String(formData.get('_back') || fallback);
}

function finish(back: string, res: { ok: boolean; error?: string }, okMsg: string): never {
  redirect(res.ok ? `${back}?ok=${encodeURIComponent(okMsg)}` : `${back}?err=${encodeURIComponent(res.error || 'Could not save.')}`);
}

export async function savePartyForm(formData: FormData): Promise<void> {
  const back = backTo(formData, '/parties');
  const res = await saveParty(formData);
  finish(back, res, 'Party saved.');
}

export async function adjustStockForm(formData: FormData): Promise<void> {
  const back = backTo(formData, '/items');
  const res = await adjustStock(formData);
  finish(back, res.ok ? { ok: true, error: undefined } : { ok: false, error: res.error }, res.ok ? 'Stock updated.' : res.error || 'Stock update failed.');
}

export async function saveItemForm(formData: FormData): Promise<void> {
  const back = backTo(formData, '/items');
  const res = await saveItem(formData);
  finish(back, res, 'Item saved.');
}

export async function savePaymentForm(formData: FormData): Promise<void> {
  const back = backTo(formData, '/payments');
  const res = await savePayment(formData);
  finish(back, res, 'Payment recorded.');
}

export async function saveBusinessForm(formData: FormData): Promise<void> {
  const back = backTo(formData, '/settings');
  const res = await saveBusiness(formData);
  finish(back, res, 'Profile saved.');
}

export async function saveNumberSeriesForm(formData: FormData): Promise<void> {
  const back = backTo(formData, '/settings');
  const res = await saveNumberSeries(formData);
  finish(back, res, 'Numbering updated.');
}

export async function saveUserForm(formData: FormData): Promise<void> {
  const back = backTo(formData, '/settings');
  const res = await saveUser(formData);
  finish(back, res, 'User saved.');
}

export async function saveUser(formData: FormData) {
  const user = await requireUser();
  if (user.role !== 'owner') return { ok: false as const, error: 'Only the owner can manage users.' };
  const id = Number(formData.get('id') || 0);
  const name = String(formData.get('name') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const role = String(formData.get('role') || 'staff');
  const password = String(formData.get('password') || '');

  if (!name || !phone) return { ok: false as const, error: 'Name and phone are required.' };

  try {
    if (id) {
      run('UPDATE app_user SET name=?, phone=?, role=? WHERE id=? AND business_id=?', name, phone, role, id, user.business_id);
      if (password) run('UPDATE app_user SET password_hash=? WHERE id=?', hashPassword(password), id);
    } else {
      if (!password) return { ok: false as const, error: 'Set a password for the new user.' };
      run('INSERT INTO app_user (business_id, name, phone, password_hash, role) VALUES (?,?,?,?,?)',
        user.business_id, name, phone, hashPassword(password), role);
    }
  } catch {
    return { ok: false as const, error: 'That phone number is already in use.' };
  }
  revalidatePath('/settings');
  return { ok: true as const };
}
