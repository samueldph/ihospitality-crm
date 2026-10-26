import { prisma } from '@/server/db';
import { formatCents } from '@/lib/money';
import { createTechnician, createJobType } from '@/server/actions/settings';
export const dynamic = 'force-dynamic';
export default async function SettingsPage() {
  const [techs, jobTypes] = await Promise.all([
    prisma.technician.findMany({ orderBy: { name: 'asc' } }),
    prisma.jobType.findMany({ orderBy: { name: 'asc' } }),
  ]);
  return (<>
    <h1>Settings</h1>
    <section style={{ marginTop: 16 }}>
      <h2 style={{ fontSize: 16 }}>Technicians</h2>
      {techs.length === 0 ? <p className="muted">None yet.</p> : (
        <table><thead><tr><th>Emp #</th><th>Name</th><th>Email</th><th>Phone</th><th>Pay rate</th></tr></thead>
          <tbody>{techs.map((t) => (<tr key={t.id}><td>{t.employeeNo}</td><td>{t.name}</td><td>{t.email ?? '—'}</td><td>{t.phone ?? '—'}</td><td>{t.payRateCents != null ? formatCents(t.payRateCents) : '—'}</td></tr>))}</tbody></table>
      )}
      <form action={createTechnician} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 12, maxWidth: 820 }}>
        <div><label>Name *</label><input name="name" className="input" required /></div>
        <div><label>Email</label><input name="email" className="input" type="email" /></div>
        <div><label>Phone</label><input name="phone" className="input" /></div>
        <div style={{ width: 110 }}><label>Pay rate $</label><input name="payRate" className="input" /></div>
        <button className="btn" type="submit">Add</button>
      </form>
    </section>
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 16 }}>Job types</h2>
      {jobTypes.length === 0 ? <p className="muted">None yet.</p> : (
        <table><thead><tr><th>Code</th><th>Name</th></tr></thead><tbody>{jobTypes.map((j) => (<tr key={j.id}><td>{j.code}</td><td>{j.name}</td></tr>))}</tbody></table>
      )}
      <form action={createJobType} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 12, maxWidth: 440 }}>
        <div style={{ flex: 1 }}><label>Name *</label><input name="name" className="input" required /></div>
        <button className="btn" type="submit">Add</button>
      </form>
    </section>
  </>);
}
