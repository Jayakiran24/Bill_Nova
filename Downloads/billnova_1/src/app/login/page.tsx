'use client';

import { useActionState } from 'react';
import { loginAction } from '@/lib/actions';

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null as { error?: string } | null);

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 380 }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--brand)' }} />
            <h1 style={{ fontSize: 22, margin: 0, letterSpacing: '-.4px' }}>Bill Nova</h1>
          </div>
          <p className="dim" style={{ marginTop: 0, fontSize: 14 }}>
            GST billing for commercial refrigeration.
          </p>

          {state?.error && <div className="alert error">{state.error}</div>}

          <form action={action}>
            <label className="field">
              <span>Phone number</span>
              <input name="phone" type="tel" inputMode="numeric" autoComplete="username"
                     defaultValue="9000000000" required autoFocus />
            </label>
            <label className="field">
              <span>Password</span>
              <input name="password" type="password" autoComplete="current-password"
                     defaultValue="1234" required />
            </label>
            <button className="btn primary big" type="submit" style={{ width: '100%' }} disabled={pending}>
              {pending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="alert info" style={{ marginTop: 16, marginBottom: 0, fontSize: 13 }}>
            <strong>Demo logins</strong><br />
            Owner — 9000000000 / 1234<br />
            Counter staff — 9000000001 / 1234<br />
            Change both in Settings before real use.
          </div>
        </div>
      </div>
    </div>
  );
}
