import type { CSSProperties } from 'react';
import { prisma } from '@/server/db';

export const dynamic = 'force-dynamic';

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
function parseDate(s: string | undefined, fallback: Date) {
  if (!s) return fallback;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? fallback : d;
}
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default async function TechProductivityPage({ searchParams }: { searchParams: { from?: string | string[]; to?: string | string[] } }) {
  const now = new Date();
  const from = parseDate(first(searchParams.from), new Date(now.getTime() - 30 * 86400000));
  const toRaw = parseDate(first(searchParams.to), now);
  const to = new Date(toRaw.getFullYear(), toRaw.getMonth(), toRaw.getDate(), 23, 59, 59, 999);

  const [techs, scheduled, completed, openNow] = await Promise.all([
    prisma.technician.findMany({ where: { active: true, deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, employeeNo: true } }),
    prisma.workOrder.groupBy({ by: ['technicianId'], where: { deletedAt: null, technicianId: { not: null }, scheduledAt: { gte: from, lte: to } }, _count: { _all: true } }),
    prisma.workOrder.groupBy({ by: ['technicianId'], where: { deletedAt: null, technicianId: { not: null }, status: 'COMPLETED', completedAt: { gte: from, lte: to } }, _count: { _all: true } }),
    prisma.workOrder.groupBy({ by: ['technicianId'], where: { deletedAt: null, technicianId: { not: null }, status: { in: ['SCHEDULED', 'DISPATCHED', 'IN_PROGRESS'] } }, _count: { _all: true } }),
  ]);

  const toMap = (rows: { technicianId: string | null; _count: { _all: number } }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) if (r.technicianId) m.set(r.technicianId, r._count._all);
    return m;
  };
  const sMap = toMap(scheduled), cMap = toMap(completed), oMap = toMap(openNow);

  const rows = techs.map((t) => ({ ...t, s: sMap.get(t.id) || 0, c: cMap.get(t.id) || 0, o: oMap.get(t.id) || 0 }));
  const tot = rows.reduce((a, r) => ({ s: a.s + r.s, c: a.c + r.c, o: a.o + r.o }), { s: 0, c: 0, o: 0 });

  const th: CSSProperties = { textAlign: 'right', padding: '8px 10px', fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', borderBottom: '1px solid var(--border)' };
  const thL: CSSProperties = { ...th, textAlign: 'left' };
  const td: CSSProperties = { textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid var(--border)' };
  const tdL: CSSProperties = { ...td, textAlign: 'left' };
  const ftd: CSSProperties = { ...td, fontWeight: 700, borderTop: '2px solid var(--border)' };

  return (
    <section>
      <h1 style={{ marginBottom: 4 }}>Technician productivity</h1>
      <p className="muted" style={{ marginTop: 4 }}>Jobs scheduled and completed per technician in the selected range. &quot;Open now&quot; is current assigned workload, any date.</p>

      <form method="get" className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', marginBottom: 20 }}>
        <div><label>From</label><input className="input" type="date" name="from" defaultValue={ymd(from)} /></div>
        <div><label>To</label><input className="input" type="date" name="to" defaultValue={ymd(to)} /></div>
        <button className="btn" type="submit">Apply</button>
      </form>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead><tr>
            <th style={thL}>Technician</th>
            <th style={th}>Scheduled</th>
            <th style={th}>Completed</th>
            <th style={th}>Open now</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td style={tdL} colSpan={4}><span className="muted">No active technicians - add them under Settings.</span></td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td style={tdL}>{r.name} <span className="muted" style={{ fontSize: 12 }}>{r.employeeNo}</span></td>
                <td style={td}>{r.s}</td>
                <td style={{ ...td, color: r.c > 0 ? '#4ade80' : undefined, fontWeight: 600 }}>{r.c}</td>
                <td style={td}>{r.o}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot><tr>
              <td style={{ ...tdL, fontWeight: 700, borderTop: '2px solid var(--border)' }}>Total</td>
              <td style={ftd}>{tot.s}</td>
              <td style={ftd}>{tot.c}</td>
              <td style={ftd}>{tot.o}</td>
            </tr></tfoot>
          )}
        </table>
      </div>
    </section>
  );
}
