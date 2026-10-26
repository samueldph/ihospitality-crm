'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
const links = [{ href: '/', label: 'Dashboard' }, { href: '/accounts', label: 'Accounts' }, { href: '/work-orders', label: 'Work orders' }, { href: '/invoices', label: 'Invoices' }, { href: '/settings', label: 'Settings' }];
const soon = ['Payments', 'Inventory'];
export function Nav() {
  const path = usePathname();
  const active = (h: string) => (h === '/' ? path === '/' : path.startsWith(h));
  return (
    <nav className="nav">
      {links.map((l) => (<Link key={l.href} href={l.href} className={active(l.href) ? 'active' : ''}>{l.label}</Link>))}
      <div className="nav__section">Coming soon</div>
      {soon.map((s) => (<span key={s} style={{ display: 'block', padding: '9px 12px', color: 'var(--muted)', fontSize: 14 }}>{s}</span>))}
      <button className="nav__logout" onClick={() => signOut({ callbackUrl: '/login' })}>Sign out</button>
    </nav>
  );
}
