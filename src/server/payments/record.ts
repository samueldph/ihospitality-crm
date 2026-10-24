// Shared, gateway-agnostic "a confirmed payment arrived" writer.
// This is the money-critical path: it is idempotent on the gateway event id,
// takes SELECT ... FOR UPDATE on the invoice (the race we proved is real), and
// never allocates more than the remaining balance.
//
// TODO(repo): fix the import to your actual Prisma client singleton.
import { prisma } from '@/server/db';
import type { PaymentProvider } from '@prisma/client';

export interface GatewayPayment {
  provider: PaymentProvider;      // STRIPE | PAYPAL
  eventId: string;                // gateway event id — the idempotency key
  externalId: string;             // PaymentIntent id / PayPal capture id
  invoiceId: string;
  amountCents: bigint;            // already in integer cents
  currency: string;               // 'USD'
  method: string;                 // 'card' | 'paypal' | ...
  reference?: string;
}

export type RecordResult =
  | { status: 'recorded'; paymentId: string; allocatedCents: bigint; unappliedCents: bigint }
  | { status: 'duplicate' }        // webhook already processed
  | { status: 'rejected'; reason: string };

export async function recordGatewayPayment(p: GatewayPayment): Promise<RecordResult> {
  return prisma.$transaction(async (tx) => {
    // 1) Idempotency: unique (provider,eventId). A re-delivered webhook lands here
    //    and the unique violation => we've already handled it.
    try {
      await tx.webhookEvent.create({
        data: { provider: p.provider, eventId: p.eventId, type: 'payment' },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') return { status: 'duplicate' as const };
      throw e;
    }

    // 2) Lock the invoice row so concurrent credits/payments serialize.
    const locked = await tx.$queryRaw<Array<{ id: string; total_cents: bigint; currency: string }>>`
      SELECT id, total_cents, currency FROM invoices WHERE id = ${p.invoiceId}::uuid FOR UPDATE`;
    if (locked.length === 0) return { status: 'rejected' as const, reason: 'invoice not found' };
    const invoice = locked[0];

    // 3) Currency must match (no USD payment onto a non-USD invoice).
    if (invoice.currency !== p.currency) {
      return { status: 'rejected' as const, reason: `currency mismatch ${p.currency} vs ${invoice.currency}` };
    }

    // 4) Remaining balance = total - issued credits - existing allocations (computed under the lock).
    const [{ credited }] = await tx.$queryRaw<Array<{ credited: bigint }>>`
      SELECT COALESCE(SUM(total_cents),0)::bigint AS credited FROM credit_notes
      WHERE invoice_id = ${p.invoiceId}::uuid AND status = 'ISSUED' AND deleted_at IS NULL`;
    const [{ allocated }] = await tx.$queryRaw<Array<{ allocated: bigint }>>`
      SELECT COALESCE(SUM(amount_cents),0)::bigint AS allocated FROM payment_allocations
      WHERE invoice_id = ${p.invoiceId}::uuid AND deleted_at IS NULL`;
    const balance = invoice.total_cents - credited - allocated;
    if (balance <= 0n) return { status: 'rejected' as const, reason: 'invoice already settled' };

    // 5) Record the Payment (POSTED) and allocate up to the balance; any surplus
    //    is left unapplied on the payment (customer overpaid / paid wrong invoice).
    const applied = p.amountCents < balance ? p.amountCents : balance;
    const payment = await tx.payment.create({
      data: {
        paymentNumber: await nextPaymentNumber(tx),
        status: 'POSTED',
        provider: p.provider,
        currency: p.currency,
        amountCents: p.amountCents,
        method: p.method,
        reference: p.reference ?? null,
        externalId: p.externalId,
      },
    });
    await tx.paymentAllocation.create({
      data: { paymentId: payment.id, invoiceId: p.invoiceId, amountCents: applied },
    });

    return {
      status: 'recorded' as const,
      paymentId: payment.id,
      allocatedCents: applied,
      unappliedCents: p.amountCents - applied,
    };
  }, { isolationLevel: 'Serializable' }); // belt-and-suspenders on top of FOR UPDATE
}

// TODO(repo): replace with your real numbering (sequence/table). Placeholder.
async function nextPaymentNumber(tx: any): Promise<string> {
  const [{ n }] = await tx.$queryRaw<Array<{ n: bigint }>>`SELECT COUNT(*)+1 AS n FROM payments`;
  return `PAY-${String(n).padStart(6, '0')}`;
}
