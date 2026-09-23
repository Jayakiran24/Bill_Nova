import { redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import { currentUser, listUsers } from '@/lib/auth';
import { getBusiness } from '@/lib/queries';
import { saveBusinessForm, saveNumberSeriesForm, saveUserForm } from '@/lib/actions';
import Flash from '@/components/Flash';
import { all } from '@/lib/db';
import { STATE_CODES } from '@/lib/gst';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const sp = await searchParams;
  const user = await currentUser();
  if (!user) redirect('/login');

  const b = getBusiness(user.business_id);
  const isOwner = user.role === 'owner';
  const series = all<{ id: number; voucher_type: string; financial_year: string; prefix: string; last_number: number }>(
    'SELECT * FROM number_series WHERE business_id = ? ORDER BY financial_year DESC, voucher_type',
    user.business_id,
  );
  const users = listUsers(user.business_id);

  if (!isOwner) {
    return (
      <Shell user={user} businessName={b.name}>
        <div className="page-head"><h1>Settings</h1></div>
        <div className="alert info">Only the owner can change settings.</div>
      </Shell>
    );
  }

  return (
    <Shell user={user} businessName={b.name}>
      <Flash ok={sp.ok} err={sp.err} />
      <div className="page-head"><h1>Settings</h1></div>

      <div className="card">
        <div className="card-head">Business profile — this prints on every bill</div>
        <div className="card-body">
          <form action={saveBusinessForm}>
            <div className="grid2">
              <label className="field"><span>Trade name</span><input name="name" defaultValue={b.name} required /></label>
              <label className="field"><span>Legal name</span><input name="legal_name" defaultValue={b.legal_name || ''} /></label>
              <label className="field"><span>GSTIN</span><input name="gstin" defaultValue={b.gstin || ''} style={{ textTransform: 'uppercase' }} /></label>
              <label className="field"><span>Phone</span><input name="phone" defaultValue={b.phone || ''} /></label>
              <label className="field"><span>Email</span><input name="email" defaultValue={b.email || ''} /></label>
              <label className="field">
                <span>State</span>
                <select name="state_code" defaultValue={b.state_code}>
                  {STATE_CODES.map((s) => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
                </select>
              </label>
              <label className="field"><span>Address line 1</span><input name="address_line1" defaultValue={b.address_line1 || ''} /></label>
              <label className="field"><span>Address line 2</span><input name="address_line2" defaultValue={b.address_line2 || ''} /></label>
              <label className="field"><span>City</span><input name="city" defaultValue={b.city || ''} /></label>
              <label className="field"><span>PIN code</span><input name="pincode" defaultValue={b.pincode || ''} /></label>
            </div>

            <div className="grid2">
              <label className="field"><span>Bank name</span><input name="bank_name" defaultValue={b.bank_name || ''} /></label>
              <label className="field"><span>Account number</span><input name="bank_account" defaultValue={b.bank_account || ''} /></label>
              <label className="field"><span>IFSC</span><input name="bank_ifsc" defaultValue={b.bank_ifsc || ''} style={{ textTransform: 'uppercase' }} /></label>
              <label className="field"><span>UPI ID</span><input name="upi_id" defaultValue={b.upi_id || ''} /></label>
            </div>

            <label className="field">
              <span>Terms printed on the bill</span>
              <textarea name="terms" defaultValue={b.terms || ''} />
            </label>

            <div className="grid2">
              <label className="field">
                <span>HSN digits to print</span>
                <select name="hsn_digits" defaultValue={b.hsn_digits}>
                  <option value={4}>4 digits — turnover up to ₹5 crore</option>
                  <option value={6}>6 digits — turnover above ₹5 crore</option>
                  <option value={8}>8 digits — exports</option>
                </select>
              </label>
              <label className="field" style={{ display: 'flex', alignItems: 'end', gap: 8, paddingBottom: 12 }}>
                <input type="checkbox" name="is_composition" defaultChecked={b.is_composition === 1} style={{ width: 'auto' }} />
                <span style={{ margin: 0, textTransform: 'none', fontSize: 14 }}>
                  Composition scheme — bills print as Bill of Supply with no GST charged
                </span>
              </label>
            </div>

            <button className="btn primary" type="submit">Save profile</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-head">Invoice numbering</div>
        <div className="card-body">
          <p className="dim" style={{ marginTop: 0, fontSize: 14 }}>
            Numbers must be unique within the financial year, consecutive, and at most 16 characters.
            To continue an existing series, set <strong>last number</strong> to the number already used.
          </p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Document</th><th>Year</th><th>Prefix</th><th className="num">Last number</th><th></th></tr>
              </thead>
              <tbody>
                {series.map((s) => (
                  <tr key={s.id}>
                    <td>{s.voucher_type.replace(/_/g, ' ')}</td>
                    <td className="dim">{s.financial_year}</td>
                    <td colSpan={3}>
                      <form action={saveNumberSeriesForm} className="row">
                        <input type="hidden" name="id" value={s.id} />
                        <input name="prefix" defaultValue={s.prefix} style={{ maxWidth: 180 }} />
                        <input name="last_number" type="number" defaultValue={s.last_number} style={{ maxWidth: 110 }} />
                        <button className="btn sm" type="submit">Save</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">Users</div>
        <div className="card-body">
          <div className="table-wrap" style={{ marginBottom: 14 }}>
            <table className="data">
              <thead><tr><th>Name</th><th>Phone</th><th>Role</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td className="mono">{u.phone}</td>
                    <td><span className="badge draft">{u.role}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form action={saveUserForm}>
            <div className="grid3">
              <label className="field"><span>Name</span><input name="name" required /></label>
              <label className="field"><span>Phone</span><input name="phone" inputMode="numeric" required /></label>
              <label className="field">
                <span>Role</span>
                <select name="role">
                  <option value="staff">Counter staff</option>
                  <option value="owner">Owner</option>
                </select>
              </label>
              <label className="field"><span>Password</span><input name="password" type="password" required /></label>
            </div>
            <button className="btn primary" type="submit">Add user</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-head">Backups</div>
        <div className="card-body">
          <p className="dim" style={{ marginTop: 0, fontSize: 14 }}>
            All data lives in one file: <code>data/billnova.db</code>. Copy it somewhere safe every day.
            A backup you have never restored is not a backup — once a month, copy the file
            into a fresh folder, start the app against it, and check that last month&rsquo;s bills open.
          </p>
          <a className="btn" href="/api/backup">Download database backup</a>
        </div>
      </div>
    </Shell>
  );
}
