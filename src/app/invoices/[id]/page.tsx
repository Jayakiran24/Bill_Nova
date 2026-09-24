import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import Shell from '@/components/Shell';
import InvoiceActions from '@/components/InvoiceActions';
import { currentUser } from '@/lib/auth';
import { getBusiness, getVoucher, voucherLines, voucherPaid, getParty } from '@/lib/queries';
import { formatMoney, formatDate, fromQty } from '@/lib/money';
import { stateName, hsnForPrint, amountInWords } from '@/lib/gst';
import { VOUCHER_LABEL, bpToPercentLabel } from '@/lib/labels';

export const dynamic = 'force-dynamic';

export default async function InvoiceViewPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const sp = await searchParams;
  const v = getVoucher(Number(id));
  if (!v) notFound();

  const business = getBusiness(user.business_id);
  const lines = voucherLines(v.id);
  const paid = voucherPaid(v.id);
  const due = v.status === 'final' ? v.grand_total - paid : 0;
  const party = v.party_id ? getParty(v.party_id) : undefined;

  const isComposition = business.is_composition === 1;
  const docTitle = isComposition && v.type === 'sales_invoice'
    ? 'Bill of Supply'
    : VOUCHER_LABEL[v.type] || 'Invoice';

  return (
    <Shell user={user} businessName={business.name}>
      {sp.created === '1' && (
        <div className="alert ok no-print">
          Saved as <strong>{v.number}</strong>. Print it, send it on WhatsApp, or start the next bill.
        </div>
      )}

      <div className="page-head no-print">
        <h1>{v.number}</h1>
        {v.status === 'cancelled' && <span className="badge cancelled">Cancelled</span>}
        {v.status === 'final' && (due <= 0
          ? <span className="badge ok">Paid</span>
          : <span className="badge due">{formatMoney(due)} due</span>)}
        <span className="spacer" />
        <InvoiceActions
          voucherId={v.id}
          number={v.number}
          canCancel={user.role === 'owner' && v.status !== 'cancelled'}
          whatsappPhone={party?.phone || ''}
          message={buildWhatsappMessage(business.name, v.number, v.grand_total, due, business.upi_id)}
        />
      </div>

      <div className="invoice-paper">
        <div className="inv-head">
          <div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>{business.name}</div>
            <div style={{ fontSize: 12, marginTop: 3, whiteSpace: 'pre-line' }}>
              {[business.address_line1, business.address_line2].filter(Boolean).join('\n')}
              {'\n'}{[business.city, business.pincode].filter(Boolean).join(' - ')}
              {'\n'}{business.state} ({business.state_code})
            </div>
            <div style={{ fontSize: 12, marginTop: 3 }}>
              {business.phone && <>Phone: {business.phone}<br /></>}
              {business.gstin && <><strong>GSTIN: {business.gstin}</strong></>}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{docTitle}</div>
            <div style={{ marginTop: 6 }}>
              <strong>{v.number}</strong><br />
              Date: {formatDate(v.date)}<br />
              Place of supply: {v.place_of_supply_code} — {stateName(v.place_of_supply_code)}
            </div>
          </div>
        </div>

        <div className="inv-title">{docTitle}</div>

        <div className="inv-meta">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
              {v.type === 'purchase_bill' ? 'Supplier' : 'Bill to'}
            </div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>{v.party_name}</div>
            <div style={{ whiteSpace: 'pre-line' }}>{v.party_address || ''}</div>
            {v.party_gstin && <div>GSTIN: {v.party_gstin}</div>}
            {party?.phone && <div>Phone: {party.phone}</div>}
          </div>
          <div style={{ flex: 1 }}>
            {(v.transporter || v.vehicle_no) && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Transport</div>
                {v.transporter && <div>{v.transporter}</div>}
                {v.vehicle_no && <div>Vehicle: {v.vehicle_no}</div>}
              </>
            )}
          </div>
        </div>

        <table className="inv">
          <thead>
            <tr>
              <th style={{ width: 28 }}>#</th>
              <th>Description</th>
              <th style={{ width: 70 }}>HSN/SAC</th>
              <th style={{ width: 70, textAlign: 'right' }}>Qty</th>
              <th style={{ width: 84, textAlign: 'right' }}>Rate</th>
              <th style={{ width: 90, textAlign: 'right' }}>Taxable</th>
              {v.is_igst ? (
                <th style={{ width: 96, textAlign: 'right' }}>IGST</th>
              ) : (
                <>
                  <th style={{ width: 84, textAlign: 'right' }}>CGST</th>
                  <th style={{ width: 84, textAlign: 'right' }}>SGST</th>
                </>
              )}
              <th style={{ width: 96, textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td>{l.line_no}</td>
                <td>
                  {l.description}
                  {l.sku && !l.description.includes(l.sku) && (
                    <div style={{ fontSize: 11 }}>Model: {l.sku}</div>
                  )}
                </td>
                <td>{hsnForPrint(l.hsn_sac, business.hsn_digits)}</td>
                <td style={{ textAlign: 'right' }}>{fromQty(l.qty)} {l.unit}</td>
                <td style={{ textAlign: 'right' }}>{formatMoney(l.rate)}</td>
                <td style={{ textAlign: 'right' }}>{formatMoney(l.taxable_value)}</td>
                {v.is_igst ? (
                  <td style={{ textAlign: 'right' }}>
                    {formatMoney(l.igst)}<br />
                    <span style={{ fontSize: 10 }}>{bpToPercentLabel(l.gst_rate_bp)}</span>
                  </td>
                ) : (
                  <>
                    <td style={{ textAlign: 'right' }}>
                      {formatMoney(l.cgst)}<br />
                      <span style={{ fontSize: 10 }}>{bpToPercentLabel(l.gst_rate_bp / 2)}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {formatMoney(l.sgst)}<br />
                      <span style={{ fontSize: 10 }}>{bpToPercentLabel(l.gst_rate_bp / 2)}</span>
                    </td>
                  </>
                )}
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(l.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="inv-foot">
          <div style={{ flex: 1.4 }}>
            <div><strong>Amount in words:</strong> {amountInWords(v.grand_total)}</div>
            {business.bank_name && (
              <div style={{ marginTop: 8 }}>
                <strong>Bank details</strong><br />
                {business.bank_name}<br />
                A/c: {business.bank_account}<br />
                IFSC: {business.bank_ifsc}
                {business.upi_id && <><br />UPI: {business.upi_id}</>}
              </div>
            )}
            {business.terms && (
              <div style={{ marginTop: 8 }}>
                <strong>Terms</strong>
                <div style={{ whiteSpace: 'pre-line' }}>{business.terms}</div>
              </div>
            )}
            {v.notes && (
              <div style={{ marginTop: 8 }}>
                <strong>Notes</strong>
                <div style={{ whiteSpace: 'pre-line' }}>{v.notes}</div>
              </div>
            )}
            <div style={{ marginTop: 8, fontSize: 11 }}>
              GST payable on reverse charge: No
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 220 }}>
            <table className="inv" style={{ marginTop: 0 }}>
              <tbody>
                <tr>
                  <td>Taxable value</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(v.taxable_value)}</td>
                </tr>
                {v.is_igst ? (
                  <tr><td>IGST</td><td style={{ textAlign: 'right' }}>{formatMoney(v.igst)}</td></tr>
                ) : (
                  <>
                    <tr><td>CGST</td><td style={{ textAlign: 'right' }}>{formatMoney(v.cgst)}</td></tr>
                    <tr><td>SGST</td><td style={{ textAlign: 'right' }}>{formatMoney(v.sgst)}</td></tr>
                  </>
                )}
                {v.round_off !== 0 && (
                  <tr><td>Round off</td><td style={{ textAlign: 'right' }}>{formatMoney(v.round_off)}</td></tr>
                )}
                <tr style={{ fontWeight: 800 }}>
                  <td>Total</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(v.grand_total)}</td>
                </tr>
                {paid > 0 && (
                  <>
                    <tr><td>Paid</td><td style={{ textAlign: 'right' }}>{formatMoney(paid)}</td></tr>
                    <tr style={{ fontWeight: 800 }}>
                      <td>Balance due</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(due)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>

            <div style={{ marginTop: 44, textAlign: 'right', fontSize: 12 }}>
              For <strong>{business.name}</strong>
              <div style={{ marginTop: 34 }}>Authorised signatory</div>
            </div>
          </div>
        </div>

        {v.status === 'cancelled' && (
          <div style={{ marginTop: 14, padding: 8, border: '2px solid #000', textAlign: 'center', fontWeight: 800 }}>
            CANCELLED{v.cancel_reason ? ` — ${v.cancel_reason}` : ''}
          </div>
        )}
      </div>

      <div className="row no-print" style={{ marginTop: 16 }}>
        <Link href="/invoices" className="btn">← All bills</Link>
        <Link href="/invoices/new" className="btn primary">+ Next bill</Link>
      </div>
    </Shell>
  );
}

function buildWhatsappMessage(
  businessName: string, number: string, total: number, due: number, upi: string | null,
) {
  const lines = [
    `*${businessName}*`,
    `Invoice ${number}`,
    `Total: ${formatMoney(total)}`,
  ];
  if (due > 0) lines.push(`Balance due: ${formatMoney(due)}`);
  if (due > 0 && upi) lines.push(`Pay by UPI: ${upi}`);
  lines.push('', 'Thank you for your business.');
  return lines.join('\n');
}
