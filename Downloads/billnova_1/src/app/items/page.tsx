import Link from 'next/link';
import { redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import Flash from '@/components/Flash';
import { currentUser } from '@/lib/auth';
import { getBusiness, listItems, listBrands, listCategories } from '@/lib/queries';
import { adjustStockForm, saveItemForm } from '@/lib/actions';
import { formatMoney, fromQty } from '@/lib/money';
import { GST_RATES, UNITS, bpToPercentLabel } from '@/lib/labels';

export const dynamic = 'force-dynamic';

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; brand?: string; cat?: string; ok?: string; err?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect('/login');

  const sp = await searchParams;
  const business = getBusiness(user.business_id);
  const brand = sp.brand || '';
  const cat = sp.cat || '';
  const rows = listItems(user.business_id, sp.q || '', brand, cat);
  const brands = listBrands(user.business_id);
  const cats = listCategories(user.business_id, brand);
  const isOwner = user.role === 'owner';

  const stockValue = rows
    .filter((i) => !i.is_service)
    .reduce((a, i) => a + Math.round((i.stock * i.purchase_price) / 1000), 0);

  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams();
    const merged = { q: sp.q || '', brand, cat, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/items?${s}` : '/items';
  };

  return (
    <Shell user={user} businessName={business.name}>
      <Flash ok={sp.ok} err={sp.err} />
      <div className="page-head">
        <h1>Items</h1>
        <span className="faint">{rows.length} shown</span>
        <span className="spacer" />
        {isOwner && <Link href="/items/import" className="btn primary">Import price list</Link>}
      </div>

      {isOwner && (
        <div className="stats" style={{ marginBottom: 14 }}>
          <div className="stat">
            <div className="label">Stock value at cost</div>
            <div className="value">{formatMoney(stockValue)}</div>
            <div className="sub">for the items shown</div>
          </div>
        </div>
      )}

      <form className="row" style={{ marginBottom: 10 }}>
        {brand && <input type="hidden" name="brand" value={brand} />}
        {cat && <input type="hidden" name="cat" value={cat} />}
        <input name="q" defaultValue={sp.q || ''} placeholder="Search model, name or HSN…" style={{ maxWidth: 320 }} />
        <button className="btn" type="submit">Search</button>
        {(sp.q || brand || cat) && <Link className="btn" href="/items">Clear</Link>}
      </form>

      {brands.length > 0 && (
        <div className="row" style={{ marginBottom: 8 }}>
          <span className="faint" style={{ minWidth: 60 }}>Brand</span>
          <Link href={qs({ brand: '', cat: '' })} className={`btn sm ${brand === '' ? 'primary' : ''}`}>
            All
          </Link>
          {brands.map((b) => (
            <Link key={b.brand} href={qs({ brand: b.brand, cat: '' })}
                  className={`btn sm ${brand === b.brand ? 'primary' : ''}`}>
              {b.brand} <span className="faint">{b.n}</span>
            </Link>
          ))}
        </div>
      )}

      {cats.length > 0 && (
        <div className="row" style={{ marginBottom: 14 }}>
          <span className="faint" style={{ minWidth: 60 }}>Range</span>
          <Link href={qs({ cat: '' })} className={`btn sm ${cat === '' ? 'primary' : ''}`}>All</Link>
          {cats.map((c) => (
            <Link key={c.category} href={qs({ cat: c.category })}
                  className={`btn sm ${cat === c.category ? 'primary' : ''}`}>
              {c.category} <span className="faint">{c.n}</span>
            </Link>
          ))}
        </div>
      )}

      <details className="card" style={{ marginBottom: 14 }}>
        <summary className="card-head" style={{ cursor: 'pointer', listStyle: 'none' }}>
          + Add a single item
        </summary>
        <div className="card-body">
          <form action={saveItemForm}>
            <input type="hidden" name="_back" value="/items" />
            <div className="grid3">
              <label className="field"><span>Name</span><input name="name" required /></label>
              <label className="field"><span>Model code</span><input name="sku" placeholder="GFRN250SDUC" /></label>
              <label className="field">
                <span>Brand</span>
                <input name="brand" list="brandlist" defaultValue={brand} />
                <datalist id="brandlist">
                  {brands.map((b) => <option key={b.brand} value={b.brand} />)}
                </datalist>
              </label>
              <label className="field">
                <span>Category</span>
                <input name="category" list="catlist" defaultValue={cat} />
                <datalist id="catlist">
                  {cats.map((c) => <option key={c.category} value={c.category} />)}
                </datalist>
              </label>
              <label className="field"><span>HSN / SAC</span><input name="hsn_sac" placeholder="84183010" /></label>
              <label className="field">
                <span>Unit</span>
                <select name="unit">{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
              </label>
              <label className="field"><span>Sale rate, before GST (₹)</span><input name="sale_price" inputMode="decimal" /></label>
              <label className="field"><span>Cost rate, before GST (₹)</span><input name="purchase_price" inputMode="decimal" /></label>
              <label className="field">
                <span>GST rate</span>
                <select name="gst_rate_bp" defaultValue={1800}>
                  {GST_RATES.map((bp) => <option key={bp} value={bp}>{bpToPercentLabel(bp)}</option>)}
                </select>
              </label>
              <label className="field"><span>MRP, with GST (₹)</span><input name="mrp" inputMode="decimal" /></label>
              <label className="field"><span>Dealer price, with GST (₹)</span><input name="dealer_price" inputMode="decimal" /></label>
              <label className="field"><span>Quantity in stock</span><input name="opening_stock" inputMode="decimal" placeholder="10" /></label>
              <label className="field"><span>Low stock alert at</span><input name="low_stock_level" inputMode="decimal" placeholder="0" /></label>
              <label className="field" style={{ display: 'flex', alignItems: 'end', gap: 8, paddingBottom: 12 }}>
                <input type="checkbox" name="is_service" style={{ width: 'auto' }} />
                <span style={{ margin: 0, textTransform: 'none', fontSize: 14 }}>This is a service (no stock)</span>
              </label>
            </div>
            <button className="btn primary" type="submit">Save item</button>
          </form>
        </div>
      </details>

      <div className="card">
        <div className="table-wrap">
          {rows.length === 0 ? (
            <div className="empty">No items found.</div>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Name</th>
                  <th className="hide-sm">HSN/SAC</th>
                  <th className="num">Sale rate</th>
                  <th className="num hide-sm">MRP</th>
                  {isOwner && <th className="num hide-sm">Cost</th>}
                  <th className="num">GST</th>
                  <th className="num">Qty in stock</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => {
                  const low = !i.is_service && i.low_stock_level > 0 && i.stock <= i.low_stock_level;
                  return (
                    <tr key={i.id}>
                      <td className="mono">{i.sku || '—'}</td>
                      <td>
                        {i.name.replace(/^[^ ]+ - /, '')}
                        <div className="faint">{i.category || ''}</div>
                        {!i.hsn_sac && (
                          <span className="badge due" style={{ marginTop: 4 }}>HSN missing</span>
                        )}
                      </td>
                      <td className="mono dim hide-sm">{i.hsn_sac || '—'}</td>
                      <td className="num strong">
                        {i.sale_price > 0 ? formatMoney(i.sale_price)
                          : <span className="badge due">set price</span>}
                      </td>
                      <td className="num dim hide-sm">{i.mrp > 0 ? formatMoney(i.mrp) : '—'}</td>
                      {isOwner && <td className="num dim hide-sm">{formatMoney(i.purchase_price)}</td>}
                      <td className="num dim">{bpToPercentLabel(i.gst_rate_bp)}</td>
                      <td className="num">
                        {i.is_service === 1 ? (
                          <span className="faint">service</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                            <span className="strong" style={{ color: low ? 'var(--danger)' : undefined }}>
                              {fromQty(i.stock)} {i.unit}
                            </span>
                            <form action={adjustStockForm} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              <input type="hidden" name="_back" value="/items" />
                              <input type="hidden" name="item_id" value={i.id} />
                              <input name="delta_qty" type="number" min="1" step="1" defaultValue={1} style={{ width: 70 }} title="Quantity to add or remove" />
                              <button type="submit" className="btn sm" name="direction" value="add">Add</button>
                              <button type="submit" className="btn sm danger" name="direction" value="remove">Remove</button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <p className="faint" style={{ marginTop: 12 }}>
        Sale and cost rates are before GST. MRP and dealer price are the price-list figures,
        which include GST — billing at the sale rate plus GST lands on the MRP.
      </p>
    </Shell>
  );
}
