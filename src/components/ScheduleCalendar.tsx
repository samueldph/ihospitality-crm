import Link from 'next/link';
import { prisma } from '@/server/db';

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: '#196DD4', DISPATCHED: '#7c3aed', IN_PROGRESS: '#d97706', COMPLETED: '#16a34a', DRAFT: '#64748b',
};

export async function ScheduleCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const wos = await prisma.workOrder.findMany({
    where: { scheduledAt: { gte: monthStart, lte: monthEnd }, deletedAt: null, status: { notIn: ['CANCELLED'] } },
    include: { account: { select: { name: true } }, technician: { select: { name: true } } },
    orderBy: { scheduledAt: 'asc' },
  });

  type Row = (typeof wos)[number];
  const byDay = new Map<number, Row[]>();
  for (const w of wos) {
    const d = (w.scheduledAt as Date).getDate();
    const arr = byDay.get(d) || [];
    arr.push(w);
    byDay.set(d, arr);
  }

  const firstWeekday = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const today = now.getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>Schedule - {monthLabel}</h3>
        <span className="muted" style={{ fontSize: 13 }}>{wos.length} job{wos.length === 1 ? '' : 's'} this month</span>
        <Link href="/dispatch" className="btn" style={{ marginLeft: 'auto', padding: '6px 12px' }}>Open dispatch</Link>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, minWidth: 540 }}>
          {dow.map((d) => (
            <div key={d} style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '.04em', padding: '2px 0' }}>{d}</div>
          ))}
          {cells.map((d, idx) => {
            if (d === null) return <div key={'e' + idx} />;
            const jobs = byDay.get(d) || [];
            const isToday = d === today;
            return (
              <div key={d} style={{ minHeight: 80, border: '1px solid var(--border)', borderRadius: 8, padding: '4px 5px', background: isToday ? 'var(--surface-2)' : 'transparent', outline: isToday ? '2px solid var(--brand)' : 'none' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: isToday ? 'var(--brand-2)' : 'var(--muted)', marginBottom: 3 }}>{d}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {jobs.slice(0, 3).map((w) => {
                    const t = (w.scheduledAt as Date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    return (
                      <Link key={w.id} href={`/work-orders/${w.id}`} title={`${t} ${w.account?.name}${w.technician?.name ? ' - ' + w.technician.name : ''}`} style={{ display: 'block', fontSize: 11, padding: '1px 4px', borderRadius: 4, background: STATUS_COLORS[w.status] || '#64748b', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}>
                        {t} {w.account?.name}
                      </Link>
                    );
                  })}
                  {jobs.length > 3 && <Link href="/dispatch" style={{ fontSize: 11, color: 'var(--muted)' }}>+{jobs.length - 3} more</Link>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ScheduleCalendar;
