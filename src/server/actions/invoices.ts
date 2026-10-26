'use server';
import { prisma } from '@/server/db';
import { calculateInvoiceTotals } from '@/server/finance';
import { revalidatePath } from 'next/cache';
type LineIn = { description: string; quantity: number; unitPriceCents: number; taxRateBps: number };
export async function createInvoice(input: { accountId: string; currency: string; lines: LineIn[]; workOrderId?: string | null }) {
  if (!input.accountId) throw new Error('Account is required');
  if (!input.lines.length) throw new Error('Add at least one line');
  const totals = calculateInvoiceTotals({ currency: input.currency, lines: input.lines });
  const count = await prisma.invoice.count();
  const invoiceNumber = 'INV-' + String(count + 1).padStart(5, '0');
  const inv = await prisma.invoice.create({
    data: {
      invoiceNumber, accountId: input.accountId, currency: input.currency, workOrderId: input.workOrderId || null,
      subtotalCents: BigInt(totals.subtotalCents), taxCents: BigInt(totals.taxCents), totalCents: BigInt(totals.totalCents),
      lines: { create: input.lines.map((l) => {
        const ls = l.quantity * l.unitPriceCents; const lt = Math.round(ls * l.taxRateBps / 10000);
        return { description: l.description, quantity: l.quantity, unitPriceCents: BigInt(l.unitPriceCents), taxRateBps: l.taxRateBps, lineSubtotalCents: BigInt(ls), lineTaxCents: BigInt(lt), lineTotalCents: BigInt(ls + lt) };
      }) },
    },
  });
  revalidatePath('/invoices');
  return inv.id;
}
export async function issueInvoice(id: string) {
  await prisma.invoice.updateMany({ where: { id, status: 'DRAFT' }, data: { status: 'ISSUED', issuedAt: new Date() } });
  revalidatePath('/invoices'); revalidatePath('/invoices/' + id);
}
