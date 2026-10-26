import Link from 'next/link';
import { prisma } from '@/server/db';
import { scheduleWorkOrder, unscheduleWorkOrder, setWorkOrderStatus, reassignTechnician } from '@/server/actions/schedule';

export const dynamic = 'force-dynamic';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#64748b', SCHEDULED: '#196DD4', DISPATCHED: '#7c3aed',
  IN_PROGRESS: '#d97706', COMPLETED: '#16a34a', CANCELLED: '#dc2626',
};
const NEXT: Record<string, { to: string; label: string }> = {
  SCHEDULED: { to: 'DISPATCHED', label: 'Dispatch' },
  DISPATCHED: { to: 'IN_PROGRESS', label: 'Start' },
  IN_PROGRESS: { to: 'COMPLETED', label: 'Complete' },
};
function Badge({ s }: { s: string }) {
  return (
    <span style={{ background: STATUS_COLORS[s] || '#64748b', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, letterSpacing: '.02em' }}>
      {s.replace('_', ' ')}
    </span>
  );
}
const addr = (s: { label?: string | null; line1?: string | null; city?: string | null } | null) =>
  s ? [s.label, s.line1, s.city].filter(Boolean).join(' - ') : '';

const ghostBtn = { background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', padding: '6px 10px' } as const;

export default async function DispatchPage() {
  const [scheduled, unscheduled, techs] = await Promise.all([
    prisma.workOrder.findMany({
      where: { scheduledAt: { not: null }, deletedAt: null, status: { notIn: ['CANCELLED', 'COMPLETED'] } },
      include: { account: true, technician: true, serviceAddress: true },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.workOrder.findMany({
      where: { scheduledAt: null, deletedAt: null, status: { notIn: ['CANCELLED', 'COMPLETED'] } },
      include: { account: true, serviceAddress: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.technician.findMany({ where: { active: true, deletedAt: null }, orderBy: { name: 'asc' } }),
  ]);

  type Row = (typeof scheduled)[number];
  const groups: { key: string; label: string; items: Row[] }[] = [];
  for (const w of scheduled) {
    const d = w.scheduledAt as Date;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, label: d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }), items: [] };
      groups.push(g);
    }
    g.items.push(w);
  }

  const techOptions = techs.map((t) => ({ id: t.id, name: t.name }));

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <h1 style={{ margin: 0 }}>Dispatch</h1>
        <Link className="btn" href="/work-orders/new" style={{ marginLeft: 'auto' }}>New work order</Link>
      </div>
      <p className="muted" style={{ marginTop: 4 }}>Schedule, assign, and move jobs through dispatch to done.</p>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Needs scheduling ({unscheduled.length})</h3>
        {unscheduled.length === 0 ? (
          <p className="muted">Nothing waiting - every open work order is on the schedule.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {unscheduled.map((w) => (
              <form key={w.id} action={scheduleWorkOrder} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <input type="hidden" name="workOrderId" value={w.id} />
                <div style={{ minWidth: 220, flex: '1 1 220px' }}>
                  <Link href={`/work-orders/${w.id}`} style={{ fontWeight: 600 }}>{w.orderNumber}</Link>
                  <div className="muted" style={{ fontSize: 13 }}>{w.account?.name}{addr(w.serviceAddress) ? ' - ' + addr(w.serviceAddress) : ''}</div>
                </div>
                <select name="technicianId" className="input" style={{ width: 'auto', minWidth: 150 }} defaultValue="">
                  <option value="">- technician -</option>
                  {techOptions.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
                <input type="datetime-local" name="scheduledAt" className="input" style={{ width: 'auto' }} required />
                <button className="btn" type="submit">Schedule</button>
              </form>
            ))}
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="card"><p className="muted">No scheduled work orders yet.</p></div>
      ) : (
        groups.map((g) => (
          <div className="card" key={g.key} style={{ marginBottom: 16 }}>
            <h3>{g.label}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {g.items.map((w) => {
                const d = w.scheduledAt as Date;
                const next = NEXT[w.status];
                return (
                  <div key={w.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <div style={{ width: 74, fontWeight: 700 }}>{d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                    <div style={{ minWidth: 190, flex: '1 1 190px' }}>
                      <Link href={`/work-orders/${w.id}`} style={{ fontWeight: 600 }}>{w.orderNumber}</Link>
                      <div className="muted" style={{ fontSize: 13 }}>{w.account?.name}{addr(w.serviceAddress) ? ' - ' + addr(w.serviceAddress) : ''}</div>
                    </div>
                    <form action={reassignTechnician} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="hidden" name="workOrderId" value={w.id} />
                      <select name="technicianId" className="input" defaultValue={w.technicianId ?? ''} style={{ width: 'auto', minWidth: 130 }}>
                        <option value="">Unassigned</option>
                        {techOptions.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                      </select>
                      <button className="btn" type="submit" style={ghostBtn}>Save</button>
                    </form>
                    <Badge s={w.status} />
                    {next && (
                      <form action={setWorkOrderStatus}>
                        <input type="hidden" name="workOrderId" value={w.id} />
                        <input type="hidden" name="status" value={next.to} />
                        <button className="btn" type="submit">{next.label}</button>
                      </form>
                    )}
                    <form action={unscheduleWorkOrder} style={{ marginLeft: 'auto' }}>
                      <input type="hidden" name="workOrderId" value={w.id} />
                      <button className="btn" type="submit" style={ghostBtn}>Unschedule</button>
                    </form>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </section>
  );
}
