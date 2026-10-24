// PayPal: Orders v2 (create -> buyer approves -> capture) + webhook verify.
// Amounts are decimal strings in the major unit ("123.45"), so convert cents.
import { prisma } from '@/server/db';
import { recordGatewayPayment } from './record';

const BASE = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const centsToDecimal = (c: bigint) => (Number(c) / 100).toFixed(2);

async function accessToken(): Promise<string> {
  const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw new Error(`paypal token ${r.status}`);
  return (await r.json()).access_token;
}

/** Create a PayPal order for an invoice; return the order id for the JS SDK / approval link. */
export async function createPaypalOrder(invoiceId: string) {
  const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const amountCents = inv.totalCents; // TODO(repo): use true remaining balance
  const checkout = await prisma.paymentCheckout.create({
    data: { invoiceId, provider: 'PAYPAL', sessionId: 'pending', amountCents, currency: inv.currency },
  });

  const token = await accessToken();
  const r = await fetch(`${BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': checkout.id,              // idempotency
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        custom_id: `${invoiceId}:${checkout.id}`,
        invoice_id: inv.invoiceNumber,
        amount: { currency_code: inv.currency, value: centsToDecimal(amountCents) },
      }],
    }),
  });
  if (!r.ok) throw new Error(`paypal create ${r.status}: ${await r.text()}`);
  const order = await r.json();
  await prisma.paymentCheckout.update({ where: { id: checkout.id }, data: { sessionId: order.id } });
  return { orderId: order.id as string, checkoutId: checkout.id };
}

/** Capture an approved order and record the payment (idempotent via capture id). */
export async function capturePaypalOrder(orderId: string) {
  const token = await accessToken();
  const r = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': `cap-${orderId}` },
  });
  if (!r.ok) throw new Error(`paypal capture ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const pu = data.purchase_units?.[0];
  const cap = pu?.payments?.captures?.[0];
  const [invoiceId, checkoutId] = String(pu?.custom_id ?? ':').split(':');
  if (cap?.status !== 'COMPLETED' || !invoiceId) return { ok: true, skipped: 'not completed' };

  const res = await recordGatewayPayment({
    provider: 'PAYPAL',
    eventId: cap.id,                                 // capture id = idempotency key
    externalId: cap.id,
    invoiceId,
    amountCents: BigInt(Math.round(parseFloat(cap.amount.value) * 100)),
    currency: cap.amount.currency_code,
    method: 'paypal',
    reference: orderId,
  });
  if (checkoutId) await prisma.paymentCheckout.update({
    where: { id: checkoutId },
    data: { status: 'COMPLETED', paymentId: res.status === 'recorded' ? res.paymentId : null },
  }).catch(() => {});
  return { ok: true, result: res };
}

/** Verify a PayPal webhook signature server-side (don't trust the body otherwise). */
export async function verifyPaypalWebhook(headers: Record<string, string>, body: string): Promise<boolean> {
  const token = await accessToken();
  const r = await fetch(`${BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: JSON.parse(body),
    }),
  });
  if (!r.ok) return false;
  return (await r.json()).verification_status === 'SUCCESS';
}
