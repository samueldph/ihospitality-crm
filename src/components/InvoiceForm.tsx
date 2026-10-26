'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createInvoice } from '@/server/actions/invoices';
type Line = { description: string; qty: string; unit: string; taxPct: string };
export function InvoiceForm({ accounts, initialAccountId, initialDescription, workOrderId }: { accounts: { id: string; name: string; accountNumber: string }[]; initialAccountId?: string; initialDescription?: string; workOrderId?: string }) {
  const router = useRouter();
  const [accountId, setAccountId] = useState(initialAccountId || accounts[0]?.id || '');
  const [lines, setLines] = useState<Line[]>([{ description: initialDescription || '', qty: '1', unit: '0.00', taxPct: '0' }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const upd = (i: number, k: keyof Line, v: string) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const cents = (s: string) => Math.round((parseFloat(s || '0') || 0) * 100);
  const bps = (s: string) => Math.round((parseFloat(s || '0') || 0) * 100);
  let sub = 0, tax = 0;
  for (const l of lines) { const ls = (parseInt(l.qty || '0') || 0) * cents(l.unit); sub += ls; tax += Math.round((ls * bps(l.taxPct)) / 10000); }
  const money = (c: number) => '$' + (c / 100).toFixed(2);
  async function submit() {
    setBusy(true); setError('');
    try {
      const id = await createInvoice({ accountId, currency: 'USD', workOrderId: workOrderId || null, lines: lines.map((l) => ({ description: l.description.trim() || 'Item', quantity: parseInt(l.qty || '0') || 0, unitPriceCents: cents(l.unit), taxRateBps: bps(l.taxPct) })) });
      router.push('/invoices/' + id);
    } catch (e: any) { setError(e?.message || 'Failed to create'); setBusy(false); }
  }
  return (
    <div style={{ maxWidth: 760, marginTop: 8 }}>
      <div className="field"><label>Account</label>
        <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name} ({a.accountNumber})</option>))}
        </select></div>
      <table>
        <thead><tr><th>Description</th><th style={{ width: 70 }}>Qty</th><th style={{ width: 110 }}>Unit $</th><th style={{ width: 90 }}>Tax %</th><th></th></tr></thead>
        <tbody>{lines.map((l, i) => (
          <tr key={i}>
            <td><input className="input" value={l.description} onChange={(e) => upd(i, 'description', e.target.value)} placeholder="Item" /></td>
            <td><input className="input" value={l.qty} onChange={(e) => upd(i, 'qty', e.target.value)} /></td>
            <td><input className="input" value={l.unit} onChange={(e) => upd(i, 'unit', e.target.value)} /></td>
            <td><input className="input" value={l.taxPct} onChange={(e) => upd(i, 'taxPct', e.target.value)} /></td>
            <td>{lines.length > 1 && <button type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>✕</button>}</td>
          </tr>
        ))}</tbody>
      </table>
      <button type="button" onClick={() => setLines((ls) => [...ls, { description: '', qty: '1', unit: '0.00', taxPct: '0' }])} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 10, padding: '9px 14px', cursor: 'pointer', marginTop: 10 }}>+ Add line</button>
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <div className="muted">Subtotal: {money(sub)} · Tax: {money(tax)}</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Total: {money(sub + tax)}</div>
      </div>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      <button className="btn" disabled={busy} onClick={submit} style={{ marginTop: 12 }}>{busy ? 'Creating…' : 'Create invoice'}</button>
    </div>
  );
}
