'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

type Item = { href: string; label: string };

const PRIMARY: Item[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/accounts', label: 'Accounts' },
];
const JOBS: Item[] = [
  { href: '/work-orders', label: 'Work orders' },
  { href: '/dispatch', label: 'Dispatch' },
  { href: '/inventory', label: 'Inventory' },
];
const BILLING: Item[] = [
  { href: '/invoices', label: 'Invoices' },
  { href: '/ar-aging', label: 'Receivables (aging)' },
];
const REPORTS: Item[] = [
  { href: '/tech-productivity', label: 'Technician productivity' },
];

function isActive(path: string, href: string) {
  return href === '/' ? path === '/' : path === href || path.startsWith(href + '/');
}

function Menu({ label, items, path }: { label: string; items: Item[]; path: string }) {
  const on = items.some((i) => isActive(path, i.href));
  return (
    <details className="nav2__menu">
      <summary className={'nav2__summary' + (on ? ' is-active' : '')}>{label}</summary>
      <div className="nav2__dropdown">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className={'nav2__item' + (isActive(path, i.href) ? ' is-active' : '')}>{i.label}</Link>
        ))}
      </div>
    </details>
  );
}

export function Nav() {
  const path = usePathname() || '/';
  return (
    <nav className="nav2">
      {PRIMARY.map((i) => (
        <Link key={i.href} href={i.href} className={'nav2__link' + (isActive(path, i.href) ? ' is-active' : '')}>{i.label}</Link>
      ))}
      <Menu label="Jobs" items={JOBS} path={path} />
      <Menu label="Billing" items={BILLING} path={path} />
      <Menu label="Reports" items={REPORTS} path={path} />
      <Link href="/settings" className={'nav2__link' + (isActive(path, '/settings') ? ' is-active' : '')}>Settings</Link>
      <button type="button" className="nav2__signout" onClick={() => signOut({ callbackUrl: '/login' })}>Sign out</button>
    </nav>
  );
}

export default Nav;
