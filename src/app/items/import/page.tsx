import Link from 'next/link';
import { redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import ImportForm from '@/components/ImportForm';
import { currentUser } from '@/lib/auth';
import { getBusiness, listBrands } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function ImportPage() {
  const user = await currentUser();
  if (!user) redirect('/login');

  const business = getBusiness(user.business_id);

  if (user.role !== 'owner') {
    return (
      <Shell user={user} businessName={business.name}>
        <div className="page-head"><h1>Import price list</h1></div>
        <div className="alert info">Only the owner can import a price list.</div>
      </Shell>
    );
  }

  const brands = listBrands(user.business_id).map((b) => b.brand);

  return (
    <Shell user={user} businessName={business.name}>
      <div className="page-head">
        <h1>Import price list</h1>
        <span className="spacer" />
        <Link href="/items" className="btn">← Items</Link>
      </div>

      <div className="alert info">
        Load another company&rsquo;s catalogue, or refresh prices when a company revises its list.
        Save the supplier&rsquo;s sheet as CSV from Excel, then paste or upload it below.
        Column headings are matched loosely — <span className="mono">model</span>,{' '}
        <span className="mono">code</span> and <span className="mono">sku</span> all work, and so do{' '}
        <span className="mono">dp</span>, <span className="mono">dealer price</span> and{' '}
        <span className="mono">cost</span>.
      </div>

      <ImportForm brands={brands} />

      <div className="card">
        <div className="card-head">Columns it understands</div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Field</th><th>Headings accepted</th><th>Needed?</th></tr></thead>
            <tbody>
              <tr><td>Model code</td><td className="mono">model, sku, code, model no</td><td>Yes, unless there is a name</td></tr>
              <tr><td>Name</td><td className="mono">name, description, product, item</td><td>Falls back to the model code</td></tr>
              <tr><td>Brand</td><td className="mono">brand, company, make, manufacturer</td><td>Or set one above for the whole file</td></tr>
              <tr><td>Category</td><td className="mono">category, type, range, group</td><td>No</td></tr>
              <tr><td>HSN / SAC</td><td className="mono">hsn, sac, hsn code, hsn/sac</td><td>No, but the bill needs it</td></tr>
              <tr><td>GST rate</td><td className="mono">gst, gst rate, tax</td><td>No — 18% is assumed</td></tr>
              <tr><td>MRP</td><td className="mono">mrp, list price, retail price</td><td>No</td></tr>
              <tr><td>Dealer price</td><td className="mono">dp, dealer price, cost, purchase price</td><td>No</td></tr>
              <tr><td>Sale rate</td><td className="mono">sale price, selling price</td><td>No — overrides MRP if given</td></tr>
              <tr><td>Unit</td><td className="mono">unit, uom</td><td>No — PCS is assumed</td></tr>
              <tr><td>Opening stock</td><td className="mono">opening stock, stock, qty</td><td>No, and only used for new items</td></tr>
              <tr><td>Low stock level</td><td className="mono">low stock, reorder</td><td>No</td></tr>
              <tr><td>Service flag</td><td className="mono">service, is service</td><td>No — put yes for labour or AMC lines</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
