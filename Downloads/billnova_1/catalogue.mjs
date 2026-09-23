import { chromium } from 'playwright';
const B = 'http://localhost:3231';
const SHOTS='/tmp/claude-0/-home-claude/f205ba16-ed40-5706-b1ac-64018051fa3c/scratchpad/shots';
let fail = 0;
const check = (l, c, x='') => { if (c) console.log('ok   '+l); else { fail++; console.log('FAIL '+l+' '+x); } };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
page.on('pageerror', e => console.log('PAGE ERROR:', e.message));

await page.goto(`${B}/login`);
await page.fill('input[name=phone]','9000000000');
await page.fill('input[name=password]','1234');
await page.click('button[type=submit]');
await page.waitForURL(`${B}/`, {timeout:15000});

// ---- catalogue loaded ----
await page.goto(`${B}/items`);
const shown = await page.locator('.page-head .faint').first().innerText();
check('114 items loaded (110 Rockwell + 4 services)', shown.includes('114'), `got "${shown}"`);
const brandBar = await page.locator('.row').filter({hasText:'Brand'}).first().innerText();
check('brand filter shows Rockwell 110 and Service 4', /Rockwell\s*110/.test(brandBar) && /Service\s*4/.test(brandBar), brandBar.replace(/\n/g,' '));

// ---- category filter ----
await page.goto(`${B}/items?brand=Rockwell&cat=Visi+Coolers`);
const visiCount = await page.locator('.page-head .faint').first().innerText();
check('Visi Coolers category filters to 17', visiCount.includes('17'), `got "${visiCount}"`);
await page.screenshot({path:`${SHOTS}/10-items-catalogue.png`, fullPage:false});

// ---- prices converted correctly ----
await page.goto(`${B}/items?q=GFRN250SDUC`);
const rowTxt = await page.locator('table.data tbody tr').first().innerText();
check('GFRN250SDUC sale rate is MRP/1.18 = 27,254.24', rowTxt.includes('27,254.24'), rowTxt.replace(/\n/g,' | '));
check('GFRN250SDUC MRP column shows 32,160.00', rowTxt.includes('32,160.00'), '');

// ---- HSN gap flagged ----
await page.goto(`${B}/items?q=RCSH4L3`);
const hotTxt = await page.locator('table.data tbody tr').first().innerText();
check("hot showcase flagged as HSN missing", /HSN MISSING/i.test(hotTxt), hotTxt.replace(/\n/g,' | '));
check("hot showcase has no sale price yet", /SET PRICE/i.test(hotTxt), '');

// ---- THE key test: bill 1 unit, total must equal the printed MRP ----
await page.goto(`${B}/invoices/new`);
await page.fill('input[placeholder="Type 3 letters…"]','Kumar');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
const item = page.locator('input[placeholder="Type item name…"]').first();
await item.fill('GFRN250SDUC');
await page.waitForTimeout(300);
await item.press('Enter');
await page.waitForTimeout(400);
const total = (await page.locator('.sticky-total .amt').innerText()).trim();
check('billing 1 unit lands EXACTLY on the printed MRP of 32,160.00', total === '₹32,160.00', `got "${total}"`);
const hsnVal = await page.locator('table.lines tbody tr').first().locator('input.w-hsn').inputValue();
check('HSN auto-filled from the catalogue', hsnVal === '84183010', `got "${hsnVal}"`);
await page.screenshot({path:`${SHOTS}/11-bill-real-model.png`, fullPage:false});

// ---- model-code search ranks exact code first ----
await item.fill('RVC400');
await page.waitForTimeout(350);
const firstSuggestion = await page.locator('.suggest-list button').first().innerText();
check('typing RVC400 ranks RVC400 first, not RVC400A', /RVC400 -/.test(firstSuggestion), firstSuggestion.replace(/\n/g,' | '));

// ---- import a second company ----
await page.goto(`${B}/items/import`);
const csv = [
 'model,name,brand,category,hsn,unit,gst,mrp,dealer price',
 'BS-VC450,Visi Cooler 450L,Blue Star,Visi Coolers,84185000,PCS,18,59000,41000',
 'BS-DF300,Deep Freezer 300L,Blue Star,Deep Freezers,84183010,PCS,18,35400,24000',
 'BS-INST,Installation Charges,Blue Star,Services,998717,JOB,18,2360,0',
].join('\n');
await page.fill('textarea', csv);
await page.click('button:has-text("Check the file")');
await page.waitForTimeout(1200);
const previewTxt = await page.locator('.card-head').filter({hasText:'Review'}).innerText();
check('dry run reports 3 new, 0 problems', /3 NEW/i.test(previewTxt) && !/problem/i.test(previewTxt), previewTxt.replace(/\n/g,' '));
await page.screenshot({path:`${SHOTS}/12-import-preview.png`, fullPage:false});

await page.click('button:has-text("Import 3 items")');
await page.waitForTimeout(1500);
const doneTxt = await page.locator('.alert.ok').innerText();
check('import confirms 3 new items', /3 new item/.test(doneTxt), doneTxt);

await page.goto(`${B}/items?brand=Blue+Star`);
const bsTxt = await page.locator('table.data').innerText();
check('Blue Star items now listed', bsTxt.includes('BS-VC450') && bsTxt.includes('BS-DF300'));
check('imported MRP 59,000 converted to 50,000.00 sale rate', bsTxt.includes('50,000.00'), bsTxt.split('\n').slice(0,6).join(' | '));

// ---- re-import updates rather than duplicating ----
await page.goto(`${B}/items/import`);
await page.fill('textarea', csv.replace('59000','64900'));
await page.click('button:has-text("Check the file")');
await page.waitForTimeout(1200);
const p2 = await page.locator('.card-head').filter({hasText:'Review'}).innerText();
check('re-import is recognised as 3 updates, not 3 new', /3 UPDATES/i.test(p2), p2.replace(/\n/g,' '));

// ---- bill across two brands ----
await page.goto(`${B}/invoices/new`);
await page.fill('input[placeholder="Type 3 letters…"]','Kumar');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
const i1 = page.locator('input[placeholder="Type item name…"]');
await i1.first().fill('BS-VC450'); await page.waitForTimeout(300); await i1.first().press('Enter');
await page.waitForTimeout(250);
await page.click('button:has-text("+ Add row")');
await page.waitForTimeout(200);
await i1.nth(1).fill('GFRN250SDUC'); await page.waitForTimeout(300); await i1.nth(1).press('Enter');
await page.waitForTimeout(400);
const mixed = (await page.locator('.sticky-total .amt').innerText()).trim();
check('two brands on one bill total 59,000 + 32,160 = 91,160.00', mixed === '₹91,160.00', `got "${mixed}"`);
await page.click('button:has-text("Save Bill")');
await page.waitForURL(/\/invoices\/\d+/, {timeout:15000});
const inv = await page.locator('.invoice-paper').innerText();
check('saved bill prints both model codes', inv.includes('BS-VC450') && inv.includes('GFRN250SDUC'));
await page.screenshot({path:`${SHOTS}/13-two-brand-invoice.png`, fullPage:true});

await browser.close();
console.log(fail === 0 ? '\nALL CATALOGUE CHECKS PASSED' : `\n${fail} FAILURES`);
process.exit(fail?1:0);
