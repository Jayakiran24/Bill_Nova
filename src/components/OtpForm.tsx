'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { verifyOtpAction, resendOtpAction, cancelOtpAction } from '@/lib/actions';

type State = { error?: string } | null;

export default function OtpForm({ email, purpose }: { email: string; purpose: string }) {
  const [state, action, pending] = useActionState(
    verifyOtpAction as (prev: State, fd: FormData) => Promise<State>,
    null as State,
  );
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [cooldown, setCooldown] = useState(30);
  const [resending, startResend] = useTransition();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const error = msg?.error || state?.error;
  const title =
    purpose === 'signup' ? 'Verify your email' : purpose === 'reset' ? 'Reset your password' : 'Two-step verification';

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <div className="card-body">
          <h1 style={{ fontSize: 22, margin: '0 0 4px', letterSpacing: '-.4px' }}>{title}</h1>
          <p className="dim" style={{ marginTop: 0, fontSize: 14 }}>
            We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.
          </p>
          {msg?.ok && !error && <div className="alert ok">{msg.ok}</div>}
          {error && <div className="alert error">{error}</div>}

          <form action={action} onChange={() => setMsg(null)}>
            <label className="field">
              <span>Verification code</span>
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
                style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center' }}
              />
            </label>
            <button className="btn primary big" type="submit" style={{ width: '100%' }} disabled={pending}>
              {pending ? 'Checking…' : 'Verify'}
            </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 14 }}>
            <button
              type="button"
              className="btn"
              disabled={cooldown > 0 || resending}
              onClick={() =>
                startResend(async () => {
                  const r = (await resendOtpAction()) as { error?: string; ok?: string };
                  setMsg(r);
                  if (!r.error) setCooldown(30);
                })
              }
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
            <form action={cancelOtpAction}>
              <button type="submit" className="btn">Cancel</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
