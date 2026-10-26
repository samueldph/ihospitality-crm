'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
const links = [{ href: '/', label: 'Dashboard' }, { href: '/accounts', label: 'Accounts' }, { href: '/work-orders', label: 'Work orders' }, { href: '/invoices', label: 'Invoices' }, { href: '/inventory', label: 'Inventory' }, { href: '/settings', label: 'Settings' }];
export function Nav() {
  const path = usePathname();
  const active = (h: string) => (h === '/' ? path === '/' : path.startsWith(h));
  return (
    <nav className="nav">
      {links.map((l) => (<Link key={l.href} href={l.href} className={active(l.href) ? 'active' : ''}>{l.label}</Link>))}
      <button className="nav__logout" onClick={() => signOut({ callbackUrl: '/login' })}>Sign out</button>
    </nav>
  );
}
