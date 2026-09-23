import Link from 'next/link';
import Nav from './Nav';
import { logoutAction } from '@/lib/actions';
import type { SessionUser } from '@/lib/auth';

export default function Shell({
  user,
  businessName,
  children,
  wide,
}: {
  user: SessionUser;
  businessName: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="shell">
      <header className="topbar no-print">
        <Link href="/" className="brand" style={{ color: 'var(--text)' }}>
          <span className="dot" />
          Bill Nova
        </Link>
        <span className="spacer" />
        <span className="who hide-sm">
          {businessName} · {user.name} ({user.role})
        </span>
        <Link href="/payments" className="btn sm">Payments</Link>
        {user.role === 'owner' && <Link href="/settings" className="btn sm">Settings</Link>}
        <form action={logoutAction}>
          <button className="btn sm" type="submit">Log out</button>
        </form>
      </header>
      <main className={wide ? 'container wide' : 'container'}>{children}</main>
      <Nav />
    </div>
  );
}
