'use server';
import { prisma } from '@/server/db';
import { revalidatePath } from 'next/cache';
async function lockSums(tx: any, invoiceId: string) {
  const inv: any[] = await tx.$queryRaw`SELECT total_cents FROM invoices WHERE id = ${invoiceId}::uuid FOR UPDATE`;
  if (!inv.length) throw new Error('Invoice not found');
  const cr: any[] = await tx.$queryRaw`SELECT COALESCE(SUM(total_cents),0)::bigint AS s FROM credit_notes WHERE invoice_id = ${invoiceId}::uuid AND status = 'ISSUED' AND deleted_at IS NULL`;
  const al: any[] = await tx.$queryRaw`SELECT COALESCE(SUM(amount_cents),0)::bigint AS s FROM payment_allocations WHERE invoice_id = ${invoiceId}::uuid AND deleted_at IS NULL`;
  return { total: BigInt(inv[0].total_cents), credits: BigInt(cr[0].s), alloc: BigInt(al[0].s) };
}
export async function recordPayment(formData: FormData) {
  const invoiceId = String(formData.get('invoiceId'));
  const method = String(formData.get('method') || 'cash');
  const amountCents = BigInt(Math.round((parseFloat(String(formData.get('amount') || '0')) || 0) * 100));
  if (amountCents <= 0n) throw new Error('Amount must be positive');
  await prisma.$transaction(async (tx) => {
    const { total, credits, alloc } = await lockSums(tx, invoiceId);
    const balance = total - credits - alloc;
    if (balance <= 0n) throw new Error('Invoice already settled');
    const applied = amountCents < balance ? amountCents : balance;
    const count = await tx.payment.count();
    const payment = await tx.payment.create({ data: { paymentNumber: 'PAY-' + String(count + 1).padStart(5, '0'), status: 'POSTED', provider: 'MANUAL', currency: 'USD', amountCents, method } });
    await tx.paymentAllocation.create({ data: { paymentId: payment.id, invoiceId, amountCents: applied } });
  });
  revalidatePath('/invoices/' + invoiceId); revalidatePath('/invoices');
}
export async function issueCreditNote(formData: FormData) {
  const invoiceId = String(formData.get('invoiceId'));
  const reason = (String(formData.get('reason') || '').trim()) || 'Adjustment';
  const amountCents = BigInt(Math.round((parseFloat(String(formData.get('amount') || '0')) || 0) * 100));
  if (amountCents <= 0n) throw new Error('Amount must be positive');
  await prisma.$transaction(async (tx) => {
    const { total, credits } = await lockSums(tx, invoiceId);
    if (amountCents > total - credits) throw new Error('Credit exceeds invoice total');
    const count = await tx.creditNote.count();
    await tx.creditNote.create({ data: { creditNumber: 'CN-' + String(count + 1).padStart(5, '0'), invoiceId, status: 'ISSUED', currency: 'USD', totalCents: amountCents, reason, issuedAt: new Date() } });
  });
  revalidatePath('/invoices/' + invoiceId); revalidatePath('/invoices');
}
