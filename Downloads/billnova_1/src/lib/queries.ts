import { all, get } from './db';
import { todayISO } from './money';

export interface Business {
  id: number; name: string; legal_name: string | null; gstin: string | null;
  address_line1: string | null; address_line2: string | null; city: string | null;
  pincode: string | null; state: string; state_code: string; phone: string | null;
  email: string | null; bank_name: string | null; bank_account: string | null;
  bank_ifsc: string | null; upi_id: string | null; terms: string | null;
  hsn_digits: number; is_composition: number;
}

export interface Party {
  id: number; name: string; type: string; phone: string | null; email: string | null;
  gstin: string | null; billing_address: string | null; shipping_address: string | null;
  state: string | null; state_code: string | null; opening_balance: number;
  credit_limit: number; is_active: number;
}

export interface Item {
  id: number; name: string; sku: string | null; hsn_sac: string | null; unit: string;
  sale_price: number; purchase_price: number; gst_rate_bp: number; is_service: number;
  brand: string | null; category: string | null; mrp: number; dealer_price: number;
  opening_stock: number; low_stock_level: number; is_active: number;
}

export interface Voucher {
  id: number; type: string; number: string; financial_year: string; date: string;
  party_id: number | null; party_name: string | null; party_gstin: string | null;
  party_address: string | null; place_of_supply_code: string | null; is_igst: number;
  taxable_value: number; discount_total: number; cgst: number; sgst: number; igst: number;
  round_off: number; grand_total: number; status: string; notes: string | null;
  transporter: string | null; vehicle_no: string | null; cancel_reason: string | null;
  created_at: string;
}

export interface VoucherLine {
  id: number; voucher_id: number; line_no: number; item_id: number | null;
  description: string; sku: string | null; hsn_sac: string | null; unit: string | null; qty: number;
  rate: number; discount_amt: number; taxable_value: number; gst_rate_bp: number;
  cgst: number; sgst: number; igst: number; line_total: number;
}

export function getBusiness(id = 1): Business {
  return get<Business>('SELECT * FROM business WHERE id = ?', id)!;
}

export function listParties(businessId: number, search = '', type?: string): (Party & { balance: number })[] {
  const like = `%${search}%`;
  const typeClause = type ? " AND (p.type = ? OR p.type = 'both')" : '';
  const params: unknown[] = [businessId, like, like];
  if (type) params.push(type);
  return all(
    `SELECT p.*, COALESCE(b.balance, 0) AS balance
       FROM party p LEFT JOIN party_balance b ON b.party_id = p.id
      WHERE p.business_id = ? AND p.is_active = 1
        AND (p.name LIKE ? OR IFNULL(p.phone,'') LIKE ?)${typeClause}
      ORDER BY p.name`,
    ...params,
  );
}

export function getParty(id: number): (Party & { balance: number }) | undefined {
  return get(
    `SELECT p.*, COALESCE(b.balance, 0) AS balance
       FROM party p LEFT JOIN party_balance b ON b.party_id = p.id WHERE p.id = ?`,
    id,
  );
}

export function partyLedger(partyId: number) {
  return all<{ date: string; source_type: string; source_id: number; narration: string; debit: number; credit: number }>(
    `SELECT date, source_type, source_id, narration, debit, credit
       FROM party_ledger WHERE party_id = ? ORDER BY date, id`,
    partyId,
  );
}

export function listItems(
  businessId: number,
  search = '',
  brand = '',
  category = '',
): (Item & { stock: number })[] {
  const like = `%${search}%`;
  const clauses = ['i.business_id = ?', 'i.is_active = 1',
    "(i.name LIKE ? OR IFNULL(i.hsn_sac,'') LIKE ? OR IFNULL(i.sku,'') LIKE ?)"];
  const params: unknown[] = [businessId, like, like, like];
  if (brand) { clauses.push('i.brand = ?'); params.push(brand); }
  if (category) { clauses.push('i.category = ?'); params.push(category); }
  return all(
    `SELECT i.*, COALESCE(s.qty, 0) AS stock
       FROM item i LEFT JOIN stock_on_hand s ON s.item_id = i.id
      WHERE ${clauses.join(' AND ')}
      ORDER BY i.brand, i.category, i.name`,
    ...params,
  );
}

/** Distinct brands, with how many items each has. Drives the Items filter bar. */
export function listBrands(businessId: number) {
  return all<{ brand: string; n: number }>(
    `SELECT IFNULL(brand,'') AS brand, COUNT(*) AS n FROM item
      WHERE business_id = ? AND is_active = 1 AND IFNULL(brand,'') <> ''
      GROUP BY brand ORDER BY brand`,
    businessId,
  );
}

/** Categories, optionally narrowed to one brand. */
export function listCategories(businessId: number, brand = '') {
  const clauses = ['business_id = ?', 'is_active = 1', "IFNULL(category,'') <> ''"];
  const params: unknown[] = [businessId];
  if (brand) { clauses.push('brand = ?'); params.push(brand); }
  return all<{ category: string; n: number }>(
    `SELECT category, COUNT(*) AS n FROM item
      WHERE ${clauses.join(' AND ')} GROUP BY category ORDER BY category`,
    ...params,
  );
}

export function getItem(id: number): (Item & { stock: number }) | undefined {
  return get(
    `SELECT i.*, COALESCE(s.qty, 0) AS stock
       FROM item i LEFT JOIN stock_on_hand s ON s.item_id = i.id WHERE i.id = ?`,
    id,
  );
}

export function lowStockItems(businessId: number) {
  return all<Item & { stock: number }>(
    `SELECT i.*, COALESCE(s.qty, 0) AS stock
       FROM item i LEFT JOIN stock_on_hand s ON s.item_id = i.id
      WHERE i.business_id = ? AND i.is_active = 1 AND i.is_service = 0
        AND i.low_stock_level > 0 AND COALESCE(s.qty, 0) <= i.low_stock_level
      ORDER BY (COALESCE(s.qty,0) - i.low_stock_level)`,
    businessId,
  );
}

export function listVouchers(
  businessId: number,
  type: string,
  opts: { from?: string; to?: string; search?: string; unpaidOnly?: boolean } = {},
) {
  const clauses: string[] = ['v.business_id = ?', 'v.type = ?'];
  const params: unknown[] = [businessId, type];
  if (opts.from) { clauses.push('v.date >= ?'); params.push(opts.from); }
  if (opts.to) { clauses.push('v.date <= ?'); params.push(opts.to); }
  if (opts.search) {
    clauses.push("(v.number LIKE ? OR IFNULL(v.party_name,'') LIKE ?)");
    params.push(`%${opts.search}%`, `%${opts.search}%`);
  }
  // due is computed in an inner select, then filtered outside it: a HAVING with no
  // GROUP BY would collapse every row into one.
  const outerWhere = opts.unpaidOnly ? 'WHERE due > 0' : '';
  return all<Voucher & { paid: number; due: number }>(
    `SELECT * FROM (
       SELECT v.*,
              COALESCE((SELECT SUM(a.amount) FROM payment_allocation a
                          JOIN payment p ON p.id = a.payment_id
                         WHERE a.voucher_id = v.id AND p.status = 'final'), 0) AS paid,
              CASE WHEN v.status <> 'final' THEN 0 ELSE
                v.grand_total - COALESCE((SELECT SUM(a.amount) FROM payment_allocation a
                          JOIN payment p ON p.id = a.payment_id
                         WHERE a.voucher_id = v.id AND p.status = 'final'), 0) END AS due
         FROM voucher v
        WHERE ${clauses.join(' AND ')}
     ) ${outerWhere}
     ORDER BY date DESC, id DESC
     LIMIT 500`,
    ...params,
  );
}

export function getVoucher(id: number): Voucher | undefined {
  return get<Voucher>('SELECT * FROM voucher WHERE id = ?', id);
}

export function voucherLines(voucherId: number): VoucherLine[] {
  return all<VoucherLine>('SELECT * FROM voucher_line WHERE voucher_id = ? ORDER BY line_no', voucherId);
}

export function voucherPaid(voucherId: number): number {
  const r = get<{ n: number }>(
    `SELECT COALESCE(SUM(a.amount),0) AS n FROM payment_allocation a
       JOIN payment p ON p.id = a.payment_id
      WHERE a.voucher_id = ? AND p.status = 'final'`,
    voucherId,
  );
  return r?.n ?? 0;
}

export function openBillsForParty(partyId: number) {
  return all<{ id: number; number: string; date: string; type: string; grand_total: number; due: number }>(
    `SELECT * FROM (
       SELECT v.id, v.number, v.date, v.type, v.grand_total,
              v.grand_total - COALESCE((SELECT SUM(a.amount) FROM payment_allocation a
                          JOIN payment p ON p.id = a.payment_id
                         WHERE a.voucher_id = v.id AND p.status = 'final'), 0) AS due
         FROM voucher v
        WHERE v.party_id = ? AND v.type IN ('sales_invoice','purchase_bill') AND v.status = 'final'
     ) WHERE due > 0
     ORDER BY date`,
    partyId,
  );
}

export function listPayments(businessId: number, from?: string, to?: string) {
  const clauses = ['p.business_id = ?'];
  const params: unknown[] = [businessId];
  if (from) { clauses.push('p.date >= ?'); params.push(from); }
  if (to) { clauses.push('p.date <= ?'); params.push(to); }
  return all<{ id: number; type: string; number: string; date: string; party_name: string; mode: string; amount: number; reference: string | null; status: string }>(
    `SELECT p.* FROM payment p WHERE ${clauses.join(' AND ')} ORDER BY p.date DESC, p.id DESC LIMIT 500`,
    ...params,
  );
}

/* ---------------------------- dashboard ---------------------------- */

export function dashboard(businessId: number) {
  const today = todayISO();
  const monthStart = today.slice(0, 8) + '01';

  const todaySales = get<{ n: number; c: number }>(
    `SELECT COALESCE(SUM(grand_total),0) AS n, COUNT(*) AS c FROM voucher
      WHERE business_id = ? AND type = 'sales_invoice' AND status = 'final' AND date = ?`,
    businessId, today,
  )!;

  const monthSales = get<{ n: number; c: number }>(
    `SELECT COALESCE(SUM(grand_total),0) AS n, COUNT(*) AS c FROM voucher
      WHERE business_id = ? AND type = 'sales_invoice' AND status = 'final' AND date >= ?`,
    businessId, monthStart,
  )!;

  const todayCollected = get<{ n: number }>(
    `SELECT COALESCE(SUM(amount),0) AS n FROM payment
      WHERE business_id = ? AND type = 'in' AND status = 'final' AND date = ?`,
    businessId, today,
  )!;

  const receivable = get<{ n: number }>(
    `SELECT COALESCE(SUM(balance),0) AS n FROM party_balance WHERE business_id = ? AND balance > 0`,
    businessId,
  )!;

  const payable = get<{ n: number }>(
    `SELECT COALESCE(-SUM(balance),0) AS n FROM party_balance WHERE business_id = ? AND balance < 0`,
    businessId,
  )!;

  const lowStock = get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM item i LEFT JOIN stock_on_hand s ON s.item_id = i.id
      WHERE i.business_id = ? AND i.is_active = 1 AND i.is_service = 0
        AND i.low_stock_level > 0 AND COALESCE(s.qty,0) <= i.low_stock_level`,
    businessId,
  )!;

  const recent = all<Voucher>(
    `SELECT * FROM voucher WHERE business_id = ? AND type = 'sales_invoice'
      ORDER BY id DESC LIMIT 8`,
    businessId,
  );

  const topDebtors = all<{ party_id: number; name: string; balance: number }>(
    `SELECT party_id, name, balance FROM party_balance
      WHERE business_id = ? AND balance > 0 ORDER BY balance DESC LIMIT 5`,
    businessId,
  );

  return {
    today, todaySales, monthSales, todayCollected: todayCollected.n,
    receivable: receivable.n, payable: payable.n, lowStock: lowStock.n,
    recent, topDebtors,
  };
}

/* ----------------------------- reports ----------------------------- */

export function saleRegister(businessId: number, from: string, to: string) {
  return all<Voucher>(
    `SELECT * FROM voucher WHERE business_id = ? AND type = 'sales_invoice'
        AND date BETWEEN ? AND ? ORDER BY date, number`,
    businessId, from, to,
  );
}

export function gstSummary(businessId: number, from: string, to: string) {
  return all<{ hsn_sac: string; gst_rate_bp: number; qty: number; taxable_value: number; cgst: number; sgst: number; igst: number }>(
    `SELECT IFNULL(l.hsn_sac,'') AS hsn_sac, l.gst_rate_bp,
            SUM(l.qty) AS qty, SUM(l.taxable_value) AS taxable_value,
            SUM(l.cgst) AS cgst, SUM(l.sgst) AS sgst, SUM(l.igst) AS igst
       FROM voucher_line l JOIN voucher v ON v.id = l.voucher_id
      WHERE v.business_id = ? AND v.type = 'sales_invoice' AND v.status = 'final'
        AND v.date BETWEEN ? AND ?
      GROUP BY l.hsn_sac, l.gst_rate_bp
      ORDER BY l.hsn_sac`,
    businessId, from, to,
  );
}

export function outstandingReport(businessId: number) {
  return all<{ party_id: number; name: string; balance: number }>(
    `SELECT party_id, name, balance FROM party_balance
      WHERE business_id = ? AND balance <> 0 ORDER BY balance DESC`,
    businessId,
  );
}

export function stockReport(businessId: number) {
  return all<{ id: number; name: string; unit: string; hsn_sac: string; stock: number; purchase_price: number; sale_price: number }>(
    `SELECT i.id, i.name, i.unit, IFNULL(i.hsn_sac,'') AS hsn_sac,
            COALESCE(s.qty,0) AS stock, i.purchase_price, i.sale_price
       FROM item i LEFT JOIN stock_on_hand s ON s.item_id = i.id
      WHERE i.business_id = ? AND i.is_active = 1 AND i.is_service = 0
      ORDER BY i.name`,
    businessId,
  );
}
