import Link from 'next/link';
import { prisma } from '@/server/db';
export const dynamic = 'force-dynamic';
export default async function AccountsPage() {
  const accounts = await prisma.customerAccount.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 200 });
  return (<>
    <div className="rowsplit"><h1>Accounts</h1><Link className="btn" href="/accounts/new">+ New account</Link></div>
    {accounts.length === 0 ? <p className="muted">No accounts yet. Create your first one.</p> : (
      <table>
        <thead><tr><th>Account #</th><th>Name</th><th>Type</th><th>Email</th><th>Phone</th></tr></thead>
        <tbody>{accounts.map((a) => (
          <tr key={a.id}><td>{a.accountNumber}</td><td><Link href={'/accounts/' + a.id}>{a.name}</Link></td><td>{a.kind}</td><td>{a.email ?? '—'}</td><td>{a.phone ?? '—'}</td></tr>
        ))}</tbody>
      </table>
    )}
  </>);
}
