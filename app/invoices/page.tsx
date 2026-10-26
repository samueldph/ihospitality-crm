import Link from 'next/link';
import { prisma } from '@/server/db';
import { formatCents } from '@/lib/money';
export const dynamic = 'force-dynamic';
export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({ where: { deletedAt: null }, include: { account: true }, orderBy: { createdAt: 'desc' }, take: 200 });
  return (<>
    <div className="rowsplit"><h1>Invoices</h1><Link className="btn" href="/invoices/new">+ New invoice</Link></div>
    {invoices.length === 0 ? <p className="muted">No invoices yet.</p> : (
      <table>
        <thead><tr><th>Invoice #</th><th>Account</th><th>Status</th><th>Total</th></tr></thead>
        <tbody>{invoices.map((i) => (
          <tr key={i.id}><td><Link href={'/invoices/' + i.id}>{i.invoiceNumber}</Link></td><td>{i.account.name}</td><td>{i.status}</td><td>{formatCents(i.totalCents)}</td></tr>
        ))}</tbody>
      </table>
    )}
  </>);
}
