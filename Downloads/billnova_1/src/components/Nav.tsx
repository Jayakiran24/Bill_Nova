'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'Home', icon: 'M3 10.5 12 3l9 7.5M5 9.5V20h14V9.5' },
  { href: '/invoices', label: 'Bills', icon: 'M6 2h9l5 5v15H6zM15 2v5h5M9 12h8M9 16h8' },
  { href: '/parties', label: 'Parties', icon: 'M16 20v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8' },
  { href: '/items', label: 'Items', icon: 'M20 7 12 3 4 7v10l8 4 8-4zM4 7l8 4 8-4M12 11v10' },
  { href: '/reports', label: 'Reports', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="bottomnav no-print">
      {ITEMS.map((it) => {
        const active = it.href === '/' ? path === '/' : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} className={active ? 'active' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                 strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={it.icon} />
            </svg>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
