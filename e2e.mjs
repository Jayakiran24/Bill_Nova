import { chromium } from 'playwright';

const SHOTS = '/tmp/claude-0/-home-claude/f205ba16-ed40-5706-b1ac-64018051fa3c/scratchpad/shots';
const B = 'http://localhost:3232';
let fail = 0;
const check = (label, cond, extra='') => {
  if (cond) console.log(`ok   ${label}`);
  else { fail++; console.log(`FAIL ${label} ${extra}`); }
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', e => console.log('PAGE ERROR:', e.message));

// ---------- login ----------
await page.goto(`${B}/login`);
await page.fill('input[name=phone]', '9000000000');
await page.fill('input[name=password]', '1234');
await page.click('button[type=submit]');
await page.waitForURL(`${B}/`, { timeout: 15000 });
check('logged in and landed on dashboard', page.url() === `${B}/`);
await page.screenshot({ path: `${SHOTS}/01-dashboard.png`, fullPage: true });

// ---------- intra-state invoice (CGST + SGST) ----------
await page.goto(`${B}/invoices/new`);
await page.fill('input[placeholder="Type 3 letters…"]', 'Kumar');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);

const itemInputs = page.locator('input[placeholder="Type item name…"]');
await itemInputs.first().fill('GFRN250SDUC');
await page.waitForTimeout(250);
await itemInputs.first().press('Enter');
await page.waitForTimeout(250);

// qty -> 2
const qtyInputs = page.locator('table.lines tbody tr input.w-qty').first();
await qtyInputs.fill('2');
await page.waitForTimeout(200);

// add a service line
await page.click('button:has-text("+ Add row")');
await page.waitForTimeout(200);
await itemInputs.nth(1).fill('Installation');
await page.waitForTimeout(250);
await itemInputs.nth(1).press('Enter');
await page.waitForTimeout(300);

const badge = await page.locator('.page-head .badge').first().innerText();
check('intra-state shows CGST + SGST', badge.includes('CGST'), `got "${badge}"`);

const totalTxt = await page.locator('.sticky-total .amt').innerText();
// 2 x 27,254.24 + 2,500 installation, +18% GST, rounded once = 67,270.00
check('running total is ₹67,270.00', totalTxt.trim() === '₹67,270.00', `got "${totalTxt}"`);

await page.screenshot({ path: `${SHOTS}/02-new-invoice.png`, fullPage: true });

await page.click('button:has-text("Save Bill")');
await page.waitForURL(/\/invoices\/\d+/, { timeout: 15000 });
check('saved and redirected to the bill', /\/invoices\/\d+/.test(page.url()));

const body = await page.locator('.invoice-paper').innerText();
check('invoice shows CGST column', body.includes('CGST'));
check('invoice shows supplier GSTIN', body.includes('36ABCDE1234F1Z5'));
check('invoice total printed', body.includes('67,270.00'), '');
check('amount in words present', /Sixty Seven Thousand Two Hundred Seventy Rupees Only/.test(body), body.match(/Amount in words:[^\n]*/)?.[0]);
check('invoice number format INV/26-27/0001', body.includes('INV/26-27/0001'));
check('HSN printed at 4 digits', body.includes('8418'));
await page.screenshot({ path: `${SHOTS}/03-invoice-print.png`, fullPage: true });

// ---------- stock moved ----------
await page.goto(`${B}/items`);
const itemsTxt = await page.locator('table.data').innerText();
check('stock went 0 -> -2 after selling 2 with none in stock', /-2 PCS/.test(itemsTxt), itemsTxt.split('\n').find(l=>l.includes('GFRN250SDUC')));

// ---------- party ledger ----------
await page.goto(`${B}/parties`);
const partiesTxt = await page.locator('table.data').innerText();
check('Kumar Hotels now shows a balance', /Kumar Hotels/.test(partiesTxt) && /67,270/.test(partiesTxt));
await page.screenshot({ path: `${SHOTS}/04-parties.png`, fullPage: true });

const kumarLink = page.locator('table.data a', { hasText: 'Kumar Hotels' });
await kumarLink.click();
await page.waitForURL(/\/parties\/\d+/);
const ledgerTxt = await page.locator('table.data').last().innerText();
check('ledger has the invoice row', ledgerTxt.includes('Invoice INV/26-27/0001'));
check('ledger running balance correct', ledgerTxt.includes('67,270.00'));
await page.screenshot({ path: `${SHOTS}/05-party-ledger.png`, fullPage: true });

// ---------- part payment ----------
await page.selectOption('select[name=type]', 'in');
await page.fill('input[name=amount]', '50000');
await page.selectOption('select[name=mode]', 'upi');
await page.click('button:has-text("Save payment")');
await page.waitForTimeout(1200);
const afterPay = await page.locator('.stats').innerText();
check('balance after ₹50,000 part payment is ₹17,270', afterPay.includes('17,270.00'), afterPay.split('\n').slice(0,3).join(' | '));

// ---------- inter-state invoice (IGST) ----------
await page.goto(`${B}/invoices/new`);
await page.fill('input[placeholder="Type 3 letters…"]', 'Chennai');
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
const badge2 = await page.locator('.page-head .badge').first().innerText();
check('inter-state switches to IGST', badge2.includes('IGST'), `got "${badge2}"`);

await page.locator('input[placeholder="Type item name…"]').first().fill('SFRN250GT');
await page.waitForTimeout(250);
await page.locator('input[placeholder="Type item name…"]').first().press('Enter');
await page.waitForTimeout(300);
const igstTotal = await page.locator('.sticky-total .amt').innerText();
// one unit at the exclusive rate + 18% must land on the printed MRP
check('IGST total equals the printed MRP ₹32,849.00', igstTotal.trim() === '₹32,849.00', `got "${igstTotal}"`);
await page.click('button:has-text("Save Bill")');
await page.waitForURL(/\/invoices\/\d+/, { timeout: 15000 });
const igstBody = await page.locator('.invoice-paper').innerText();
check('IGST invoice prints IGST not CGST', igstBody.includes('IGST') && !igstBody.includes('CGST'));
check('second invoice number is 0002', igstBody.includes('INV/26-27/0002'));

// ---------- reports ----------
await page.goto(`${B}/reports?r=gst`);
const gstTxt = await page.locator('table.data').innerText();
check('GST summary groups by HSN', gstTxt.includes('84183010') && gstTxt.includes('998717'));
await page.screenshot({ path: `${SHOTS}/06-gst-report.png`, fullPage: true });

// ---------- staff role hides cost ----------
const ctx2 = await browser.newContext();
const staff = await ctx2.newPage();
await staff.goto(`${B}/login`);
await staff.fill('input[name=phone]', '9000000001');
await staff.fill('input[name=password]', '1234');
await staff.click('button[type=submit]');
await staff.waitForURL(`${B}/`, { timeout: 15000 });
await staff.goto(`${B}/items`);
const staffItems = await staff.locator('table.data').innerText();
check('staff cannot see cost price', !staffItems.includes('19,915.25'));
const staffSettings = await staff.goto(`${B}/settings`);
check('staff blocked from settings', (await staff.locator('.alert').innerText()).includes('Only the owner'));

// ---------- mobile view ----------
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
const mp = await m.newPage();
await mp.goto(`${B}/login`);
await mp.fill('input[name=phone]', '9000000000');
await mp.fill('input[name=password]', '1234');
await mp.click('button[type=submit]');
await mp.waitForURL(`${B}/`);
await mp.screenshot({ path: `${SHOTS}/07-mobile-dashboard.png`, fullPage: true });
const hasScrollX = await mp.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
check('no horizontal scroll on phone', !hasScrollX);
await mp.goto(`${B}/invoices/new`);
await mp.screenshot({ path: `${SHOTS}/08-mobile-invoice.png`, fullPage: true });

await browser.close();
console.log(fail === 0 ? '\nALL E2E CHECKS PASSED' : `\n${fail} E2E FAILURES`);
process.exit(fail ? 1 : 0);
