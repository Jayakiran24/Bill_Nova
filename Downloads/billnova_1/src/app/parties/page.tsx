import Link from 'next/link';
import { redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import { currentUser } from '@/lib/auth';
import { getBusiness, listParties } from '@/lib/queries';
import { savePartyForm } from '@/lib/actions';
import Flash from '@/components/Flash';
import { formatMoney } from '@/lib/money';
import { STATE_CODES } from '@/lib/gst';

export const dynamic = 'force-dynamic';

export default async function PartiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ok?: string; err?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect('/login');

  const sp = await searchParams;
  const business = getBusiness(user.business_id);
  const rows = listParties(user.business_id, sp.q || '');

  const receivable = rows.filter((r) => r.balance > 0).reduce((a, r) => a + r.balance, 0);
  const payable = rows.filter((r) => r.balance < 0).reduce((a, r) => a - r.balance, 0);

  return (
    <Shell user={user} businessName={business.name}>
      <Flash ok={sp.ok} err={sp.err} />
      <div className="page-head">
        <h1>Parties</h1>
        <span className="faint">{rows.length} active</span>
      </div>

      <div className="stats" style={{ marginBottom: 14 }}>
        <div className="stat danger">
          <div className="label">To receive</div>
          <div className="value">{formatMoney(receivable)}</div>
        </div>
        <div className="stat">
          <div className="label">To pay</div>
          <div className="value">{formatMoney(payable)}</div>
        </div>
      </div>

      <form className="row" style={{ marginBottom: 14 }}>
        <input name="q" defaultValue={sp.q || ''} placeholder="Search name or phone…" style={{ maxWidth: 320 }} />
        <button className="btn" type="submit">Search</button>
      </form>

      <details className="card" style={{ marginBottom: 14 }}>
        <summary className="card-head" style={{ cursor: 'pointer', listStyle: 'none' }}>
          + Add a party
        </summary>
        <div className="card-body">
          <form action={savePartyForm}>
            <input type="hidden" name="_back" value="/parties" />
            <div className="grid3">
              <label className="field"><span>Name</span><input name="name" required /></label>
              <label className="field">
                <span>Type</span>
                <select name="type">
                  <option value="customer">Customer</option>
                  <option value="supplier">Supplier</option>
                  <option value="both">Both</option>
                </select>
              </label>
              <label className="field"><span>Phone</span><input name="phone" inputMode="numeric" /></label>
              <label className="field"><span>GSTIN</span><input name="gstin" style={{ textTransform: 'uppercase' }} /></label>
              <label className="field">
                <span>State</span>
                <select name="state_code" defaultValue={business.state_code}>
                  {STATE_CODES.map((s) => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
                </select>
              </label>
              <label className="field"><span>Opening balance (₹)</span><input name="opening_balance" inputMode="decimal" placeholder="0.00" /></label>
            </div>
            <label className="field"><span>Billing address</span><textarea name="billing_address" /></label>
            <button className="btn primary" type="submit">Save party</button>
          </form>
        </div>
      </details>

      <div className="card">
        <div className="table-wrap">
          {rows.length === 0 ? (
            <div className="empty">No parties found.</div>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="hide-sm">Phone</th>
                  <th className="hide-sm">GSTIN</th>
                  <th>Type</th>
                  <th className="num">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td><Link href={`/parties/${p.id}`}>{p.name}</Link></td>
                    <td className="dim hide-sm">{p.phone || '—'}</td>
                    <td className="mono dim hide-sm">{p.gstin || '—'}</td>
                    <td className="dim">{p.type}</td>
                    <td className="num strong"
                        style={{ color: p.balance > 0 ? 'var(--danger)' : p.balance < 0 ? 'var(--ok)' : 'var(--text-faint)' }}>
                      {formatMoney(p.balance)}
                      <div className="faint">{p.balance > 0 ? 'they owe' : p.balance < 0 ? 'we owe' : 'settled'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Shell>
  );
}
