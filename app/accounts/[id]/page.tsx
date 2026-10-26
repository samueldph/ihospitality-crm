import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/server/db';
import { formatCents } from '@/lib/money';
export const dynamic = 'force-dynamic';
export default async function AccountDetail({ params }: { params: { id: string } }) {
  const a = await prisma.customerAccount.findUnique({
    where: { id: params.id },
    include: {
      sites: { where: { deletedAt: null } },
      workOrders: { where: { deletedAt: null }, include: { jobType: true }, orderBy: { createdAt: 'desc' }, take: 50 },
      invoices: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });
  if (!a) notFound();
  return (<>
    <div className="rowsplit"><h1>{a.name}</h1><Link className="muted" href="/accounts">← Back</Link></div>
    <p className="muted">{a.accountNumber} · {a.kind} · {a.status}{a.email ? ' · ' + a.email : ''}{a.phone ? ' · ' + a.phone : ''}</p>
    <div style={{ marginTop: 20 }}>
      <div className="rowsplit"><h2 style={{ fontSize: 16 }}>Work orders</h2><Link className="btn" href="/work-orders/new">+ New work order</Link></div>
      {a.workOrders.length === 0 ? <p className="muted">None yet.</p> : (
        <table><thead><tr><th>Order #</th><th>Job</th><th>Status</th><th>Scheduled</th></tr></thead>
          <tbody>{a.workOrders.map((w) => (<tr key={w.id}><td><Link href={'/work-orders/' + w.id}>{w.orderNumber}</Link></td><td>{w.jobType.name}</td><td>{w.status}</td><td>{w.scheduledAt ? new Date(w.scheduledAt).toLocaleDateString() : '—'}</td></tr>))}</tbody></table>
      )}
    </div>
    <div style={{ marginTop: 24 }}>
      <div className="rowsplit"><h2 style={{ fontSize: 16 }}>Invoices</h2><Link className="btn" href={'/invoices/new?account=' + a.id}>+ New invoice</Link></div>
      {a.invoices.length === 0 ? <p className="muted">None yet.</p> : (
        <table><thead><tr><th>Invoice #</th><th>Status</th><th>Total</th></tr></thead>
          <tbody>{a.invoices.map((i) => (<tr key={i.id}><td><Link href={'/invoices/' + i.id}>{i.invoiceNumber}</Link></td><td>{i.status}</td><td>{formatCents(i.totalCents)}</td></tr>))}</tbody></table>
      )}
    </div>
    {a.sites.length > 0 && (
      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Service addresses</h2>
        <ul className="muted">{a.sites.map((s) => (<li key={s.id}>{s.line1}, {s.city}{s.region ? ', ' + s.region : ''}</li>))}</ul>
      </div>
    )}
  </>);
}
