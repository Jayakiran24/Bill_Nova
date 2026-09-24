import Link from 'next/link';
import { redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import { currentUser } from '@/lib/auth';
import { getBusiness, listVouchers } from '@/lib/queries';
import { formatMoney, formatDate } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; unpaid?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect('/login');

  const sp = await searchParams;
  const type = sp.type || 'sales_invoice';
  const business = getBusiness(user.business_id);
  const rows = listVouchers(user.business_id, type, {
    search: sp.q, unpaidOnly: sp.unpaid === '1',
  });

  const tabs = [
    { key: 'sales_invoice', label: 'Invoices' },
    { key: 'estimate', label: 'Estimates' },
    { key: 'purchase_bill', label: 'Purchases' },
  ];

  const total = rows.reduce((a, r) => a + (r.status === 'cancelled' ? 0 : r.grand_total), 0);
  const due = rows.reduce((a, r) => a + r.due, 0);

  return (
    <Shell user={user} businessName={business.name}>
      <div className="page-head">
        <h1>{tabs.find((t) => t.key === type)?.label}</h1>
        <span className="spacer" />
        <Link href={`/invoices/new?type=${type}`} className="btn primary">+ New</Link>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        {tabs.map((t) => (
          <Link key={t.key} href={`/invoices?type=${t.key}`}
                className={`btn sm ${t.key === type ? 'primary' : ''}`}>
            {t.label}
          </Link>
        ))}
        <span className="spacer" style={{ flex: 1 }} />
        <Link href={`/invoices?type=${type}&unpaid=${sp.unpaid === '1' ? '0' : '1'}`}
              className={`btn sm ${sp.unpaid === '1' ? 'primary' : ''}`}>
          Unpaid only
        </Link>
      </div>

      <form className="row" style={{ marginBottom: 14 }}>
        <input type="hidden" name="type" value={type} />
        <input name="q" defaultValue={sp.q || ''} placeholder="Search number or party…"
               style={{ maxWidth: 320 }} />
        <button className="btn" type="submit">Search</button>
      </form>

      <div className="stats" style={{ marginBottom: 14 }}>
        <div className="stat">
          <div className="label">Showing</div>
          <div className="value">{rows.length}</div>
        </div>
        <div className="stat">
          <div className="label">Value</div>
          <div className="value">{formatMoney(total)}</div>
        </div>
        <div className="stat danger">
          <div className="label">Outstanding</div>
          <div className="value">{formatMoney(due)}</div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          {rows.length === 0 ? (
            <div className="empty">
              Nothing here yet. <Link href={`/invoices/new?type=${type}`}>Create one</Link>.
            </div>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Date</th>
                  <th>Party</th>
                  <th className="num">Total</th>
                  <th className="num hide-sm">Paid</th>
                  <th className="num">Due</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v.id}>
                    <td className="mono"><Link href={`/invoices/${v.id}`}>{v.number}</Link></td>
                    <td className="dim">{formatDate(v.date)}</td>
                    <td>{v.party_name}</td>
                    <td className="num strong">{formatMoney(v.grand_total)}</td>
                    <td className="num dim hide-sm">{formatMoney(v.paid)}</td>
                    <td className="num" style={{ color: v.due > 0 ? 'var(--danger)' : 'var(--text-faint)' }}>
                      {formatMoney(v.due)}
                    </td>
                    <td>
                      {v.status === 'cancelled' ? <span className="badge cancelled">Cancelled</span>
                        : v.status === 'draft' ? <span className="badge draft">Draft</span>
                        : v.due <= 0 ? <span className="badge ok">Paid</span>
                        : <span className="badge due">Due</span>}
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
