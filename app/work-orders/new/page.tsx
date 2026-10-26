import Link from 'next/link';
import { prisma } from '@/server/db';
import { WorkOrderForm } from '@/components/WorkOrderForm';
export const dynamic = 'force-dynamic';
export default async function NewWorkOrder() {
  const [accounts, jobTypes, technicians] = await Promise.all([
    prisma.customerAccount.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, accountNumber: true } }),
    prisma.jobType.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.technician.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);
  return (<>
    <div className="rowsplit"><h1>New work order</h1><Link className="muted" href="/work-orders">← Back</Link></div>
    {accounts.length === 0 ? <p className="muted">Create a customer account first.</p>
      : jobTypes.length === 0 ? <p className="muted">No job types yet — run the seed, then reload.</p>
      : <WorkOrderForm accounts={accounts} jobTypes={jobTypes} technicians={technicians} />}
  </>);
}
