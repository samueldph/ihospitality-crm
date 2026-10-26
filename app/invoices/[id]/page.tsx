import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/server/db';
import { formatCents } from '@/lib/money';
import { issueInvoice } from '@/server/actions/invoices';
import { recordPayment, issueCreditNote } from '@/server/actions/payments';
export const dynamic = 'force-dynamic';
export default async function InvoiceDetail({ params }: { params: { id: string } }) {
  const inv = await prisma.invoice.findUnique({ where: { id: params.id }, include: { account: true, lines: true, creditNotes: { where: { status: 'ISSUED' } }, allocations: { include: { payment: true } } } });
  if (!inv) notFound();
  const credits = inv.creditNotes.reduce((s, c) => s + c.totalCents, 0n);
  const paid = inv.allocations.reduce((s, a) => s + a.amountCents, 0n);
  const balance = inv.totalCents - credits - paid;
  return (<>
    <div className="rowsplit"><h1>{inv.invoiceNumber}</h1><a className="muted" target="_blank" href={`/invoices/${inv.id}/print`} style={{marginRight:12}}>Print / PDF</a><a className="muted" target="_blank" href={`/invoices/${inv.id}/print`} style={{marginRight:12}}>Print / PDF</a><a className="muted" target="_blank" href={`/invoices/${inv.id}/print`} style={{marginRight:12}}>Print / PDF</a><a className="muted" target="_blank" href={`/invoices/${inv.id}/print`} style={{marginRight:12}}>Print / PDF</a><a className="muted" target="_blank" href={`/invoices/${inv.id}/print`} style={{marginRight:12}}>Print / PDF</a><Link className="muted" href="/invoices">← Back</Link></div>
    <p className="muted">{inv.account.name} · <b>{inv.status}</b>{inv.issuedAt ? ' · issued ' + new Date(inv.issuedAt).toLocaleDateString() : ''}</p>
    <table>
      <thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Tax</th><th>Line total</th></tr></thead>
      <tbody>{inv.lines.map((l) => (<tr key={l.id}><td>{l.description}</td><td>{l.quantity}</td><td>{formatCents(l.unitPriceCents)}</td><td>{(l.taxRateBps / 100).toFixed(2)}%</td><td>{formatCents(l.lineTotalCents)}</td></tr>))}</tbody>
    </table>
    <div style={{ marginTop: 16, textAlign: 'right' }}>
      <div className="muted">Subtotal: {formatCents(inv.subtotalCents)} · Tax: {formatCents(inv.taxCents)}</div>
      <div className="muted">Total: {formatCents(inv.totalCents)}{credits > 0n ? ' · Credits: -' + formatCents(credits) : ''}{paid > 0n ? ' · Paid: -' + formatCents(paid) : ''}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Balance: {formatCents(balance)}</div>
    </div>
    {inv.status === 'DRAFT' && (<form action={issueInvoice.bind(null, inv.id)} style={{ marginTop: 16 }}><button className="btn" type="submit">Issue invoice</button></form>)}
    {inv.status === 'ISSUED' && balance > 0n && (
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 20 }}>
        <form action={recordPayment} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <input type="hidden" name="invoiceId" value={inv.id} />
          <div style={{ width: 120 }}><label>Payment $</label><input name="amount" className="input" defaultValue={(Number(balance) / 100).toFixed(2)} /></div>
          <div><label>Method</label><select name="method" className="input"><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="check">Check</option><option value="card">Card</option></select></div>
          <button className="btn" type="submit">Record payment</button>
        </form>
        <form action={issueCreditNote} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <input type="hidden" name="invoiceId" value={inv.id} />
          <div style={{ width: 120 }}><label>Credit $</label><input name="amount" className="input" /></div>
          <div><label>Reason</label><input name="reason" className="input" placeholder="Adjustment" /></div>
          <button type="submit" className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }}>Issue credit</button>
        </form>
      </div>
    )}
    {(inv.allocations.length > 0 || inv.creditNotes.length > 0) && (
      <div style={{ marginTop: 24, display: 'flex', gap: 40, flexWrap: 'wrap' }}>
        <div><h2 style={{ fontSize: 16 }}>Payments</h2>
          {inv.allocations.length === 0 ? <p className="muted">None.</p> : (<table><thead><tr><th>Payment #</th><th>Method</th><th>Amount</th></tr></thead><tbody>{inv.allocations.map((a) => (<tr key={a.id}><td>{a.payment.paymentNumber}</td><td>{a.payment.method}</td><td>{formatCents(a.amountCents)}</td></tr>))}</tbody></table>)}
        </div>
        <div><h2 style={{ fontSize: 16 }}>Credits</h2>
          {inv.creditNotes.length === 0 ? <p className="muted">None.</p> : (<table><thead><tr><th>Credit #</th><th>Reason</th><th>Amount</th></tr></thead><tbody>{inv.creditNotes.map((c) => (<tr key={c.id}><td>{c.creditNumber}</td><td>{c.reason}</td><td>{formatCents(c.totalCents)}</td></tr>))}</tbody></table>)}
        </div>
      </div>
    )}
  </>);
}
