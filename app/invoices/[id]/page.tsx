import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/server/db';
import { formatCents } from '@/lib/money';
import { issueInvoice } from '@/server/actions/invoices';
export const dynamic = 'force-dynamic';
export default async function InvoiceDetail({ params }: { params: { id: string } }) {
  const inv = await prisma.invoice.findUnique({ where: { id: params.id }, include: { account: true, lines: true } });
  if (!inv) notFound();
  return (<>
    <div className="rowsplit"><h1>{inv.invoiceNumber}</h1><Link className="muted" href="/invoices">← Back</Link></div>
    <p className="muted">{inv.account.name} · <b>{inv.status}</b>{inv.issuedAt ? ' · issued ' + new Date(inv.issuedAt).toLocaleDateString() : ''}</p>
    <table>
      <thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Tax</th><th>Line total</th></tr></thead>
      <tbody>{inv.lines.map((l) => (
        <tr key={l.id}><td>{l.description}</td><td>{l.quantity}</td><td>{formatCents(l.unitPriceCents)}</td><td>{(l.taxRateBps / 100).toFixed(2)}%</td><td>{formatCents(l.lineTotalCents)}</td></tr>
      ))}</tbody>
    </table>
    <div style={{ marginTop: 16, textAlign: 'right' }}>
      <div className="muted">Subtotal: {formatCents(inv.subtotalCents)}</div>
      <div className="muted">Tax: {formatCents(inv.taxCents)}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>Total: {formatCents(inv.totalCents)}</div>
    </div>
    {inv.status === 'DRAFT' && (
      <form action={issueInvoice.bind(null, inv.id)} style={{ marginTop: 16 }}><button className="btn" type="submit">Issue invoice</button></form>
    )}
  </>);
}
