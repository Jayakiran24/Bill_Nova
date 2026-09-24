'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { importItems, type ImportRowResult } from '@/lib/actions';

const TEMPLATE = `model,name,brand,category,hsn,unit,gst,mrp,dealer price,opening stock,low stock
GFRN250SDUC,2 in 1 Single Door Freezer/Cooler,Rockwell,Green Freezer,84183010,PCS,18,32160,23500,0,0
RVC400A,Single Door Visi Cooler,Rockwell,Visi Coolers,84185000,PCS,18,56498,37996,0,0`;

export default function ImportForm({ brands }: { brands: string[] }) {
  const router = useRouter();
  const [csv, setCsv] = useState('');
  const [inclusive, setInclusive] = useState(true);
  const [defaultBrand, setDefaultBrand] = useState('');
  const [preview, setPreview] = useState<ImportRowResult[] | null>(null);
  const [counts, setCounts] = useState({ created: 0, updated: 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  async function readFile(file: File) {
    setCsv(await file.text());
    setPreview(null);
    setDone('');
  }

  async function run(dryRun: boolean) {
    setBusy(true);
    setError('');
    const res = await importItems({ csv, pricesIncludeGst: inclusive, defaultBrand, dryRun });
    setBusy(false);

    if (!res.ok) { setError(res.error); setPreview(null); return; }
    setPreview(res.results);
    setCounts({ created: res.created, updated: res.updated });
    if (!dryRun) {
      setDone(`Imported. ${res.created} new item${res.created === 1 ? '' : 's'}, ${res.updated} updated.`);
      router.refresh();
    }
  }

  const errors = preview?.filter((r) => r.action === 'error') ?? [];

  return (
    <>
      {error && <div className="alert error">{error}</div>}
      {done && <div className="alert ok">{done}</div>}

      <div className="card">
        <div className="card-head">1 · Paste or upload the price list</div>
        <div className="card-body">
          <div className="grid2">
            <label className="field">
              <span>Upload a CSV file</span>
              <input type="file" accept=".csv,text/csv,text/plain"
                     onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }} />
            </label>
            <label className="field">
              <span>Brand, if the file has no brand column</span>
              <input value={defaultBrand} list="importbrands" placeholder="e.g. Blue Star"
                     onChange={(e) => setDefaultBrand(e.target.value)} />
              <datalist id="importbrands">
                {brands.map((b) => <option key={b} value={b} />)}
              </datalist>
            </label>
          </div>

          <label className="field">
            <span>Or paste the rows here</span>
            <textarea value={csv} onChange={(e) => { setCsv(e.target.value); setPreview(null); setDone(''); }}
                      rows={10} style={{ fontFamily: 'var(--mono)', fontSize: 13 }}
                      placeholder={TEMPLATE} />
          </label>

          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
            <input type="checkbox" checked={inclusive} style={{ width: 'auto', marginTop: 3 }}
                   onChange={(e) => setInclusive(e.target.checked)} />
            <span style={{ fontSize: 14 }}>
              <strong>The MRP and dealer price in this file include GST.</strong>
              <br />
              <span className="dim">
                Almost every Indian price list works this way. Bill Nova will divide by the
                GST rate to get the billing rate, so an invoice plus GST lands back on the MRP.
                Untick only if the file already shows pre-GST prices.
              </span>
            </span>
          </label>

          <div className="row">
            <button className="btn" onClick={() => setCsv(TEMPLATE)} disabled={busy}>
              Load a sample
            </button>
            <span style={{ flex: 1 }} />
            <button className="btn primary" onClick={() => run(true)} disabled={busy || !csv.trim()}>
              {busy ? 'Checking…' : 'Check the file'}
            </button>
          </div>
        </div>
      </div>

      {preview && (
        <div className="card">
          <div className="card-head">
            2 · Review
            <span className="spacer" />
            <span className="badge ok">{counts.created} new</span>
            <span className="badge draft">{counts.updated} updates</span>
            {errors.length > 0 && <span className="badge due">{errors.length} problems</span>}
          </div>
          <div className="card-body" style={{ paddingBottom: 0 }}>
            {done ? (
              <p className="dim" style={{ marginTop: 0 }}>
                Already imported. <a href="/items">See the items</a>.
              </p>
            ) : (
              <p className="dim" style={{ marginTop: 0 }}>
                Nothing has been saved yet. An existing model code under the same brand is
                updated in place; everything else is added. Stock is never touched by an import.
              </p>
            )}
          </div>
          <div className="table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table className="data">
              <thead>
                <tr><th>Line</th><th>Model</th><th>Name</th><th>What happens</th></tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r.line}>
                    <td className="dim">{r.line}</td>
                    <td className="mono">{r.sku || '—'}</td>
                    <td>{r.name}</td>
                    <td>
                      {r.action === 'create' && <span className="badge ok">new</span>}
                      {r.action === 'update' && <span className="badge draft">update</span>}
                      {r.action === 'error' && (
                        <>
                          <span className="badge due">problem</span>
                          <div className="faint">{r.message}</div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!done && (
            <div className="card-body">
              <button className="btn primary big" onClick={() => run(false)} disabled={busy}>
                {busy ? 'Importing…' : `Import ${counts.created + counts.updated} items`}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
