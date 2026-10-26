import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/server/db';
import { formatCents } from '@/lib/money';
import { updateWorkOrderStatus } from '@/server/actions/workorders';
import { consumeInventory } from '@/server/actions/materials';
export const dynamic = 'force-dynamic';
const STATUSES = ['DRAFT', 'SCHEDULED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
export default async function WorkOrderDetail({ params }: { params: { id: string } }) {
  const [w, inventory] = await Promise.all([
    prisma.workOrder.findUnique({ where: { id: params.id }, include: { account: true, jobType: true, technician: true, serviceAddress: true, invoices: true, items: { include: { inventoryItem: true } } } }),
    prisma.inventoryItem.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, sku: true, quantity: true } }),
  ]);
  if (!w) notFound();
  const invoiceHref = '/invoices/new?account=' + w.accountId + '&wo=' + w.id + '&desc=' + encodeURIComponent(w.jobType.name + ' — ' + w.orderNumber);
  return (<>
    <div className="rowsplit"><h1>{w.orderNumber}</h1><Link className="muted" href="/work-orders">← Back</Link></div>
    <p className="muted">{w.account.name} · {w.jobType.name} · <b>{w.status}</b></p>
    <div className="card" style={{ marginTop: 12, maxWidth: 560 }}>
      <div><b>Technician:</b> {w.technician?.name ?? 'Unassigned'}</div>
      <div style={{ marginTop: 6 }}><b>Address:</b> {w.serviceAddress.line1}, {w.serviceAddress.city}{w.serviceAddress.region ? ', ' + w.serviceAddress.region : ''}</div>
      <div style={{ marginTop: 6 }}><b>Scheduled:</b> {w.scheduledAt ? new Date(w.scheduledAt).toLocaleString() : '—'}</div>
      {w.summary && <div style={{ marginTop: 6 }}><b>Summary:</b> {w.summary}</div>}
    </div>
    <form action={updateWorkOrderStatus} style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'flex-end', maxWidth: 380 }}>
      <input type="hidden" name="id" value={w.id} />
      <div style={{ flex: 1 }}><label>Update status</label><select name="status" className="input" defaultValue={w.status}>{STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}</select></div>
      <button className="btn" type="submit">Save</button>
    </form>
    <div style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 16 }}>Materials used</h2>
      {w.items.length === 0 ? <p className="muted">None recorded.</p> : (
        <table><thead><tr><th>Item</th><th>SKU</th><th>Qty</th></tr></thead><tbody>{w.items.map((m) => (<tr key={m.id}><td>{m.inventoryItem.name}</td><td>{m.inventoryItem.sku}</td><td>{m.quantity}</td></tr>))}</tbody></table>
      )}
      {inventory.length > 0 && (
        <form action={consumeInventory} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 10, maxWidth: 480 }}>
          <input type="hidden" name="workOrderId" value={w.id} />
          <div style={{ flex: 1 }}><label>Item</label><select name="inventoryItemId" className="input">{inventory.map((it) => (<option key={it.id} value={it.id}>{it.name} ({it.quantity} in stock)</option>))}</select></div>
          <div style={{ width: 80 }}><label>Qty</label><input name="quantity" className="input" defaultValue="1" /></div>
          <button className="btn" type="submit">Use</button>
        </form>
      )}
    </div>
    <div style={{ marginTop: 24 }}>
      <div className="rowsplit"><h2 style={{ fontSize: 16 }}>Invoices</h2><Link className="btn" href={invoiceHref}>+ Create invoice from this job</Link></div>
      {w.invoices.length === 0 ? <p className="muted">No invoices for this job yet.</p> : (
        <table><thead><tr><th>Invoice #</th><th>Status</th><th>Total</th></tr></thead>
          <tbody>{w.invoices.map((i) => (<tr key={i.id}><td><Link href={'/invoices/' + i.id}>{i.invoiceNumber}</Link></td><td>{i.status}</td><td>{formatCents(i.totalCents)}</td></tr>))}</tbody></table>
      )}
    </div>
  </>);
}
