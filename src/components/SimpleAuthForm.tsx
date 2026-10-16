'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { forgotPasswordAction, resetPasswordAction } from '@/lib/actions';

type State = { error?: string; email?: string } | null;

export default function SimpleAuthForm({ mode }: { mode: 'forgot' | 'reset' }) {
  const forgot = mode === 'forgot';
  const [state, action, pending] = useActionState(
    (forgot ? forgotPasswordAction : resetPasswordAction) as (p: State, fd: FormData) => Promise<State>,
    null as State,
  );
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <div className="card-body">
          <h1 style={{ fontSize: 22, margin: '0 0 4px', letterSpacing: '-.4px' }}>
            {forgot ? 'Forgot password' : 'Choose a new password'}
          </h1>
          <p className="dim" style={{ marginTop: 0, fontSize: 14 }}>
            {forgot
              ? 'Enter your email and we will send you a verification code.'
              : 'Email verified. Set your new password.'}
          </p>
          {state?.error && <div className="alert error">{state.error}</div>}
          <form action={action}>
            {forgot ? (
              <label className="field">
                <span>Email</span>
                <input name="email" type="email" autoComplete="email" defaultValue={state?.email} required autoFocus />
              </label>
            ) : (
              <>
                <label className="field">
                  <span>New password (min 8 characters)</span>
                  <input name="password" type="password" autoComplete="new-password" minLength={8} required autoFocus />
                </label>
                <label className="field">
                  <span>Confirm password</span>
                  <input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
                </label>
              </>
            )}
            <button className="btn primary big" type="submit" style={{ width: '100%' }} disabled={pending}>
              {pending ? 'Please wait…' : forgot ? 'Send code' : 'Update password'}
            </button>
          </form>
          <p className="dim" style={{ marginBottom: 0, fontSize: 14, textAlign: 'center' }}>
            <Link href="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
