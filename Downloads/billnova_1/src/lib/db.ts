import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const DATA_DIR = process.env.BILLNOVA_DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'billnova.db');

type Row = Record<string, unknown>;

declare global {
  // eslint-disable-next-line no-var
  var __billnova_db: DatabaseSync | undefined;
}

function open(): DatabaseSync {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');

  const schemaPath = path.join(process.cwd(), 'src', 'lib', 'schema.sql');
  db.exec(readFileSync(schemaPath, 'utf8'));
  seedIfEmpty(db);
  return db;
}

export function getDb(): DatabaseSync {
  if (!globalThis.__billnova_db) globalThis.__billnova_db = open();
  return globalThis.__billnova_db;
}

/* ------------------------------------------------------------------ */
/* Query helpers                                                       */
/* ------------------------------------------------------------------ */

export function all<T = Row>(sql: string, ...params: unknown[]): T[] {
  return getDb().prepare(sql).all(...(params as never[])) as T[];
}

export function get<T = Row>(sql: string, ...params: unknown[]): T | undefined {
  return getDb().prepare(sql).get(...(params as never[])) as T | undefined;
}

export function run(sql: string, ...params: unknown[]) {
  return getDb().prepare(sql).run(...(params as never[]));
}

/**
 * Run fn inside a single transaction. Every write that touches money or stock
 * goes through here, so an invoice can never exist without its ledger rows.
 */
export function tx<T>(fn: () => T): T {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    try {
      db.exec('ROLLBACK');
    } catch {
      /* the transaction was already rolled back */
    }
    throw e;
  }
}

/**
 * Take the next document number. MUST be called inside tx() — reading it
 * outside a transaction is how two staff end up with the same invoice number.
 */
export function nextNumber(
  businessId: number,
  voucherType: string,
  financialYear: string,
  defaultPrefix: string,
): string {
  let series = get<{ id: number; prefix: string; last_number: number }>(
    'SELECT id, prefix, last_number FROM number_series WHERE business_id = ? AND voucher_type = ? AND financial_year = ?',
    businessId,
    voucherType,
    financialYear,
  );

  if (!series) {
    run(
      'INSERT INTO number_series (business_id, voucher_type, financial_year, prefix, last_number) VALUES (?,?,?,?,0)',
      businessId,
      voucherType,
      financialYear,
      defaultPrefix,
    );
    series = get<{ id: number; prefix: string; last_number: number }>(
      'SELECT id, prefix, last_number FROM number_series WHERE business_id = ? AND voucher_type = ? AND financial_year = ?',
      businessId,
      voucherType,
      financialYear,
    )!;
  }

  const next = series.last_number + 1;
  run('UPDATE number_series SET last_number = ? WHERE id = ?', next, series.id);

  const num = `${series.prefix}${String(next).padStart(4, '0')}`;
  // Rule: unique, consecutive, max 16 characters, no spaces.
  return num.slice(0, 16);
}

export function audit(
  businessId: number | null,
  userId: number | null,
  action: string,
  tableName: string,
  rowId: number | null,
  before: unknown,
  after: unknown,
) {
  run(
    'INSERT INTO audit_log (business_id, user_id, action, table_name, row_id, before_json, after_json) VALUES (?,?,?,?,?,?,?)',
    businessId,
    userId,
    action,
    tableName,
    rowId,
    before ? JSON.stringify(before) : null,
    after ? JSON.stringify(after) : null,
  );
}

/* ------------------------------------------------------------------ */
/* Passwords                                                           */
/* ------------------------------------------------------------------ */

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const candidate = scryptSync(plain, salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* First-run seed                                                      */
/* ------------------------------------------------------------------ */

function seedIfEmpty(db: DatabaseSync) {
  const row = db.prepare('SELECT COUNT(*) AS n FROM business').get() as { n: number };
  if (row.n > 0) return;

  db.exec('BEGIN');
  try {
    db.prepare(
      `INSERT INTO business (id, name, legal_name, gstin, address_line1, city, pincode, state, state_code, phone, terms, hsn_digits)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 4)`,
    ).run(
      'Cool Line Refrigeration',
      'Cool Line Refrigeration',
      '36ABCDE1234F1Z5',
      'Shop 12, Industrial Estate Road',
      'Hyderabad',
      '500018',
      'Telangana',
      '36',
      '9000000000',
      'Goods once sold will not be taken back. Warranty as per manufacturer terms. Interest @18% p.a. charged on overdue bills.',
    );

    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync('1234', salt, 64).toString('hex');
    db.prepare(
      'INSERT INTO app_user (business_id, name, phone, password_hash, role) VALUES (1, ?, ?, ?, ?)',
    ).run('Owner', '9000000000', `${salt}:${hash}`, 'owner');

    const salt2 = randomBytes(16).toString('hex');
    const hash2 = scryptSync('1234', salt2, 64).toString('hex');
    db.prepare(
      'INSERT INTO app_user (business_id, name, phone, password_hash, role) VALUES (1, ?, ?, ?, ?)',
    ).run('Counter Staff', '9000000001', `${salt2}:${hash2}`, 'staff');

    db.prepare(
      "INSERT INTO number_series (business_id, voucher_type, financial_year, prefix, last_number) VALUES (1,'sales_invoice','2026-27','INV/26-27/',0)",
    ).run();
    db.prepare(
      "INSERT INTO number_series (business_id, voucher_type, financial_year, prefix, last_number) VALUES (1,'estimate','2026-27','EST/26-27/',0)",
    ).run();
    db.prepare(
      "INSERT INTO number_series (business_id, voucher_type, financial_year, prefix, last_number) VALUES (1,'purchase_bill','2026-27','PUR/26-27/',0)",
    ).run();

    const insItem = db.prepare(
      `INSERT INTO item (business_id, name, sku, brand, category, hsn_sac, unit,
         sale_price, purchase_price, mrp, dealer_price, gst_rate_bp,
         opening_stock, low_stock_level, is_service)
       VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    );

    // The Rockwell 2026 dealer price list, 110 models. Sale and purchase prices are
    // GST-EXCLUSIVE (the sheet's MRP and DP divided by 1.18), so an invoice at the
    // sale rate plus 18% GST lands exactly on the printed MRP. The sheet's own
    // figures are kept in mrp and dealer_price for reference on screen.
    // Opening stock is zero everywhere: the price list says nothing about stock.
    type SeedItem = {
      name: string; sku: string; brand: string; category: string; hsn_sac: string;
      unit: string; gst_rate_bp: number; sale_price: number; purchase_price: number;
      mrp: number; dealer_price: number;
    };
    const catalogue: SeedItem[] = JSON.parse(
      readFileSync(path.join(process.cwd(), 'src', 'lib', 'seed-rockwell.json'), 'utf8'),
    );
    for (const it of catalogue) {
      insItem.run(it.name, it.sku, it.brand, it.category, it.hsn_sac || null, it.unit,
        it.sale_price, it.purchase_price, it.mrp, it.dealer_price, it.gst_rate_bp, 0, 0, 0);
    }

    // Services the shop sells alongside the hardware. SAC 998717 at 18%.
    const services: [string, string, number][] = [
      ['Installation & Commissioning', 'INST', 250000],
      ['Annual Maintenance Visit', 'AMC', 150000],
      ['Gas Refilling Service', 'GAS', 180000],
      ['Transport & Delivery', 'TRANS', 120000],
    ];
    for (const [name, sku, rate] of services) {
      insItem.run(name, sku, 'Service', 'Services', '998717', 'JOB', rate, 0, 0, 0, 1800, 0, 0, 1);
    }

    const parties: [string, string, string, string, string, string, number][] = [
      ['Kumar Hotels Pvt Ltd', 'customer', '9848012345', '36AABCK1234M1ZP', 'Banjara Hills, Hyderabad', '36', 0],
      ['Sri Lakshmi Sweets',   'customer', '9848023456', '',                'Dilsukhnagar, Hyderabad',  '36', 1250000],
      ['Blue Star Restaurant', 'customer', '9848034567', '36AACCB5678N1Z2', 'Gachibowli, Hyderabad',    '36', 0],
      ['Anand Dairy Farm',     'customer', '9848045678', '',                'Medak Road, Sangareddy',   '36', 480000],
      ['Chennai Cold Supplies','customer', '9840056789', '33AAACC9012P1Z8', 'T Nagar, Chennai',         '33', 0],
      ['Voltas Distributors',  'supplier', '9848067890', '36AAACV1111Q1Z4', 'Kukatpally, Hyderabad',    '36', 0],
      ['Refrigeration Parts Co','supplier','9848078901', '36AADCR2222R1Z9', 'Balanagar, Hyderabad',     '36', 0],
    ];
    const insParty = db.prepare(
      `INSERT INTO party (business_id, name, type, phone, gstin, billing_address, state_code, state, opening_balance)
       VALUES (1,?,?,?,?,?,?,?,?)`,
    );
    for (const [name, type, phone, gstin, addr, sc, ob] of parties) {
      insParty.run(name, type, phone, gstin, addr, sc, sc === '36' ? 'Telangana' : 'Tamil Nadu', ob);
    }

    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
