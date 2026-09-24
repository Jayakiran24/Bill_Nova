import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import Shell from '@/components/Shell';
import { currentUser } from '@/lib/auth';
import { getBusiness, getParty, partyLedger, openBillsForParty } from '@/lib/queries';
import { savePaymentForm } from '@/lib/actions';
import Flash from '@/components/Flash';
import { formatMoney, formatDate, todayISO, toRupees } from '@/lib/money';
import { stateName } from '@/lib/gst';

export const dynamic = 'force-dynamic';

export default async function PartyPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const sp = await searchParams;
  const user = await currentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const party = getParty(Number(id));
  if (!party) notFound();

  const business = getBusiness(user.business_id);
  const ledger = partyLedger(party.id);
  const open = openBillsForParty(party.id);

  let running = party.opening_balance;
  const rows = ledger.map((l) => {
    running += l.debit - l.credit;
    return { ...l, running };
  });

  const waPhone = (party.phone || '').replace(/\D/g, '');
  const waTo = waPhone.length === 10 ? `91${waPhone}` : waPhone;
  const reminder = `Dear ${party.name},\n\nOur records show an outstanding balance of ${formatMoney(party.balance)} with ${business.name}.\n\nKindly arrange payment at your convenience.${business.upi_id ? `\nUPI: ${business.upi_id}` : ''}\n\nThank you.`;

  return (
    <Shell user={user} businessName={business.name}>
      <Flash ok={sp.ok} err={sp.err} />
      <div className="page-head">
        <h1>{party.name}</h1>
        <span className="spacer" />
        <Link href="/parties" className="btn">← Parties</Link>
        {party.balance > 0 && waTo && (
          <a className="btn primary" target="_blank" rel="noopener"
             href={`https://wa.me/${waTo}?text=${encodeURIComponent(reminder)}`}>
            Send reminder
          </a>
        )}
      </div>

      <div className="stats" style={{ marginBottom: 16 }}>
        <div className="stat" style={{ gridColumn: 'span 1' }}>
          <div className="label">Balance</div>
          <div className="value" style={{ color: party.balance > 0 ? 'var(--danger)' : 'var(--ok)' }}>
            {formatMoney(party.balance)}
          </div>
          <div className="sub">{party.balance > 0 ? 'they owe us' : party.balance < 0 ? 'we owe them' : 'settled'}</div>
        </div>
        <div className="stat">
          <div className="label">Phone</div>
          <div className="value" style={{ fontSize: 17 }}>{party.phone || '—'}</div>
        </div>
        <div className="stat">
          <div className="label">GSTIN</div>
          <div className="value mono" style={{ fontSize: 14 }}>{party.gstin || '—'}</div>
          <div className="sub">{stateName(party.state_code)}</div>
        </div>
        <div className="stat">
          <div className="label">Open bills</div>
          <div className="value">{open.length}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">Record a payment</div>
        <div className="card-body">
          <form action={savePaymentForm}>
            <input type="hidden" name="party_id" value={party.id} />
            <input type="hidden" name="_back" value={`/parties/${party.id}`} />
            <div className="grid3">
              <label className="field">
                <span>Direction</span>
                <select name="type" defaultValue={party.balance >= 0 ? 'in' : 'out'}>
                  <option value="in">Received from party</option>
                  <option value="out">Paid to party</option>
                </select>
              </label>
              <label className="field">
                <span>Amount (₹)</span>
                <input name="amount" inputMode="decimal" required
                       defaultValue={party.balance > 0 ? toRupees(party.balance) : ''} />
              </label>
              <label className="field">
                <span>Mode</span>
                <select name="mode">
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </select>
              </label>
              <label className="field"><span>Date</span><input type="date" name="date" defaultValue={todayISO()} /></label>
              <label className="field"><span>Reference</span><input name="reference" placeholder="UTR, cheque no…" /></label>
            </div>
            <button className="btn primary" type="submit">Save payment</button>
            <div className="faint" style={{ marginTop: 6 }}>
              The amount is applied to the oldest open bills first.
            </div>
          </form>
        </div>
      </div>

      {open.length > 0 && (
        <div className="card">
          <div className="card-head">Open bills</div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Number</th><th>Date</th><th className="num">Total</th><th className="num">Due</th></tr>
              </thead>
              <tbody>
                {open.map((b) => (
                  <tr key={b.id}>
                    <td className="mono"><Link href={`/invoices/${b.id}`}>{b.number}</Link></td>
                    <td className="dim">{formatDate(b.date)}</td>
                    <td className="num">{formatMoney(b.grand_total)}</td>
                    <td className="num strong" style={{ color: 'var(--danger)' }}>{formatMoney(b.due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">Ledger</div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th><th>Particulars</th>
                <th className="num">Debit</th><th className="num">Credit</th><th className="num">Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="dim">—</td>
                <td className="dim">Opening balance</td>
                <td className="num"></td>
                <td className="num"></td>
                <td className="num strong">{formatMoney(party.opening_balance)}</td>
              </tr>
              {rows.map((l, i) => (
                <tr key={i}>
                  <td className="dim">{formatDate(l.date)}</td>
                  <td>{l.narration}</td>
                  <td className="num">{l.debit ? formatMoney(l.debit) : ''}</td>
                  <td className="num">{l.credit ? formatMoney(l.credit) : ''}</td>
                  <td className="num strong">{formatMoney(l.running)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
