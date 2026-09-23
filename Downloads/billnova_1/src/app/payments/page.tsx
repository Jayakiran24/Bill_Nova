import { redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import { currentUser } from '@/lib/auth';
import { getBusiness, listPayments, listParties } from '@/lib/queries';
import { savePaymentForm } from '@/lib/actions';
import Flash from '@/components/Flash';
import { formatMoney, formatDate, todayISO } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const sp = await searchParams;
  const user = await currentUser();
  if (!user) redirect('/login');

  const business = getBusiness(user.business_id);
  const rows = listPayments(user.business_id);
  const parties = listParties(user.business_id);

  const inTotal = rows.filter((r) => r.type === 'in' && r.status === 'final').reduce((a, r) => a + r.amount, 0);
  const outTotal = rows.filter((r) => r.type === 'out' && r.status === 'final').reduce((a, r) => a + r.amount, 0);

  return (
    <Shell user={user} businessName={business.name}>
      <Flash ok={sp.ok} err={sp.err} />
      <div className="page-head"><h1>Payments</h1></div>

      <div className="stats" style={{ marginBottom: 14 }}>
        <div className="stat ok">
          <div className="label">Money in</div>
          <div className="value">{formatMoney(inTotal)}</div>
        </div>
        <div className="stat">
          <div className="label">Money out</div>
          <div className="value">{formatMoney(outTotal)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">Record a payment</div>
        <div className="card-body">
          <form action={savePaymentForm}>
            <input type="hidden" name="_back" value="/payments" />
            <div className="grid3">
              <label className="field">
                <span>Party</span>
                <select name="party_id" required defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Direction</span>
                <select name="type"><option value="in">Received</option><option value="out">Paid</option></select>
              </label>
              <label className="field"><span>Amount (₹)</span><input name="amount" inputMode="decimal" required /></label>
              <label className="field">
                <span>Mode</span>
                <select name="mode">
                  <option value="cash">Cash</option><option value="upi">UPI</option>
                  <option value="bank">Bank</option><option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </select>
              </label>
              <label className="field"><span>Date</span><input type="date" name="date" defaultValue={todayISO()} /></label>
              <label className="field"><span>Reference</span><input name="reference" /></label>
            </div>
            <button className="btn primary" type="submit">Save payment</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-head">History</div>
        <div className="table-wrap">
          {rows.length === 0 ? (
            <div className="empty">No payments recorded yet.</div>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th>Number</th><th>Date</th><th>Party</th>
                  <th className="hide-sm">Mode</th><th className="hide-sm">Reference</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="mono">{p.number}</td>
                    <td className="dim">{formatDate(p.date)}</td>
                    <td>{p.party_name}</td>
                    <td className="dim hide-sm">{p.mode}</td>
                    <td className="dim hide-sm">{p.reference || '—'}</td>
                    <td className="num strong" style={{ color: p.type === 'in' ? 'var(--ok)' : 'var(--danger)' }}>
                      {p.type === 'in' ? '+' : '−'}{formatMoney(p.amount)}
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
