import { notFound } from 'next/navigation';
import { prisma } from '@/server/db';
import { formatCents } from '@/lib/money';
import { PrintTrigger } from '@/components/PrintTrigger';
export const dynamic = 'force-dynamic';
export default async function InvoicePrint({ params }: { params: { id: string } }) {
  const inv = await prisma.invoice.findUnique({ where: { id: params.id }, include: { account: true, lines: true, creditNotes: { where: { status: 'ISSUED' } }, allocations: true } });
  if (!inv) notFound();
  const credits = inv.creditNotes.reduce((s, c) => s + c.totalCents, 0n);
  const paid = inv.allocations.reduce((s, a) => s + a.amountCents, 0n);
  const balance = inv.totalCents - credits - paid;
  const th = { textAlign: 'right' as const, padding: '8px 6px', color: '#555', fontSize: 12 };
  const td = { textAlign: 'right' as const, padding: '8px 6px' };
  return (
    <div className="invoice-print" style={{ maxWidth: 760, margin: '0 auto', background: '#fff', color: '#111', padding: '28px 32px', borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div><img src="/logo.svg" alt="IHospitality" height={34} /></div>
        <div style={{ textAlign: 'right' }}><div style={{ fontSize: 24, fontWeight: 700 }}>INVOICE</div><div style={{ color: '#666' }}>{inv.invoiceNumber}</div><div style={{ color: '#666', fontSize: 13 }}>{inv.status}{inv.issuedAt ? ' · ' + new Date(inv.issuedAt).toLocaleDateString() : ''}</div></div>
      </div>
      <div style={{ marginBottom: 18 }}><div style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em' }}>Bill to</div><div style={{ fontWeight: 600 }}>{inv.account.name}</div><div style={{ color: '#666', fontSize: 13 }}>{inv.account.accountNumber}{inv.account.email ? ' · ' + inv.account.email : ''}</div></div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ borderBottom: '2px solid #ddd' }}><th style={{ ...th, textAlign: 'left' }}>Description</th><th style={th}>Qty</th><th style={th}>Unit</th><th style={th}>Tax</th><th style={th}>Amount</th></tr></thead>
        <tbody>{inv.lines.map((l) => (<tr key={l.id} style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '8px 6px' }}>{l.description}</td><td style={td}>{l.quantity}</td><td style={td}>{formatCents(l.unitPriceCents)}</td><td style={td}>{(l.taxRateBps / 100).toFixed(2)}%</td><td style={td}>{formatCents(l.lineTotalCents)}</td></tr>))}</tbody>
      </table>
      <div style={{ marginTop: 18, textAlign: 'right' }}>
        <div style={{ color: '#666' }}>Subtotal: {formatCents(inv.subtotalCents)}</div>
        <div style={{ color: '#666' }}>Tax: {formatCents(inv.taxCents)}</div>
        {credits > 0n && <div style={{ color: '#666' }}>Credits: -{formatCents(credits)}</div>}
        {paid > 0n && <div style={{ color: '#666' }}>Paid: -{formatCents(paid)}</div>}
        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8, borderTop: '2px solid #ddd', paddingTop: 8, display: 'inline-block' }}>Balance due: {formatCents(balance)}</div>
      </div>
      <PrintTrigger />
    </div>
  );
}
