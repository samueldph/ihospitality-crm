import Link from 'next/link';
import type { CSSProperties } from 'react';
import { prisma } from '@/server/db';

export const dynamic = 'force-dynamic';

const fmt = (c: bigint) => '$' + (Number(c) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const BUCKETS = ['0-30', '31-60', '61-90', '90+'];
function bucketIndex(days: number) {
  if (days <= 30) return 0;
  if (days <= 60) return 1;
  if (days <= 90) return 2;
  return 3;
}

export default async function ArAgingPage() {
  const invoices = await prisma.invoice.findMany({
    where: { status: 'ISSUED', deletedAt: null },
    include: {
      account: { select: { id: true, name: true, accountNumber: true } },
      allocations: { where: { deletedAt: null }, include: { payment: { select: { status: true } } } },
      creditNotes: { where: { status: 'ISSUED', deletedAt: null }, select: { totalCents: true } },
    },
  });

  type Open = { id: string; number: string; accountId: string; accountName: string; issued: Date; days: number; balance: bigint; bucket: number };
  const open: Open[] = [];
  for (const inv of invoices) {
    const paid = inv.allocations.filter((a) => a.payment?.status === 'POSTED').reduce((s, a) => s + a.amountCents, 0n);
    const credited = inv.creditNotes.reduce((s, c) => s + c.totalCents, 0n);
    const balance = inv.totalCents - paid - credited;
    if (balance <= 0n) continue;
    const issued = inv.issuedAt ?? inv.createdAt;
    const days = Math.max(0, Math.floor((Date.now() - issued.getTime()) / 86400000));
    open.push({ id: inv.id, number: inv.invoiceNumber, accountId: inv.accountId, accountName: inv.account.name, issued, days, balance, bucket: bucketIndex(days) });
  }

  type Acct = { id: string; name: string; buckets: bigint[]; total: bigint };
  const byAcct = new Map<string, Acct>();
  const totals: bigint[] = [0n, 0n, 0n, 0n];
  let grand = 0n;
  for (const o of open) {
    let a = byAcct.get(o.accountId);
    if (!a) { a = { id: o.accountId, name: o.accountName, buckets: [0n, 0n, 0n, 0n], total: 0n }; byAcct.set(o.accountId, a); }
    a.buckets[o.bucket] += o.balance;
    a.total += o.balance;
    totals[o.bucket] += o.balance;
    grand += o.balance;
  }
  const accounts = [...byAcct.values()].sort((x, y) => (y.total > x.total ? 1 : -1));
  open.sort((a, b) => b.days - a.days);

  const th: CSSProperties = { textAlign: 'right', padding: '8px 10px', fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', borderBottom: '1px solid var(--border)' };
  const thL: CSSProperties = { ...th, textAlign: 'left' };
  const td: CSSProperties = { textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid var(--border)' };
  const tdL: CSSProperties = { ...td, textAlign: 'left' };
  const ftd: CSSProperties = { ...td, fontWeight: 700, borderTop: '2px solid var(--border)' };

  return (
    <section>
      <h1 style={{ marginBottom: 4 }}>Accounts receivable - aging</h1>
      <p className="muted" style={{ marginTop: 4 }}>Open balances on issued invoices, aged by invoice date. {open.length} open invoice{open.length === 1 ? '' : 's'}.</p>

      <div className="card" style={{ marginBottom: 20, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead><tr>
            <th style={thL}>Account</th>
            {BUCKETS.map((b) => <th key={b} style={th}>{b} days</th>)}
            <th style={th}>Total due</th>
          </tr></thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr><td style={tdL} colSpan={6}><span className="muted">No open receivables - everything issued is paid.</span></td></tr>
            ) : accounts.map((a) => (
              <tr key={a.id}>
                <td style={tdL}><Link href={`/accounts/${a.id}`}>{a.name}</Link></td>
                {a.buckets.map((c, i) => <td key={i} style={{ ...td, color: i >= 2 && c > 0n ? '#f87171' : undefined }}>{c > 0n ? fmt(c) : '-'}</td>)}
                <td style={{ ...td, fontWeight: 700 }}>{fmt(a.total)}</td>
              </tr>
            ))}
          </tbody>
          {accounts.length > 0 && (
            <tfoot><tr>
              <td style={{ ...tdL, fontWeight: 700, borderTop: '2px solid var(--border)' }}>Total</td>
              {totals.map((c, i) => <td key={i} style={ftd}>{c > 0n ? fmt(c) : '-'}</td>)}
              <td style={{ ...ftd, fontWeight: 800 }}>{fmt(grand)}</td>
            </tr></tfoot>
          )}
        </table>
      </div>

      {open.length > 0 && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <h3>Open invoices (oldest first)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead><tr>
              <th style={thL}>Invoice</th><th style={thL}>Account</th>
              <th style={th}>Issued</th><th style={th}>Age</th><th style={th}>Bucket</th><th style={th}>Balance</th>
            </tr></thead>
            <tbody>
              {open.map((o) => (
                <tr key={o.id}>
                  <td style={tdL}><Link href={`/invoices/${o.id}`} style={{ fontWeight: 600 }}>{o.number}</Link></td>
                  <td style={tdL}>{o.accountName}</td>
                  <td style={td}>{o.issued.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td style={td}>{o.days}d</td>
                  <td style={td}>{BUCKETS[o.bucket]}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{fmt(o.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
