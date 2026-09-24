import Link from 'next/link';
import { redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import { currentUser } from '@/lib/auth';
import { dashboard, getBusiness, lowStockItems } from '@/lib/queries';
import { formatMoney, formatDate, fromQty } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await currentUser();
  if (!user) redirect('/login');

  const business = getBusiness(user.business_id);
  const d = dashboard(user.business_id);
  const low = lowStockItems(user.business_id).slice(0, 5);

  return (
    <Shell user={user} businessName={business.name}>
      <div className="page-head">
        <h1>Today</h1>
        <span className="faint">{formatDate(d.today)}</span>
        <span className="spacer" />
        <Link href="/invoices/new" className="btn primary big">+ New Invoice</Link>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="label">Today&rsquo;s sales</div>
          <div className="value">{formatMoney(d.todaySales.n)}</div>
          <div className="sub">{d.todaySales.c} bill{d.todaySales.c === 1 ? '' : 's'}</div>
        </div>
        <div className="stat ok">
          <div className="label">Collected today</div>
          <div className="value">{formatMoney(d.todayCollected)}</div>
          <div className="sub">cash, UPI and bank</div>
        </div>
        <div className="stat danger">
          <div className="label">To receive</div>
          <div className="value">{formatMoney(d.receivable)}</div>
          <div className="sub">from all customers</div>
        </div>
        <div className="stat">
          <div className="label">To pay</div>
          <div className="value">{formatMoney(d.payable)}</div>
          <div className="sub">to all suppliers</div>
        </div>
        <div className="stat">
          <div className="label">This month</div>
          <div className="value">{formatMoney(d.monthSales.n)}</div>
          <div className="sub">{d.monthSales.c} bills</div>
        </div>
        <div className="stat">
          <div className="label">Low stock</div>
          <div className="value">{d.lowStock}</div>
          <div className="sub">items at or below level</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          Recent bills
          <span className="spacer" />
          <Link href="/invoices" className="btn sm">See all</Link>
        </div>
        <div className="table-wrap">
          {d.recent.length === 0 ? (
            <div className="empty">
              No bills yet. <Link href="/invoices/new">Make the first one</Link>.
            </div>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Date</th>
                  <th>Party</th>
                  <th className="num">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {d.recent.map((v) => (
                  <tr key={v.id}>
                    <td className="mono">
                      <Link href={`/invoices/${v.id}`}>{v.number}</Link>
                    </td>
                    <td className="dim">{formatDate(v.date)}</td>
                    <td>{v.party_name}</td>
                    <td className="num strong">{formatMoney(v.grand_total)}</td>
                    <td>
                      {v.status === 'cancelled' && <span className="badge cancelled">Cancelled</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginTop: 16 }}>
        <div className="card" style={{ marginTop: 0 }}>
          <div className="card-head">Who owes the most</div>
          <div className="table-wrap">
            {d.topDebtors.length === 0 ? (
              <div className="empty">Nobody owes anything.</div>
            ) : (
              <table className="data">
                <tbody>
                  {d.topDebtors.map((p) => (
                    <tr key={p.party_id}>
                      <td><Link href={`/parties/${p.party_id}`}>{p.name}</Link></td>
                      <td className="num strong" style={{ color: 'var(--danger)' }}>
                        {formatMoney(p.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card" style={{ marginTop: 0 }}>
          <div className="card-head">Running low</div>
          <div className="table-wrap">
            {low.length === 0 ? (
              <div className="empty">Stock levels are fine.</div>
            ) : (
              <table className="data">
                <tbody>
                  {low.map((i) => (
                    <tr key={i.id}>
                      <td>{i.name}</td>
                      <td className="num">
                        <span className="strong" style={{ color: 'var(--danger)' }}>{fromQty(i.stock)}</span>
                        <span className="faint"> / {fromQty(i.low_stock_level)} {i.unit}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
