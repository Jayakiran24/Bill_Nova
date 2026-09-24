# Bill Nova

GST billing, inventory and party ledger for a commercial refrigeration business.
A working Vyapar-style web app that runs on a laptop, a shop PC, or a phone browser.

No cloud account, no database server, no API keys. One folder, one command.

---

## What works right now

- **Tax invoices** with automatic CGST + SGST or IGST, printed on an A4 layout that carries
  every field CGST Rule 46 requires.
- **Estimates / quotations** and **purchase bills**, sharing the same screen.
- **Customers and suppliers** with a running ledger — every bill and payment, closing balance.
- **Items** with HSN/SAC codes, GST rate, stock on hand and low-stock alerts.
- **Payments** in and out, part payments, auto-allocated to the oldest open bills.
- **Reports** — sale register, HSN-wise GST summary, outstanding, stock — all exporting to CSV.
- **Two roles** — the owner sees cost and profit, counter staff do not.
- **A real catalogue** — the Rockwell 2026 dealer price list, 110 models across 17 ranges,
  with brand and range filters and model-code search.
- **Price-list import** — load another company's catalogue from CSV, or refresh prices
  when a company revises its list.
- **WhatsApp share** of a bill and payment reminders, using free `wa.me` links.
- **Installs to a phone home screen** as a PWA.

Money is stored as integer paise and quantity as integer thousandths, so no amount
ever drifts by a paisa. Every invoice writes its ledger and stock rows inside one
database transaction — an invoice can never exist without its side effects.

---

## Running it

You need **Node.js 22.5 or newer** (the database is Node's built-in SQLite).
Check with `node --version`. If it is older, install the current LTS from nodejs.org.

```bash
npm install
npm run build
npm start
```

Open <http://localhost:3000>.

For development with live reload, use `npm run dev` instead of build + start.

### The Rockwell catalogue

The first run loads 110 Rockwell models from the 2026 dealer price list, plus four
service items. Prices are stored **GST-exclusive**: the sheet's MRP and dealer price
are divided by 1.18, so billing one unit at the sale rate plus 18% GST lands exactly
on the printed MRP. The sheet's own MRP and dealer price are kept on each item and
shown on the Items screen.

Twelve rows need a human decision before they are billed — models with no MRP, the
hot and ambient showcases that are not refrigerating equipment and so carry no 8418
code, two lithium batteries, and one row where the printed MRP sits below the dealer
price. They are listed in `rockwell-items-to-review.csv` and flagged in the app with
an **HSN missing** or **set price** badge.

### Adding the other companies

Items → **Import price list**. Save the supplier's sheet as CSV from Excel, paste or
upload it, check the preview, then import. Column headings are matched loosely:
`model`, `code` and `sku` all mean the same thing, and so do `dp`, `dealer price`
and `cost`. Leave the *prices include GST* box ticked for a normal Indian price list.

Re-importing the same file updates those items in place rather than duplicating them,
matched on brand plus model code — so a yearly price revision is one upload.
Stock is never touched by an import.

### Logging in

The first run creates the database and seeds a demo shop.

| Role | Phone | Password |
| --- | --- | --- |
| Owner | 9000000000 | 1234 |
| Counter staff | 9000000001 | 1234 |

**Change both passwords in Settings before anyone bills a real customer.**

### Using it from the phone on the shop wi-fi

Start it with `npm start`, find the PC's local IP (`ipconfig` on Windows,
`ifconfig` on Mac), and open `http://THAT-IP:3000` on the phone.
Both devices must be on the same wi-fi.

---

## Before the first real invoice

1. **Settings → Business profile.** Put in the real trade name, address, GSTIN,
   state and bank details. All of it prints on the bill.
2. **Settings → Invoice numbering.** If the shop is already at INV/26-27/0318,
   set *last number* to 318. Bill Nova continues from 319 rather than restarting.
3. **Settings → Users.** Change both passwords. Add the real staff.
4. **Items.** The Rockwell catalogue is already loaded. Set real opening stock
   (the price list says nothing about stock, so everything starts at zero), import
   the other companies' price lists, and work through
   `rockwell-items-to-review.csv`. Confirm the HSN codes with the CA.
5. **Parties.** Add real customers with their opening balances — what they
   already owed on the day you switch over.
6. Print one test invoice and **show it to the CA before going live.**

---

## Backups

Everything lives in one file: `data/billnova.db`.

- Copy that file somewhere safe every single day.
- Settings has a **Download database backup** button that checkpoints the
  write-ahead log first, so the copy is complete.
- Once a month, restore last night's backup into a fresh folder, start the app
  against it and open an old bill. A backup you have never restored is not a
  backup, it is a hope.

To restore: stop the app, replace `data/billnova.db` with the backup, delete any
`billnova.db-wal` and `billnova.db-shm` files beside it, and start again.

---

## How it is built

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15, App Router, server actions |
| Language | TypeScript |
| Database | SQLite through Node's built-in `node:sqlite` — no native build step |
| Styling | Hand-written CSS with light and dark themes |
| Auth | Phone + password, scrypt hashes, signed session cookie |

### The files that matter

```
src/lib/schema.sql     every table, and two views that derive balances
src/lib/money.ts       paise maths, GST computation, rounding, amount in words
src/lib/gst.ts         state codes, CGST/SGST vs IGST rule, HSN print rules
src/lib/db.ts          connection, transactions, invoice numbering, seed data
src/lib/actions.ts     every write, each wrapped in one transaction
src/lib/queries.ts     every read
src/app/               the screens
```

### Three rules the code keeps

**Balances are never stored.** There is no `outstanding` column on a party and no
`stock_on_hand` column on an item. What someone owes is the sum of their ledger
rows; stock is the sum of the stock ledger. A stored balance and a ledger will
disagree eventually, and then you cannot tell which one lied.

**Nothing is ever deleted.** A wrong bill is cancelled: its status changes,
reversing ledger and stock rows are written, and the number stays in the
sequence because the law requires it.

**The invoice number is taken inside the transaction that writes the invoice.**
Read it beforehand in application code and two staff billing at the same second
will produce the same number.

---

## Tests

```bash
node mathtest.mjs     # money, GST split, rounding, financial year
node e2e.mjs          # drives a real browser through login, billing, ledger, stock
```

The end-to-end test needs the app running on the port set at the top of the file.

---

## Not built yet

e-Invoice IRN and QR generation (only mandatory above ₹5 crore turnover — the
invoice table already has the columns), e-way bill generation, automatic GSTR
filing, barcode scanning, multiple branches, and service/AMC/warranty tracking.

Service and warranty tracking is the obvious next step for a fridge business,
and the place where Bill Nova can beat Vyapar for this particular shop.

---

## Notes on GST

Rates and thresholds were checked on 21 September 2026. Commercial refrigeration
equipment is at 18% under HSN heading 8418; repair and maintenance of commercial
machinery is SAC 998717 at 18%. HSN is printed at 4 digits up to ₹5 crore
turnover and 6 above, set in Settings.

GST rules change. Have the CA confirm rates and the invoice format once before
going live, and again at the start of each financial year.
