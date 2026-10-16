'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginAction, signupAction } from '@/lib/actions';

type Role = 'owner' | 'staff';
type AuthState = {
  error?: string;
  identifier?: string;
  name?: string;
  business?: string;
  email?: string;
} | null;

function Brand({ sub }: { sub: string }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--brand)' }} />
        <h1 style={{ fontSize: 22, margin: 0, letterSpacing: '-.4px' }}>Bill Nova</h1>
      </div>
      <p className="dim" style={{ marginTop: 0, fontSize: 14 }}>{sub}</p>
    </>
  );
}

function RoleChooser({ mode }: { mode: 'login' | 'signup' }) {
  const opts: { role: Role; title: string; text: string }[] = [
    {
      role: 'owner',
      title: 'Owner',
      text: mode === 'signup' ? 'I run the business. Create my shop and manage everything.' : 'Full access: items, stock, reports, payments, settings, staff.',
    },
    {
      role: 'staff',
      title: 'Staff',
      text: mode === 'signup' ? 'The owner invited me. I will create bills for customers.' : 'Billing only: create and print bills for customers.',
    },
  ];
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <div className="card-body">
          <Brand sub={mode === 'signup' ? 'Are you creating an account as an owner or as staff?' : 'Are you signing in as an owner or as staff?'} />
          <div style={{ display: 'grid', gap: 10 }}>
            {opts.map((o) => (
              <Link
                key={o.role}
                href={`/${mode}?role=${o.role}`}
                className="btn"
                style={{ display: 'block', textAlign: 'left', padding: '12px 14px', height: 'auto' }}
              >
                <strong style={{ fontSize: 16 }}>{o.title}</strong>
                <div className="dim" style={{ fontSize: 13, fontWeight: 400, marginTop: 2, whiteSpace: 'normal' }}>{o.text}</div>
              </Link>
            ))}
          </div>
          <p className="dim" style={{ marginBottom: 0, fontSize: 14, textAlign: 'center', marginTop: 14 }}>
            {mode === 'signup' ? (
              <>Already have an account? <Link href="/login">Sign in</Link></>
            ) : (
              <>New here? <Link href="/signup">Create an account</Link></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthForm({
  mode,
  role,
  notice,
  success,
  identifier,
}: {
  mode: 'login' | 'signup';
  role?: Role;
  notice?: string;
  success?: string;
  identifier?: string;
}) {
  const signup = mode === 'signup';
  const [state, action, pending] = useActionState(
    (signup ? signupAction : loginAction) as (prev: AuthState, fd: FormData) => Promise<AuthState>,
    null as AuthState,
  );
  if (signup && !role) return <RoleChooser mode="signup" />;

  const error = state?.error || notice;
  const label = role === 'owner' ? 'Owner' : 'Staff';
  const other = role === 'owner' ? 'staff' : 'owner';

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <div className="card-body">
          <Brand sub={signup ? `Create your ${label.toLowerCase()} account.` : 'Sign in to your account.'} />
          {signup && (
            <p style={{ margin: '0 0 12px', fontSize: 13 }}>
              <span className="badge draft">{label}</span>{' '}
              <Link href="/signup">Not {role === 'owner' ? 'an owner' : 'staff'}? Switch to {other}</Link>
            </p>
          )}

          {success && !error && <div className="alert ok">{success}</div>}
          {error && <div className="alert error">{error}</div>}
          {signup && role === 'staff' && !error && (
            <div className="alert info">
              Use the same email your owner added under Settings → Staff. Without an invitation you cannot join a shop.
            </div>
          )}

          <a
            className="btn big"
            href={signup ? `/api/auth/google?role=${role}` : '/api/auth/google'}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Continue with Google
          </a>
          <div className="dim" style={{ textAlign: 'center', margin: '14px 0', fontSize: 13 }}>or use email</div>

          <form action={action}>
            {signup && <input type="hidden" name="role" value={role} />}
            {signup ? (
              <>
                <label className="field">
                  <span>Your name</span>
                  <input name="name" autoComplete="name" defaultValue={state?.name} required autoFocus />
                </label>
                {role === 'owner' && (
                  <label className="field">
                    <span>Business name</span>
                    <input name="business" autoComplete="organization" defaultValue={state?.business} required />
                  </label>
                )}
                <label className="field">
                  <span>Email</span>
                  <input name="email" type="email" autoComplete="email" defaultValue={state?.email} required />
                </label>
                <label className="field">
                  <span>Password (min 8 characters)</span>
                  <input name="password" type="password" autoComplete="new-password" minLength={8} required />
                </label>
                <label className="field">
                  <span>Confirm password</span>
                  <input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
                </label>
              </>
            ) : (
              <>
                <label className="field">
                  <span>Email or phone</span>
                  <input name="identifier" autoComplete="username" defaultValue={state?.identifier ?? identifier} required autoFocus />
                </label>
                <label className="field">
                  <span>Password</span>
                  <input name="password" type="password" autoComplete="current-password" required />
                </label>
                <p style={{ margin: '-4px 0 12px', fontSize: 13, textAlign: 'right' }}>
                  <Link href="/forgot-password">Forgot password?</Link>
                </p>
              </>
            )}
            <button className="btn primary big" type="submit" style={{ width: '100%' }} disabled={pending}>
              {pending ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="dim" style={{ marginBottom: 0, fontSize: 14, textAlign: 'center' }}>
            {signup ? (
              <>Already have an account? <Link href="/login">Sign in</Link></>
            ) : (
              <>New here? <Link href="/signup">Create an account</Link></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
