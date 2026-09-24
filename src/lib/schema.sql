-- Bill Nova schema
-- All money is stored as INTEGER paise. All quantities as INTEGER thousandths.
-- All GST rates as INTEGER basis points (1800 = 18%). Never a floating point number.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS business (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL,
  legal_name      TEXT,
  gstin           TEXT,
  address_line1   TEXT,
  address_line2   TEXT,
  city            TEXT,
  pincode         TEXT,
  state           TEXT NOT NULL DEFAULT 'Telangana',
  state_code      TEXT NOT NULL DEFAULT '36',
  phone           TEXT,
  email           TEXT,
  bank_name       TEXT,
  bank_account    TEXT,
  bank_ifsc       TEXT,
  upi_id          TEXT,
  terms           TEXT,
  hsn_digits      INTEGER NOT NULL DEFAULT 4,
  is_composition  INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_user (
  id            INTEGER PRIMARY KEY,
  business_id   INTEGER NOT NULL REFERENCES business(id),
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('owner','staff')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS session (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES app_user(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS party (
  id               INTEGER PRIMARY KEY,
  business_id      INTEGER NOT NULL REFERENCES business(id),
  name             TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'customer' CHECK (type IN ('customer','supplier','both')),
  phone            TEXT,
  email            TEXT,
  gstin            TEXT,
  billing_address  TEXT,
  shipping_address TEXT,
  state            TEXT,
  state_code       TEXT,
  opening_balance  INTEGER NOT NULL DEFAULT 0,   -- paise, positive means they owe us
  credit_limit     INTEGER NOT NULL DEFAULT 0,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_party_name ON party(business_id, name);

CREATE TABLE IF NOT EXISTS item (
  id              INTEGER PRIMARY KEY,
  business_id     INTEGER NOT NULL REFERENCES business(id),
  name            TEXT NOT NULL,
  sku             TEXT,
  hsn_sac         TEXT,
  unit            TEXT NOT NULL DEFAULT 'PCS',
  sale_price      INTEGER NOT NULL DEFAULT 0,    -- paise
  purchase_price  INTEGER NOT NULL DEFAULT 0,    -- paise, owner-only
  gst_rate_bp     INTEGER NOT NULL DEFAULT 1800, -- 1800 = 18%
  is_service      INTEGER NOT NULL DEFAULT 0,
  brand           TEXT,
  category        TEXT,
  mrp             INTEGER NOT NULL DEFAULT 0,    -- paise, inclusive of GST, from the price list
  dealer_price    INTEGER NOT NULL DEFAULT 0,    -- paise, inclusive of GST, from the price list
  opening_stock   INTEGER NOT NULL DEFAULT 0,    -- thousandths
  low_stock_level INTEGER NOT NULL DEFAULT 0,    -- thousandths
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_item_name ON item(business_id, name);
CREATE INDEX IF NOT EXISTS idx_item_brand ON item(business_id, brand, category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_sku ON item(business_id, brand, sku)
  WHERE sku IS NOT NULL AND sku <> '';

CREATE TABLE IF NOT EXISTS number_series (
  id             INTEGER PRIMARY KEY,
  business_id    INTEGER NOT NULL REFERENCES business(id),
  voucher_type   TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  prefix         TEXT NOT NULL DEFAULT '',
  last_number    INTEGER NOT NULL DEFAULT 0,
  UNIQUE(business_id, voucher_type, financial_year)
);

CREATE TABLE IF NOT EXISTS voucher (
  id                   INTEGER PRIMARY KEY,
  business_id          INTEGER NOT NULL REFERENCES business(id),
  type                 TEXT NOT NULL CHECK (type IN
                         ('sales_invoice','estimate','sales_return','purchase_bill','purchase_return')),
  number               TEXT NOT NULL,
  financial_year       TEXT NOT NULL,
  date                 TEXT NOT NULL,             -- YYYY-MM-DD, a date with no time
  party_id             INTEGER REFERENCES party(id),
  party_name           TEXT,                      -- snapshot, so an old bill reprints unchanged
  party_gstin          TEXT,
  party_address        TEXT,
  place_of_supply_code TEXT,
  is_igst              INTEGER NOT NULL DEFAULT 0,
  taxable_value        INTEGER NOT NULL DEFAULT 0,
  discount_total       INTEGER NOT NULL DEFAULT 0,
  cgst                 INTEGER NOT NULL DEFAULT 0,
  sgst                 INTEGER NOT NULL DEFAULT 0,
  igst                 INTEGER NOT NULL DEFAULT 0,
  round_off            INTEGER NOT NULL DEFAULT 0,
  grand_total          INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'final'
                         CHECK (status IN ('draft','final','cancelled')),
  notes                TEXT,
  transporter          TEXT,
  vehicle_no           TEXT,
  cancel_reason        TEXT,
  created_by           INTEGER REFERENCES app_user(id),
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(business_id, type, financial_year, number)
);
CREATE INDEX IF NOT EXISTS idx_voucher_date ON voucher(business_id, type, date);
CREATE INDEX IF NOT EXISTS idx_voucher_party ON voucher(party_id);

CREATE TABLE IF NOT EXISTS voucher_line (
  id             INTEGER PRIMARY KEY,
  voucher_id     INTEGER NOT NULL REFERENCES voucher(id) ON DELETE CASCADE,
  line_no        INTEGER NOT NULL,
  item_id        INTEGER REFERENCES item(id),
  description    TEXT NOT NULL,
  sku            TEXT,                          -- model code snapshot, printed on the bill
  hsn_sac        TEXT,
  unit           TEXT,
  qty            INTEGER NOT NULL,              -- thousandths
  rate           INTEGER NOT NULL,              -- paise
  discount_amt   INTEGER NOT NULL DEFAULT 0,
  taxable_value  INTEGER NOT NULL,
  gst_rate_bp    INTEGER NOT NULL,
  cgst           INTEGER NOT NULL DEFAULT 0,
  sgst           INTEGER NOT NULL DEFAULT 0,
  igst           INTEGER NOT NULL DEFAULT 0,
  line_total     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_line_voucher ON voucher_line(voucher_id);

CREATE TABLE IF NOT EXISTS payment (
  id          INTEGER PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES business(id),
  type        TEXT NOT NULL CHECK (type IN ('in','out')),
  number      TEXT NOT NULL,
  date        TEXT NOT NULL,
  party_id    INTEGER REFERENCES party(id),
  party_name  TEXT,
  mode        TEXT NOT NULL DEFAULT 'cash' CHECK (mode IN ('cash','upi','bank','cheque','card')),
  amount      INTEGER NOT NULL,                 -- paise
  reference   TEXT,
  notes       TEXT,
  status      TEXT NOT NULL DEFAULT 'final' CHECK (status IN ('final','cancelled')),
  created_by  INTEGER REFERENCES app_user(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payment_allocation (
  id         INTEGER PRIMARY KEY,
  payment_id INTEGER NOT NULL REFERENCES payment(id) ON DELETE CASCADE,
  voucher_id INTEGER NOT NULL REFERENCES voucher(id),
  amount     INTEGER NOT NULL
);

-- The single source of truth for what a party owes. Balances are never stored.
CREATE TABLE IF NOT EXISTS party_ledger (
  id          INTEGER PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES business(id),
  party_id    INTEGER NOT NULL REFERENCES party(id),
  date        TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id   INTEGER,
  narration   TEXT,
  debit       INTEGER NOT NULL DEFAULT 0,   -- they owe us more
  credit      INTEGER NOT NULL DEFAULT 0,   -- they owe us less
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pl_party ON party_ledger(party_id, date);

-- The single source of truth for stock on hand.
CREATE TABLE IF NOT EXISTS stock_ledger (
  id          INTEGER PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES business(id),
  item_id     INTEGER NOT NULL REFERENCES item(id),
  date        TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id   INTEGER,
  narration   TEXT,
  qty_in      INTEGER NOT NULL DEFAULT 0,   -- thousandths
  qty_out     INTEGER NOT NULL DEFAULT 0,
  rate        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sl_item ON stock_ledger(item_id, date);

CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY,
  business_id INTEGER,
  user_id     INTEGER,
  action      TEXT NOT NULL,
  table_name  TEXT,
  row_id      INTEGER,
  before_json TEXT,
  after_json  TEXT,
  at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Derived views. Rebuild-safe: they read the ledgers, never a stored total.
CREATE VIEW IF NOT EXISTS party_balance AS
SELECT
  p.id            AS party_id,
  p.business_id   AS business_id,
  p.name          AS name,
  p.opening_balance
    + COALESCE((SELECT SUM(debit) - SUM(credit) FROM party_ledger l WHERE l.party_id = p.id), 0)
                  AS balance
FROM party p;

CREATE VIEW IF NOT EXISTS stock_on_hand AS
SELECT
  i.id          AS item_id,
  i.business_id AS business_id,
  i.name        AS name,
  i.opening_stock
    + COALESCE((SELECT SUM(qty_in) - SUM(qty_out) FROM stock_ledger s WHERE s.item_id = i.id), 0)
                AS qty
FROM item i;
