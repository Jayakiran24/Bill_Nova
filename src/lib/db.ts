import { createClient, type Client, type Transaction, type InStatement } from "@libsql/client";
import { AsyncLocalStorage } from "node:async_hooks";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { SCHEMA } from "./schema";
import catalogueJson from "./seed-rockwell.json";

/**
 * Storage is libSQL: Turso in production (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN),
 * or a local SQLite file when those are not set (plain `npm run dev`).
 * Every helper is async because the database is a network service on Vercel.
 */

type Row = Record<string, unknown>;

declare global {
  // eslint-disable-next-line no-var
  var __billnova_client: Client | undefined;
  // eslint-disable-next-line no-var
  var __billnova_ready: Promise<void> | undefined;
}

function makeClient(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    return createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  if (process.env.VERCEL) {
    throw new Error(
      "TURSO_DATABASE_URL is not set. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the Vercel project's environment variables.",
    );
  }
  const dir = process.env.BILLNOVA_DATA_DIR || path.join(process.cwd(), "data");
  return createClient({ url: `file:${path.join(dir, "billnova.db")}` });
}

function client(): Client {
  if (!globalThis.__billnova_client) {
    if (!process.env.TURSO_DATABASE_URL && !process.env.VERCEL) {
      // Local file database: make sure the folder exists.
      const dir =
        process.env.BILLNOVA_DATA_DIR || path.join(process.cwd(), "data");
      mkdirSync(dir, { recursive: true });
    }
    globalThis.__billnova_client = makeClient();
  }
  return globalThis.__billnova_client;
}

/** Create the schema and first-run seed once per process. */
function ready(): Promise<void> {
  if (!globalThis.__billnova_ready) {
    const p = (async () => {
      const c = client();
      await c.executeMultiple(SCHEMA);
      await migrate(c);
      await seedIfEmpty(c);
    })();
    p.catch(() => {
      // Allow a retry on the next request instead of caching the failure.
      globalThis.__billnova_ready = undefined;
    });
    globalThis.__billnova_ready = p;
  }
  return globalThis.__billnova_ready;
}

/** The open transaction for the current async call chain, if any. */
const txStore = new AsyncLocalStorage<Transaction>();

async function execute(sql: string, params: unknown[]) {
  await ready();
  const target = txStore.getStore() ?? client();
  return target.execute({ sql, args: params as never[] });
}

function plain(columns: string[], row: ArrayLike<unknown>): Row {
  const out: Row = {};
  columns.forEach((c, i) => {
    out[c] = row[i];
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Query helpers                                                       */
/* ------------------------------------------------------------------ */

export async function all<T = Row>(sql: string, ...params: unknown[]): Promise<T[]> {
  const rs = await execute(sql, params);
  return rs.rows.map((r) => plain(rs.columns, r)) as T[];
}

export async function get<T = Row>(
  sql: string,
  ...params: unknown[]
): Promise<T | undefined> {
  const rs = await execute(sql, params);
  return rs.rows[0] ? (plain(rs.columns, rs.rows[0]) as T) : undefined;
}

export async function run(sql: string, ...params: unknown[]) {
  const rs = await execute(sql, params);
  return {
    changes: rs.rowsAffected,
    lastInsertRowid: Number(rs.lastInsertRowid ?? 0),
  };
}

/**
 * Run fn inside a single write transaction. Every write that touches money or
 * stock goes through here, so an invoice can never exist without its ledger rows.
 * all/get/run called anywhere inside fn automatically use this transaction.
 */
export async function tx<T>(fn: () => Promise<T> | T): Promise<T> {
  await ready();
  const t = await client().transaction("write");
  try {
    const result = await txStore.run(t, async () => fn());
    await t.commit();
    return result;
  } catch (e) {
    try {
      await t.rollback();
    } catch {
      /* the transaction was already rolled back */
    }
    throw e;
  } finally {
    t.close();
  }
}

/**
 * Take the next document number. MUST be called inside tx() — reading it
 * outside a transaction is how two staff end up with the same invoice number.
 */
export async function nextNumber(
  businessId: number,
  voucherType: string,
  financialYear: string,
  defaultPrefix: string,
): Promise<string> {
  let series = await get<{ id: number; prefix: string; last_number: number }>(
    "SELECT id, prefix, last_number FROM number_series WHERE business_id = ? AND voucher_type = ? AND financial_year = ?",
    businessId,
    voucherType,
    financialYear,
  );

  if (!series) {
    await run(
      "INSERT INTO number_series (business_id, voucher_type, financial_year, prefix, last_number) VALUES (?,?,?,?,0)",
      businessId,
      voucherType,
      financialYear,
      defaultPrefix,
    );
    series = (await get<{ id: number; prefix: string; last_number: number }>(
      "SELECT id, prefix, last_number FROM number_series WHERE business_id = ? AND voucher_type = ? AND financial_year = ?",
      businessId,
      voucherType,
      financialYear,
    ))!;
  }

  const next = series.last_number + 1;
  await run("UPDATE number_series SET last_number = ? WHERE id = ?", next, series.id);

  const num = `${series.prefix}${String(next).padStart(4, "0")}`;
  // Rule: unique, consecutive, max 16 characters, no spaces.
  if (num.length > 16)
    throw new Error(
      "Document number exceeds 16 characters. Shorten the prefix.",
    );
  return num;
}

export async function audit(
  businessId: number | null,
  userId: number | null,
  action: string,
  tableName: string,
  rowId: number | null,
  before: unknown,
  after: unknown,
) {
  await run(
    "INSERT INTO audit_log (business_id, user_id, action, table_name, row_id, before_json, after_json) VALUES (?,?,?,?,?,?,?)",
    businessId,
    userId,
    action,
    tableName,
    rowId,
    before ? JSON.stringify(before) : null,
    after ? JSON.stringify(after) : null,
  );
}

/** Every table as JSON, for the owner's backup download. */
export async function dumpAll(): Promise<Record<string, Row[]>> {
  const tables = await all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' ORDER BY name",
  );
  const out: Record<string, Row[]> = {};
  for (const t of tables) {
    out[t.name] = await all(`SELECT * FROM "${t.name.replace(/"/g, '""')}"`);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Passwords                                                           */
/* ------------------------------------------------------------------ */

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const candidate = scryptSync(plain, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return (
      candidate.length === expected.length &&
      timingSafeEqual(candidate, expected)
    );
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Migrations for databases created before email / Google sign-in      */
/* ------------------------------------------------------------------ */

async function migrate(c: Client) {
  await c.executeMultiple(`
    CREATE TABLE IF NOT EXISTS app_flag (name TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS otp_challenge (
      id           TEXT PRIMARY KEY,
      purpose      TEXT NOT NULL CHECK (purpose IN ('signup','login','reset')),
      email        TEXT NOT NULL,
      user_id      INTEGER,
      payload      TEXT,
      code_hash    TEXT NOT NULL,
      expires_at   TEXT NOT NULL,
      attempts     INTEGER NOT NULL DEFAULT 0,
      resends      INTEGER NOT NULL DEFAULT 0,
      verified_at  TEXT,
      consumed_at  TEXT,
      last_sent_at TEXT NOT NULL,
      created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_challenge(email, created_at);
    CREATE TABLE IF NOT EXISTS staff_invite (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      email       TEXT NOT NULL,
      name        TEXT,
      invited_by  INTEGER,
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      accepted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_invite_email ON staff_invite(email);
    CREATE TABLE IF NOT EXISTS login_failure (
      identifier TEXT NOT NULL,
      at         TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_login_failure ON login_failure(identifier, at);
  `);
  // One-time: every product in the demo shop starts with 5 units (low-stock alert at 1).
  // Bills already made count against it, so an item sold once shows 4.
  const done = await c.execute("SELECT 1 FROM app_flag WHERE name = 'stock5'");
  if (!done.rows.length) {
    await c.execute(`UPDATE item SET opening_stock = 5000, low_stock_level = 1000
       WHERE business_id = 1 AND is_service = 0 AND opening_stock IN (0, 55000)`);
    await c.execute("INSERT OR IGNORE INTO app_flag (name) VALUES ('stock5')");
  }

  const cols = await c.execute("PRAGMA table_info(app_user)");
  const have = new Set(cols.rows.map((r) => String(r[1])));
  if (!have.has("email")) await c.execute("ALTER TABLE app_user ADD COLUMN email TEXT");
  if (!have.has("google_id")) await c.execute("ALTER TABLE app_user ADD COLUMN google_id TEXT");
  await c.execute(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email ON app_user(email) WHERE email IS NOT NULL",
  );
  await c.execute(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_user_google ON app_user(google_id) WHERE google_id IS NOT NULL",
  );
}

/* ------------------------------------------------------------------ */
/* First-run seed                                                      */
/* ------------------------------------------------------------------ */

async function seedIfEmpty(c: Client) {
  const row = await c.execute("SELECT COUNT(*) AS n FROM business");
  if (Number(row.rows[0][0]) > 0) return;

  const stmts: InStatement[] = [];
  const add = (sql: string, ...args: unknown[]) =>
    stmts.push({ sql, args: args as never[] });

  add(
    `INSERT INTO business (id, name, legal_name, gstin, address_line1, city, pincode, state, state_code, phone, terms, hsn_digits)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 4)`,
    "Cool Line Refrigeration",
    "Cool Line Refrigeration",
    "36ABCDE1234F1Z5",
    "Shop 12, Industrial Estate Road",
    "Hyderabad",
    "500018",
    "Telangana",
    "36",
    "9000000000",
    "Goods once sold will not be taken back. Warranty as per manufacturer terms. Interest @18% p.a. charged on overdue bills.",
  );

  add(
    "INSERT INTO app_user (business_id, name, phone, password_hash, role) VALUES (1, ?, ?, ?, ?)",
    "Owner",
    "9000000000",
    hashPassword("1234"),
    "owner",
  );
  add(
    "INSERT INTO app_user (business_id, name, phone, password_hash, role) VALUES (1, ?, ?, ?, ?)",
    "Counter Staff",
    "9000000001",
    hashPassword("1234"),
    "staff",
  );

  add(
    "INSERT INTO number_series (business_id, voucher_type, financial_year, prefix, last_number) VALUES (1,'sales_invoice','2026-27','INV/26-27/',0)",
  );
  add(
    "INSERT INTO number_series (business_id, voucher_type, financial_year, prefix, last_number) VALUES (1,'estimate','2026-27','EST/26-27/',0)",
  );
  add(
    "INSERT INTO number_series (business_id, voucher_type, financial_year, prefix, last_number) VALUES (1,'purchase_bill','2026-27','PUR/26-27/',0)",
  );

  const itemSql = `INSERT INTO item (business_id, name, sku, brand, category, hsn_sac, unit,
         sale_price, purchase_price, mrp, dealer_price, gst_rate_bp,
         opening_stock, low_stock_level, is_service)
       VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

  // The Rockwell 2026 dealer price list, 110 models. Sale and purchase prices are
  // GST-EXCLUSIVE (the sheet's MRP and DP divided by 1.18), so an invoice at the
  // sale rate plus 18% GST lands exactly on the printed MRP. The sheet's own
  // figures are kept in mrp and dealer_price for reference on screen.
  // Every model starts with 5 units in stock (the price list itself says nothing about stock).
  type SeedItem = {
    name: string;
    sku: string;
    brand: string;
    category: string;
    hsn_sac: string;
    unit: string;
    gst_rate_bp: number;
    sale_price: number;
    purchase_price: number;
    mrp: number;
    dealer_price: number;
  };
  for (const it of catalogueJson as SeedItem[]) {
    add(
      itemSql,
      it.name,
      it.sku,
      it.brand,
      it.category,
      it.hsn_sac || null,
      it.unit,
      it.sale_price,
      it.purchase_price,
      it.mrp,
      it.dealer_price,
      it.gst_rate_bp,
      5_000, // opening stock: 5 units of every model (quantities are in thousandths)
      1_000, // low-stock alert at 1
      0,
    );
  }

  // Services the shop sells alongside the hardware. SAC 998717 at 18%.
  const services: [string, string, number][] = [
    ["Installation & Commissioning", "INST", 250000],
    ["Annual Maintenance Visit", "AMC", 150000],
    ["Gas Refilling Service", "GAS", 180000],
    ["Transport & Delivery", "TRANS", 120000],
  ];
  for (const [name, sku, rate] of services) {
    add(itemSql, name, sku, "Service", "Services", "998717", "JOB", rate, 0, 0, 0, 1800, 0, 0, 1);
  }

  const parties: [string, string, string, string, string, string, number][] = [
    ["Kumar Hotels Pvt Ltd", "customer", "9848012345", "36AABCK1234M1ZP", "Banjara Hills, Hyderabad", "36", 0],
    ["Sri Lakshmi Sweets", "customer", "9848023456", "", "Dilsukhnagar, Hyderabad", "36", 1250000],
    ["Blue Star Restaurant", "customer", "9848034567", "36AACCB5678N1Z2", "Gachibowli, Hyderabad", "36", 0],
    ["Anand Dairy Farm", "customer", "9848045678", "", "Medak Road, Sangareddy", "36", 480000],
    ["Chennai Cold Supplies", "customer", "9840056789", "33AAACC9012P1Z8", "T Nagar, Chennai", "33", 0],
    ["Voltas Distributors", "supplier", "9848067890", "36AAACV1111Q1Z4", "Kukatpally, Hyderabad", "36", 0],
    ["Refrigeration Parts Co", "supplier", "9848078901", "36AADCR2222R1Z9", "Balanagar, Hyderabad", "36", 0],
  ];
  for (const [name, type, phone, gstin, addr, sc, ob] of parties) {
    add(
      `INSERT INTO party (business_id, name, type, phone, gstin, billing_address, state_code, state, opening_balance)
       VALUES (1,?,?,?,?,?,?,?,?)`,
      name,
      type,
      phone,
      gstin,
      addr,
      sc,
      sc === "36" ? "Telangana" : "Tamil Nadu",
      ob,
    );
  }

  try {
    // One atomic batch. If two cold starts race, the second hits the business id=1
    // primary key, rolls back whole, and finds the data already there.
    await c.batch(stmts, "write");
  } catch (e) {
    const again = await c.execute("SELECT COUNT(*) AS n FROM business");
    if (Number(again.rows[0][0]) === 0) throw e;
  }
}
