import Link from 'next/link';
import { prisma } from '@/server/db';
import { InvoiceForm } from '@/components/InvoiceForm';
export const dynamic = 'force-dynamic';
export default async function NewInvoice({ searchParams }: { searchParams: { account?: string; wo?: string; desc?: string } }) {
  const accounts = await prisma.customerAccount.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, accountNumber: true } });
  return (<>
    <div className="rowsplit"><h1>New invoice</h1><Link className="muted" href="/invoices">← Back</Link></div>
    {accounts.length === 0 ? <p className="muted">Create a customer account first.</p>
      : <InvoiceForm accounts={accounts} initialAccountId={searchParams.account} initialDescription={searchParams.desc} workOrderId={searchParams.wo} />}
  </>);
}
