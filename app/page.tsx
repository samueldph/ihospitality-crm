import { prisma } from '@/server/db';
export const dynamic = 'force-dynamic';
async function getStats() {
  try {
    const [accounts, openInvoices, workOrders, payments] = await Promise.all([
      prisma.customerAccount.count({ where: { deletedAt: null } }),
      prisma.invoice.count({ where: { status: 'ISSUED', deletedAt: null } }),
      prisma.workOrder.count({ where: { status: { in: ['SCHEDULED','DISPATCHED','IN_PROGRESS'] }, deletedAt: null } }),
      prisma.payment.count({ where: { status: 'POSTED', deletedAt: null } }),
    ]);
    return { accounts, openInvoices, workOrders, payments, ok: true as const };
  } catch { return { ok: false as const }; }
}
export default async function Dashboard() {
  const s = await getStats();
  return (<>
    <h1>Dashboard</h1>
    {!s.ok ? <p className="muted">Database not reachable yet  reload in a moment.</p> : (
      <div className="grid">
        <div className="card"><h3>Customer accounts</h3><div className="kpi">{s.accounts}</div></div>
        <div className="card"><h3>Open invoices</h3><div className="kpi">{s.openInvoices}</div></div>
        <div className="card"><h3>Active work orders</h3><div className="kpi">{s.workOrders}</div></div>
        <div className="card"><h3>Payments posted</h3><div className="kpi">{s.payments}</div></div>
      </div>
    )}
    <p className="muted" style={{ marginTop: 24 }}>Foundation build  accounts, work orders, invoicing and payments are wired next.</p>
  </>);
}
