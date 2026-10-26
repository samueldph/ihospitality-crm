import Link from 'next/link';
import { prisma } from '@/server/db';
export const dynamic = 'force-dynamic';
export default async function WorkOrdersPage() {
  const wos = await prisma.workOrder.findMany({ where: { deletedAt: null }, include: { account: true, jobType: true, technician: true }, orderBy: { createdAt: 'desc' }, take: 200 });
  return (<>
    <div className="rowsplit"><h1>Work orders</h1><Link className="btn" href="/work-orders/new">+ New work order</Link></div>
    {wos.length === 0 ? <p className="muted">No work orders yet.</p> : (
      <table>
        <thead><tr><th>Order #</th><th>Account</th><th>Job</th><th>Tech</th><th>Status</th><th>Scheduled</th></tr></thead>
        <tbody>{wos.map((w) => (
          <tr key={w.id}><td><Link href={'/work-orders/' + w.id}>{w.orderNumber}</Link></td><td>{w.account.name}</td><td>{w.jobType.name}</td><td>{w.technician?.name ?? '—'}</td><td>{w.status}</td><td>{w.scheduledAt ? new Date(w.scheduledAt).toLocaleDateString() : '—'}</td></tr>
        ))}</tbody>
      </table>
    )}
  </>);
}
