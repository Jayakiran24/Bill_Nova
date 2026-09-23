import { redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import InvoiceForm from '@/components/InvoiceForm';
import { currentUser } from '@/lib/auth';
import { getBusiness, listParties, listItems } from '@/lib/queries';
import { STATE_CODES } from '@/lib/gst';
import { todayISO } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect('/login');

  const sp = await searchParams;
  const type = (sp.type === 'estimate' || sp.type === 'purchase_bill' ? sp.type : 'sales_invoice') as
    'sales_invoice' | 'estimate' | 'purchase_bill';

  const business = getBusiness(user.business_id);
  const parties = listParties(user.business_id, '', type === 'purchase_bill' ? 'supplier' : 'customer');
  const items = listItems(user.business_id);

  return (
    <Shell user={user} businessName={business.name} wide>
      <InvoiceForm
        type={type}
        today={todayISO()}
        businessStateCode={business.state_code}
        states={STATE_CODES}
        parties={parties.map((p) => ({
          id: p.id, name: p.name, phone: p.phone, gstin: p.gstin, state_code: p.state_code,
        }))}
        items={items.map((i) => ({
          id: i.id, name: i.name, sku: i.sku, brand: i.brand, category: i.category,
          hsn_sac: i.hsn_sac, unit: i.unit,
          sale_price: i.sale_price, purchase_price: i.purchase_price, mrp: i.mrp,
          gst_rate_bp: i.gst_rate_bp, is_service: i.is_service, stock: i.stock,
        }))}
      />
    </Shell>
  );
}
