import Link from 'next/link';
import { redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import { currentUser } from '@/lib/auth';
import { getBusiness, saleRegister, gstSummary, outstandingReport, stockReport } from '@/lib/queries';
import { formatMoney, formatDate, fromQty, todayISO } from '@/lib/money';
import { bpToPercentLabel } from '@/lib/labels';

export const dynamic = 'force-dynamic';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string; from?: string; to?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect('/login');

  const sp = await searchParams;
  const business = getBusiness(user.business_id);
  const today = todayISO();
  const from = sp.from || today.slice(0, 8) + '01';
  const to = sp.to || today;
  const r = sp.r || 'sales';

  const tabs = [
    { key: 'sales', label: 'Sale register' },
    { key: 'gst', label: 'GST summary' },
    { key: 'outstanding', label: 'Outstanding' },
    { key: 'stock', label: 'Stock' },
  ];

  return (
    <Shell user={user} businessName={business.name}>
      <div className="page-head">
        <h1>Reports</h1>
        <span className="spacer" />
        <a className="btn" href={`/api/export?r=${r}&from=${from}&to=${to}`}>Export CSV</a>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        {tabs.map((t) => (
          <Link key={t.key} href={`/reports?r=${t.key}&from=${from}&to=${to}`}
                className={`btn sm ${t.key === r ? 'primary' : ''}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {(r === 'sales' || r === 'gst') && (
        <form className="row" style={{ marginBottom: 14 }}>
          <input type="hidden" name="r" value={r} />
          <label className="field" style={{ marginBottom: 0 }}>
            <span>From</span><input type="date" name="from" defaultValue={from} />
          </label>
          <label className="field" style={{ marginBottom: 0 }}>
            <span>To</span><input type="date" name="to" defaultValue={to} />
          </label>
          <button className="btn" type="submit" style={{ alignSelf: 'end' }}>Apply</button>
        </form>
      )}

      {r === 'sales' && <SaleRegister businessId={user.business_id} from={from} to={to} />}
      {r === 'gst' && <GstSummary businessId={user.business_id} from={from} to={to} />}
      {r === 'outstanding' && <Outstanding businessId={user.business_id} />}
      {r === 'stock' && <Stock businessId={user.business_id} isOwner={user.role === 'owner'} />}
    </Shell>
  );
}

function SaleRegister({ businessId, from, to }: { businessId: number; from: string; to: string }) {
  const rows = saleRegister(businessId, from, to);
  const live = rows.filter((v) => v.status === 'final');
  const total = live.reduce((a, v) => a + v.grand_total, 0);
  const taxable = live.reduce((a, v) => a + v.taxable_value, 0);
  const tax = live.reduce((a, v) => a + v.cgst + v.sgst + v.igst, 0);

  return (
    <>
      <div className="stats" style={{ marginBottom: 14 }}>
        <div className="stat"><div className="label">Bills</div><div className="value">{live.length}</div></div>
        <div className="stat"><div className="label">Taxable value</div><div className="value">{formatMoney(taxable)}</div></div>
        <div className="stat"><div className="label">GST collected</div><div className="value">{formatMoney(tax)}</div></div>
        <div className="stat"><div className="label">Total</div><div className="value">{formatMoney(total)}</div></div>
      </div>
      <div className="card">
        <div className="table-wrap">
          {rows.length === 0 ? <div className="empty">No sales in this period.</div> : (
            <table className="data">
              <thead>
                <tr>
                  <th>Number</th><th>Date</th><th>Party</th><th className="hide-sm">GSTIN</th>
                  <th className="num">Taxable</th><th className="num">CGST</th>
                  <th className="num">SGST</th><th className="num">IGST</th><th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v.id} style={{ opacity: v.status === 'cancelled' ? .45 : 1 }}>
                    <td className="mono"><Link href={`/invoices/${v.id}`}>{v.number}</Link></td>
                    <td className="dim">{formatDate(v.date)}</td>
                    <td>{v.party_name}</td>
                    <td className="mono dim hide-sm">{v.party_gstin || '—'}</td>
                    <td className="num">{formatMoney(v.taxable_value)}</td>
                    <td className="num">{formatMoney(v.cgst)}</td>
                    <td className="num">{formatMoney(v.sgst)}</td>
                    <td className="num">{formatMoney(v.igst)}</td>
                    <td className="num strong">{formatMoney(v.grand_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

function GstSummary({ businessId, from, to }: { businessId: number; from: string; to: string }) {
  const rows = gstSummary(businessId, from, to);
  const t = rows.reduce((a, r) => ({
    taxable: a.taxable + r.taxable_value, cgst: a.cgst + r.cgst,
    sgst: a.sgst + r.sgst, igst: a.igst + r.igst,
  }), { taxable: 0, cgst: 0, sgst: 0, igst: 0 });

  return (
    <div className="card">
      <div className="card-head">HSN-wise summary — the shape a CA wants for GSTR-1</div>
      <div className="table-wrap">
        {rows.length === 0 ? <div className="empty">Nothing in this period.</div> : (
          <table className="data">
            <thead>
              <tr>
                <th>HSN/SAC</th><th className="num">Rate</th><th className="num">Qty</th>
                <th className="num">Taxable</th><th className="num">CGST</th>
                <th className="num">SGST</th><th className="num">IGST</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="mono">{r.hsn_sac || '—'}</td>
                  <td className="num dim">{bpToPercentLabel(r.gst_rate_bp)}</td>
                  <td className="num">{fromQty(r.qty)}</td>
                  <td className="num">{formatMoney(r.taxable_value)}</td>
                  <td className="num">{formatMoney(r.cgst)}</td>
                  <td className="num">{formatMoney(r.sgst)}</td>
                  <td className="num">{formatMoney(r.igst)}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700, background: 'var(--surface-2)' }}>
                <td colSpan={3}>Total</td>
                <td className="num">{formatMoney(t.taxable)}</td>
                <td className="num">{formatMoney(t.cgst)}</td>
                <td className="num">{formatMoney(t.sgst)}</td>
                <td className="num">{formatMoney(t.igst)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Outstanding({ businessId }: { businessId: number }) {
  const rows = outstandingReport(businessId);
  return (
    <div className="card">
      <div className="card-head">Who owes what, largest first</div>
      <div className="table-wrap">
        {rows.length === 0 ? <div className="empty">Everything is settled.</div> : (
          <table className="data">
            <thead><tr><th>Party</th><th className="num">Balance</th><th>Direction</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.party_id}>
                  <td><Link href={`/parties/${p.party_id}`}>{p.name}</Link></td>
                  <td className="num strong" style={{ color: p.balance > 0 ? 'var(--danger)' : 'var(--ok)' }}>
                    {formatMoney(Math.abs(p.balance))}
                  </td>
                  <td className="dim">{p.balance > 0 ? 'they owe us' : 'we owe them'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stock({ businessId, isOwner }: { businessId: number; isOwner: boolean }) {
  const rows = stockReport(businessId);
  const value = rows.reduce((a, r) => a + Math.round((r.stock * r.purchase_price) / 1000), 0);
  return (
    <>
      {isOwner && (
        <div className="stats" style={{ marginBottom: 14 }}>
          <div className="stat"><div className="label">Stock value at cost</div><div className="value">{formatMoney(value)}</div></div>
        </div>
      )}
      <div className="card">
        <div className="table-wrap">
          {rows.length === 0 ? <div className="empty">No stock items.</div> : (
            <table className="data">
              <thead>
                <tr>
                  <th>Item</th><th className="hide-sm">HSN</th><th className="num">On hand</th>
                  {isOwner && <><th className="num">Cost</th><th className="num">Value</th></>}
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id}>
                    <td>{i.name}</td>
                    <td className="mono dim hide-sm">{i.hsn_sac}</td>
                    <td className="num strong">{fromQty(i.stock)} {i.unit}</td>
                    {isOwner && (
                      <>
                        <td className="num dim">{formatMoney(i.purchase_price)}</td>
                        <td className="num">{formatMoney(Math.round((i.stock * i.purchase_price) / 1000))}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
