// Stripe: hosted Checkout + webhook. No card data ever touches your server
// (minimal PCI scope — SAQ A). Pin the API version; bump deliberately.
import Stripe from 'stripe';
import { prisma } from '@/server/db';
import { recordGatewayPayment } from './record';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20', // TODO: confirm against current Stripe API + your installed SDK
});

const APP_URL = process.env.APP_URL!; // e.g. https://crm.ihospitality.tv

/** Create a Checkout Session for an invoice's remaining balance, return the redirect URL. */
export async function createStripeCheckout(invoiceId: string) {
  const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  // TODO(repo): compute true remaining balance (total - credits - allocations),
  // ideally via a shared getInvoiceBalance() so link amounts are always current.
  const amountCents = inv.totalCents;

  const checkout = await prisma.paymentCheckout.create({
    data: { invoiceId, provider: 'STRIPE', sessionId: 'pending', amountCents, currency: inv.currency },
  });

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: inv.currency.toLowerCase(),
          unit_amount: Number(amountCents),           // Stripe wants the integer minor unit
          product_data: { name: `Invoice ${inv.invoiceNumber}` },
        },
      }],
      success_url: `${APP_URL}/invoices/${invoiceId}?paid=1`,
      cancel_url: `${APP_URL}/invoices/${invoiceId}?canceled=1`,
      metadata: { invoiceId, checkoutId: checkout.id },
      payment_intent_data: { metadata: { invoiceId, checkoutId: checkout.id } },
    },
    { idempotencyKey: checkout.id }, // safe to retry the create
  );

  await prisma.paymentCheckout.update({ where: { id: checkout.id }, data: { sessionId: session.id } });
  return { url: session.url!, checkoutId: checkout.id };
}

/** Verify + handle a Stripe webhook. `rawBody` MUST be the exact bytes (no JSON re-parse). */
export async function handleStripeWebhook(rawBody: string, signature: string) {
  const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.payment_status !== 'paid') return { ok: true, skipped: 'not paid' };
    const invoiceId = s.metadata?.invoiceId;
    const checkoutId = s.metadata?.checkoutId;
    if (!invoiceId) return { ok: true, skipped: 'no invoiceId' };

    const res = await recordGatewayPayment({
      provider: 'STRIPE',
      eventId: event.id,                               // idempotency key
      externalId: String(s.payment_intent),
      invoiceId,
      amountCents: BigInt(s.amount_total ?? 0),
      currency: (s.currency ?? 'usd').toUpperCase(),
      method: 'card',
      reference: s.id,
    });
    if (checkoutId) {
      await prisma.paymentCheckout.update({
        where: { id: checkoutId },
        data: { status: 'COMPLETED', paymentId: res.status === 'recorded' ? res.paymentId : null },
      }).catch(() => {});
    }
    return { ok: true, result: res };
  }

  // Other useful events to handle later: payment_intent.payment_failed,
  // charge.refunded (-> issue a CreditNote), checkout.session.expired.
  return { ok: true, ignored: event.type };
}
