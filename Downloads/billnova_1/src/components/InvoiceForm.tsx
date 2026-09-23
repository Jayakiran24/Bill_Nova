'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveVoucher, quickAddParty, type LineInputDTO } from '@/lib/actions';
import { computeLine, computeTotals, formatMoney, toPaise, toQty, toRupees } from '@/lib/money';
import { GST_RATES, bpToPercentLabel } from '@/lib/labels';

export interface PartyOpt {
  id: number; name: string; phone: string | null; gstin: string | null; state_code: string | null;
}
export interface ItemOpt {
  id: number; name: string; sku: string | null; brand: string | null; category: string | null;
  hsn_sac: string | null; unit: string; sale_price: number; purchase_price: number;
  mrp: number; gst_rate_bp: number; is_service: number; stock: number;
}

interface Line extends LineInputDTO {
  key: number;
}

let keySeq = 1;
const blankLine = (): Line => ({
  key: keySeq++, itemId: null, description: '', sku: '', hsn: '', unit: 'PCS',
  qty: '1', rate: '', discount: '', gstBp: 1800,
});

export default function InvoiceForm({
  parties, items, businessStateCode, states, type, today,
}: {
  parties: PartyOpt[];
  items: ItemOpt[];
  businessStateCode: string;
  states: { code: string; name: string }[];
  type: 'sales_invoice' | 'estimate' | 'purchase_bill';
  today: string;
}) {
  const router = useRouter();
  const [partyList, setPartyList] = useState(parties);
  const [partyId, setPartyId] = useState<number | null>(null);
  const [partyText, setPartyText] = useState('');
  const [partyOpen, setPartyOpen] = useState(false);
  const [pos, setPos] = useState(businessStateCode);
  const [date, setDate] = useState(today);
  const [lines, setLines] = useState<Line[]>([blankLine()]);
  const [notes, setNotes] = useState('');
  const [transporter, setTransporter] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [paymentNow, setPaymentNow] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const firstItemRef = useRef<HTMLInputElement>(null);

  const isIgst = businessStateCode !== pos;
  const isPurchase = type === 'purchase_bill';

  const computed = useMemo(
    () =>
      lines.map((l) => {
        const base = {
          qty: toQty(l.qty),
          rate: toPaise(l.rate),
          discountAmt: toPaise(l.discount || '0'),
          gstRateBp: l.gstBp,
        };
        return { ...base, ...computeLine(base, isIgst) };
      }),
    [lines, isIgst],
  );

  const totals = useMemo(() => computeTotals(computed), [computed]);

  const partyMatches = partyText.trim()
    ? partyList.filter((p) =>
        p.name.toLowerCase().includes(partyText.toLowerCase()) ||
        (p.phone || '').includes(partyText)).slice(0, 8)
    : partyList.slice(0, 8);

  function pickParty(p: PartyOpt) {
    setPartyId(p.id);
    setPartyText(p.name);
    setPartyOpen(false);
    if (p.state_code) setPos(p.state_code);
    setTimeout(() => firstItemRef.current?.focus(), 30);
  }

  async function addPartyInline() {
    const name = partyText.trim();
    if (!name) return;
    const res = await quickAddParty(name, '', pos);
    if (res.ok) {
      const p: PartyOpt = { id: res.id, name: res.name, phone: null, gstin: null, state_code: pos };
      setPartyList((prev) => [...prev, p]);
      pickParty(p);
    } else {
      setError(res.error);
    }
  }

  function setLine(key: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function pickItem(key: number, it: ItemOpt) {
    setLine(key, {
      itemId: it.id,
      // The name already leads with the model code for catalogue items; don't repeat it.
      description: it.name,
      sku: it.sku || '',
      hsn: it.hsn_sac || '',
      unit: it.unit,
      rate: toRupees(isPurchase ? it.purchase_price || it.sale_price : it.sale_price),
      gstBp: it.gst_rate_bp,
    });
  }

  function addLine() {
    setLines((prev) => [...prev, blankLine()]);
  }

  function removeLine(key: number) {
    setLines((prev) => (prev.length === 1 ? [blankLine()] : prev.filter((l) => l.key !== key)));
  }

  async function submit() {
    setError('');
    if (!partyId) { setError('Choose a customer first.'); return; }
    const usable = lines.filter((l) => l.description.trim() && toQty(l.qty) > 0);
    if (usable.length === 0) { setError('Add at least one item.'); return; }

    setSaving(true);
    const res = await saveVoucher({
      type, date, partyId, placeOfSupplyCode: pos, notes, transporter, vehicleNo,
      paymentNow, paymentMode,
      lines: usable.map(({ key: _key, ...rest }) => rest),
    });
    setSaving(false);

    if (res.ok) {
      router.push(`/invoices/${res.id}?created=1`);
    } else {
      setError(res.error || 'Could not save.');
    }
  }

  const title = type === 'estimate' ? 'New Estimate' : isPurchase ? 'New Purchase Bill' : 'New Invoice';

  return (
    <>
      <div className="page-head">
        <h1>{title}</h1>
        <span className="spacer" />
        <span className={isIgst ? 'badge due' : 'badge ok'}>
          {isIgst ? 'IGST (inter-state)' : 'CGST + SGST'}
        </span>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="card">
        <div className="card-body">
          <div className="grid3">
            <label className="field suggest" style={{ position: 'relative' }}>
              <span>{isPurchase ? 'Supplier' : 'Customer'}</span>
              <input
                value={partyText}
                placeholder="Type 3 letters…"
                autoFocus
                onChange={(e) => { setPartyText(e.target.value); setPartyId(null); setPartyOpen(true); }}
                onFocus={() => setPartyOpen(true)}
                onBlur={() => setTimeout(() => setPartyOpen(false), 180)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && partyMatches.length > 0) {
                    e.preventDefault();
                    pickParty(partyMatches[0]);
                  }
                }}
              />
              {partyOpen && (
                <div className="suggest-list">
                  {partyMatches.map((p) => (
                    <button type="button" key={p.id} onMouseDown={(e) => { e.preventDefault(); pickParty(p); }}>
                      {p.name}
                      <div className="meta">
                        {p.phone || 'no phone'}{p.gstin ? ` · ${p.gstin}` : ''}
                      </div>
                    </button>
                  ))}
                  {partyText.trim() && !partyMatches.some((p) => p.name.toLowerCase() === partyText.trim().toLowerCase()) && (
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); addPartyInline(); }}>
                      <strong>+ Add &ldquo;{partyText.trim()}&rdquo;</strong>
                      <div className="meta">Creates the party without leaving this screen</div>
                    </button>
                  )}
                </div>
              )}
            </label>

            <label className="field">
              <span>Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>

            <label className="field">
              <span>Place of supply</span>
              <select value={pos} onChange={(e) => setPos(e.target.value)}>
                {states.map((s) => (
                  <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          Items
          <span className="spacer" />
          <button type="button" className="btn sm" onClick={addLine}>+ Add row</button>
        </div>
        <div className="table-wrap">
          <table className="lines">
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>Item</th>
                <th className="hide-sm">HSN/SAC</th>
                <th className="num">Qty</th>
                <th className="num">Rate</th>
                <th className="num hide-sm">Disc</th>
                <th className="num">GST</th>
                <th className="num">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <LineRow
                  key={l.key}
                  line={l}
                  computed={computed[idx]}
                  items={items}
                  inputRef={idx === 0 ? firstItemRef : undefined}
                  isLast={idx === lines.length - 1}
                  onChange={(patch) => setLine(l.key, patch)}
                  onPickItem={(it) => pickItem(l.key, it)}
                  onRemove={() => removeLine(l.key)}
                  onAddLine={addLine}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            <div>
              <label className="field">
                <span>Notes on the bill</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                          placeholder="Warranty terms, delivery instructions…" />
              </label>
              <div className="grid2">
                <label className="field">
                  <span>Transporter</span>
                  <input value={transporter} onChange={(e) => setTransporter(e.target.value)} />
                </label>
                <label className="field">
                  <span>Vehicle number</span>
                  <input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} />
                </label>
              </div>
              {totals.grandTotal > 5000000 && (
                <div className="alert info" style={{ fontSize: 13 }}>
                  Over ₹50,000 — an e-way bill is normally required for this movement.
                  Raise it on the government portal using the transporter details above.
                </div>
              )}
            </div>

            <div>
              <div className="totals">
                <div><span>Taxable value</span><span className="num">{formatMoney(totals.taxableValue)}</span></div>
                {isIgst ? (
                  <div><span>IGST</span><span className="num">{formatMoney(totals.igst)}</span></div>
                ) : (
                  <>
                    <div><span>CGST</span><span className="num">{formatMoney(totals.cgst)}</span></div>
                    <div><span>SGST</span><span className="num">{formatMoney(totals.sgst)}</span></div>
                  </>
                )}
                {totals.roundOff !== 0 && (
                  <div><span>Round off</span><span className="num">{formatMoney(totals.roundOff)}</span></div>
                )}
                <div className="grand"><span>Total</span><span className="num">{formatMoney(totals.grandTotal)}</span></div>
              </div>

              {type !== 'estimate' && (
                <div className="grid2" style={{ marginTop: 14 }}>
                  <label className="field">
                    <span>{isPurchase ? 'Paid now' : 'Received now'}</span>
                    <input inputMode="decimal" value={paymentNow} placeholder="0.00"
                           onChange={(e) => setPaymentNow(e.target.value)} />
                  </label>
                  <label className="field">
                    <span>Mode</span>
                    <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="bank">Bank</option>
                      <option value="cheque">Cheque</option>
                      <option value="card">Card</option>
                    </select>
                  </label>
                  {toPaise(paymentNow || '0') > 0 && (
                    <div className="faint" style={{ gridColumn: '1 / -1', marginTop: -6 }}>
                      Balance after this payment:{' '}
                      <strong>{formatMoney(totals.grandTotal - toPaise(paymentNow || '0'))}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="sticky-total no-print">
        <div>
          <div className="faint">Total payable</div>
          <div className="amt">{formatMoney(totals.grandTotal)}</div>
        </div>
        <span className="spacer" style={{ flex: 1 }} />
        <button className="btn" type="button" onClick={() => router.back()}>Cancel</button>
        <button className="btn primary big" type="button" onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : `Save ${type === 'estimate' ? 'Estimate' : 'Bill'}`}
        </button>
      </div>
    </>
  );
}

function LineRow({
  line, computed, items, onChange, onPickItem, onRemove, onAddLine, inputRef, isLast,
}: {
  line: Line;
  computed: { taxableValue: number; cgst: number; sgst: number; igst: number; lineTotal: number };
  items: ItemOpt[];
  onChange: (patch: Partial<Line>) => void;
  onPickItem: (it: ItemOpt) => void;
  onRemove: () => void;
  onAddLine: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  isLast: boolean;
}) {
  const [open, setOpen] = useState(false);

  // Staff usually type the model code, so it is searched first and weighted highest.
  const q = line.description.trim().toLowerCase();
  const matches = q
    ? items
        .map((i) => {
          const sku = (i.sku || '').toLowerCase();
          const name = i.name.toLowerCase();
          let score = -1;
          if (sku.startsWith(q)) score = 0;
          else if (name.startsWith(q)) score = 1;
          else if (sku.includes(q)) score = 2;
          else if (name.includes(q)) score = 3;
          else if ((i.hsn_sac || '').includes(q)) score = 4;
          else if ((i.category || '').toLowerCase().includes(q)) score = 5;
          return { i, score };
        })
        .filter((m) => m.score >= 0)
        .sort((a, b) => a.score - b.score)
        .slice(0, 8)
        .map((m) => m.i)
    : items.slice(0, 8);

  return (
    <tr>
      <td>
        <div className="suggest" style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            value={line.description}
            placeholder="Type item name…"
            onChange={(e) => { onChange({ description: e.target.value, itemId: null }); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 180)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matches.length > 0 && !line.itemId) {
                e.preventDefault();
                onPickItem(matches[0]);
                setOpen(false);
              }
            }}
          />
          {open && matches.length > 0 && (
            <div className="suggest-list">
              {matches.map((it) => (
                <button type="button" key={it.id}
                        onMouseDown={(e) => { e.preventDefault(); onPickItem(it); setOpen(false); }}>
                  {it.name}
                  <div className="meta">
                    {it.sku ? `${it.sku} · ` : ''}{it.hsn_sac || 'no HSN'} · {formatMoney(it.sale_price)} + {bpToPercentLabel(it.gst_rate_bp)}
                    {it.mrp > 0 ? ` · MRP ${formatMoney(it.mrp)}` : ''}
                    {it.is_service ? ' · service' : ` · stock ${(it.stock / 1000).toFixed(0)} ${it.unit}`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="hide-sm">
        <input className="w-hsn" value={line.hsn} onChange={(e) => onChange({ hsn: e.target.value })} />
      </td>
      <td>
        <input className="w-qty num" inputMode="decimal" value={line.qty}
               onChange={(e) => onChange({ qty: e.target.value })} />
      </td>
      <td>
        <input className="w-rate num" inputMode="decimal" value={line.rate} placeholder="0.00"
               onChange={(e) => onChange({ rate: e.target.value })} />
      </td>
      <td className="hide-sm">
        <input className="w-qty num" inputMode="decimal" value={line.discount} placeholder="0"
               onChange={(e) => onChange({ discount: e.target.value })} />
      </td>
      <td>
        <select className="w-tax" value={line.gstBp} onChange={(e) => onChange({ gstBp: Number(e.target.value) })}>
          {GST_RATES.map((bp) => (
            <option key={bp} value={bp}>{bpToPercentLabel(bp)}</option>
          ))}
        </select>
      </td>
      <td className="num strong" style={{ paddingRight: 10 }}>{formatMoney(computed.lineTotal)}</td>
      <td>
        <div style={{ display: 'flex', gap: 4 }}>
          {isLast && (
            <button type="button" className="btn sm" onClick={onAddLine} title="Add row">+</button>
          )}
          <button type="button" className="btn sm danger" onClick={onRemove} title="Remove row">×</button>
        </div>
      </td>
    </tr>
  );
}
