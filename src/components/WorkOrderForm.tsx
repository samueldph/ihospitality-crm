'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createWorkOrder } from '@/server/actions/workorders';
type Opt = { id: string; name: string };
export function WorkOrderForm({ accounts, jobTypes, technicians }: { accounts: { id: string; name: string; accountNumber: string }[]; jobTypes: Opt[]; technicians: Opt[] }) {
  const router = useRouter();
  const [f, setF] = useState({ accountId: accounts[0]?.id ?? '', jobTypeId: jobTypes[0]?.id ?? '', technicianId: '', line1: '', city: '', region: '', scheduledAt: '', summary: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  async function submit() {
    setBusy(true); setError('');
    try {
      const id = await createWorkOrder({ ...f, technicianId: f.technicianId || null, scheduledAt: f.scheduledAt || null });
      router.push('/work-orders/' + id);
    } catch (e: any) { setError(e?.message || 'Failed to create'); setBusy(false); }
  }
  return (
    <div style={{ maxWidth: 560, marginTop: 8 }}>
      <div className="field"><label>Account</label><select className="input" value={f.accountId} onChange={(e) => set('accountId', e.target.value)}>{accounts.map((a) => (<option key={a.id} value={a.id}>{a.name} ({a.accountNumber})</option>))}</select></div>
      <div className="field"><label>Job type</label><select className="input" value={f.jobTypeId} onChange={(e) => set('jobTypeId', e.target.value)}>{jobTypes.map((j) => (<option key={j.id} value={j.id}>{j.name}</option>))}</select></div>
      <div className="field"><label>Technician</label><select className="input" value={f.technicianId} onChange={(e) => set('technicianId', e.target.value)}><option value="">Unassigned</option>{technicians.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}</select></div>
      <div className="field"><label>Service address</label><input className="input" placeholder="Street address" value={f.line1} onChange={(e) => set('line1', e.target.value)} /></div>
      <div className="field" style={{ display: 'flex', gap: 10 }}><div style={{ flex: 1 }}><label>City</label><input className="input" value={f.city} onChange={(e) => set('city', e.target.value)} /></div><div style={{ flex: 1 }}><label>State/Region</label><input className="input" value={f.region} onChange={(e) => set('region', e.target.value)} /></div></div>
      <div className="field"><label>Scheduled (optional)</label><input className="input" type="datetime-local" value={f.scheduledAt} onChange={(e) => set('scheduledAt', e.target.value)} /></div>
      <div className="field"><label>Summary</label><input className="input" placeholder="Short description" value={f.summary} onChange={(e) => set('summary', e.target.value)} /></div>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      <button className="btn" disabled={busy} onClick={submit} style={{ marginTop: 8 }}>{busy ? 'Creating…' : 'Create work order'}</button>
    </div>
  );
}
