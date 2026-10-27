import Link from 'next/link';
import { prisma } from '@/server/db';
import { formatCents } from '@/lib/money';
export const dynamic = 'force-dynamic';
async function getData() {
  try {
    const [accounts, openInvoices, activeWO, outRows, paidAgg, recentWO, recentInv] = await Promise.all([
      prisma.customerAccount.count({ where: { deletedAt: null } }),
      prisma.invoice.count({ where: { status: 'ISSUED', deletedAt: null } }),
      prisma.workOrder.count({ where: { status: { in: ['SCHEDULED', 'DISPATCHED', 'IN_PROGRESS'] }, deletedAt: null } }),
      prisma.$queryRaw`SELECT COALESCE(SUM(i.total_cents - COALESCE((SELECT SUM(total_cents) FROM credit_notes WHERE invoice_id=i.id AND status='ISSUED' AND deleted_at IS NULL),0) - COALESCE((SELECT SUM(amount_cents) FROM payment_allocations WHERE invoice_id=i.id AND deleted_at IS NULL),0)),0)::bigint AS outstanding FROM invoices i WHERE i.status='ISSUED' AND i.deleted_at IS NULL`,
      prisma.payment.aggregate({ _sum: { amountCents: true }, where: { status: 'POSTED', deletedAt: null } }),
      prisma.workOrder.findMany({ where: { deletedAt: null }, include: { account: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.invoice.findMany({ where: { deletedAt: null }, include: { account: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);
    const outstanding = BigInt((outRows as any[])[0]?.outstanding ?? 0);
    const collected = paidAgg._sum.amountCents ?? 0n;
    return { ok: true as const, accounts, openInvoices, activeWO, outstanding, collected, recentWO, recentInv };
  } catch { return { ok: false as const }; }
}
export default async function Dashboard() {
  const d = await getData();
  if (!d.ok) return (<><h1>Dashboard</h1><p className="muted">Database not reachable yet — reload in a moment.</p></>);
  return (<>
    <h1>Dashboard</h1>
    <div className="grid">
      <div className="card"><h3>Outstanding balance</h3><div className="kpi">{formatCents(d.outstanding)}</div></div>
      <div className="card"><h3>Collected</h3><div className="kpi">{formatCents(d.collected)}</div></div>
      <div className="card"><h3>Open invoices</h3><div className="kpi">{d.openInvoices}</div></div>
      <div className="card"><h3>Active work orders</h3><div className="kpi">{d.activeWO}</div></div>
      <div className="card"><h3>Accounts</h3><div className="kpi">{d.accounts}</div></div>
    </div>
    <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', marginTop: 28 }}>
      <div style={{ flex: 1, minWidth: 280 }}>
        <div className="rowsplit"><h2 style={{ fontSize: 16 }}>Recent work orders</h2><Link className="muted" href="/work-orders">All →</Link></div>
        {d.recentWO.length === 0 ? <p className="muted">None yet.</p> : (<table><thead><tr><th>Order #</th><th>Account</th><th>Status</th></tr></thead><tbody>{d.recentWO.map((w) => (<tr key={w.id}><td><Link href={'/work-orders/' + w.id}>{w.orderNumber}</Link></td><td>{w.account.name}</td><td>{w.status}</td></tr>))}</tbody></table>)}
      </div>
      <div style={{ flex: 1, minWidth: 280 }}>
        <div className="rowsplit"><h2 style={{ fontSize: 16 }}>Recent invoices</h2><Link className="muted" href="/invoices">All →</Link></div>
        {d.recentInv.length === 0 ? <p className="muted">None yet.</p> : (<table><thead><tr><th>Invoice #</th><th>Account</th><th>Total</th></tr></thead><tbody>{d.recentInv.map((i) => (<tr key={i.id}><td><Link href={'/invoices/' + i.id}>{i.invoiceNumber}</Link></td><td>{i.account.name}</td><td>{formatCents(i.totalCents)}</td></tr>))}</tbody></table>)}
      </div>
    </div>
  </>);
}
