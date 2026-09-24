'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cancelVoucher } from '@/lib/actions';

export default function InvoiceActions({
  voucherId, number, canCancel, whatsappPhone, message,
}: {
  voucherId: number;
  number: string;
  canCancel: boolean;
  whatsappPhone: string;
  message: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  function share() {
    const digits = whatsappPhone.replace(/\D/g, '');
    const to = digits.length === 10 ? `91${digits}` : digits;
    const url = `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener');
  }

  async function doCancel() {
    setBusy(true);
    setErr('');
    const res = await cancelVoucher(voucherId, reason);
    setBusy(false);
    if (res.ok) {
      setConfirming(false);
      router.refresh();
    } else {
      setErr(res.error);
    }
  }

  return (
    <div className="row">
      <button className="btn" onClick={() => window.print()}>Print</button>
      <button className="btn" onClick={share}>WhatsApp</button>
      {canCancel && (
        <button className="btn danger" onClick={() => setConfirming(true)}>Cancel bill</button>
      )}

      {confirming && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100,
          display: 'grid', placeItems: 'center', padding: 16,
        }}>
          <div className="card" style={{ maxWidth: 420, width: '100%' }}>
            <div className="card-head">Cancel {number}?</div>
            <div className="card-body">
              <p className="dim" style={{ marginTop: 0, fontSize: 14 }}>
                The bill keeps its number and stays in the sequence, as the law requires.
                Reversing ledger and stock entries are written automatically. Nothing is deleted.
              </p>
              {err && <div className="alert error">{err}</div>}
              <label className="field">
                <span>Reason</span>
                <input value={reason} onChange={(e) => setReason(e.target.value)}
                       placeholder="Wrong rate, duplicate bill…" autoFocus />
              </label>
              <div className="row">
                <button className="btn" onClick={() => setConfirming(false)} disabled={busy}>Keep it</button>
                <span style={{ flex: 1 }} />
                <button className="btn danger" onClick={doCancel} disabled={busy}>
                  {busy ? 'Cancelling…' : 'Cancel the bill'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
