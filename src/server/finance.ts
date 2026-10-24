// Pure money math for invoices, credits, and payment allocation.
// Integer cents throughout. These are the functions the finance tests cover;
// the DB-backed persistence (with SELECT ... FOR UPDATE) lives in
// src/server/payments/record.ts and reuses the same rules.

export interface InvoiceLineInput { quantity: number; unitPriceCents: number; taxRateBps: number; }
export interface InvoiceTotals { subtotalCents: number; taxCents: number; totalCents: number; currency: string; }

function assertInt(n: number, label: string) {
  if (!Number.isInteger(n)) throw new Error(`${label} must be an integer`);
}

/** Line extensions + tax, per-line rounded, summed. */
export function calculateInvoiceTotals(input: { currency: string; lines: InvoiceLineInput[] }): InvoiceTotals {
  let subtotalCents = 0;
  let taxCents = 0;
  for (const l of input.lines) {
    assertInt(l.quantity, 'quantity');
    assertInt(l.unitPriceCents, 'unitPriceCents');
    assertInt(l.taxRateBps, 'taxRateBps');
    if (l.quantity < 0) throw new Error('quantity cannot be negative');
    if (l.unitPriceCents < 0) throw new Error('unitPriceCents cannot be negative');
    if (l.taxRateBps < 0 || l.taxRateBps > 10000) throw new Error('taxRateBps out of range (0..10000)');
    const lineSubtotal = l.quantity * l.unitPriceCents;
    const lineTax = Math.round((lineSubtotal * l.taxRateBps) / 10000);
    subtotalCents += lineSubtotal;
    taxCents += lineTax;
  }
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents, currency: input.currency };
}

export interface CreditableInvoice { id: string; totalCents: number; creditedCents: number; status: 'ISSUED' | string; }

/** Compute the effect of a credit note without mutating the issued invoice. */
export async function applyCreditNote(params: {
  invoice: CreditableInvoice; creditCents: number; idempotencyKey: string;
}): Promise<{ invoiceBalanceCents: number; invoice: CreditableInvoice; creditNote: { totalCents: number } }> {
  const { invoice, creditCents } = params;
  assertInt(creditCents, 'creditCents');
  if (creditCents <= 0) throw new Error('creditCents must be positive');
  if (invoice.status !== 'ISSUED') throw new Error('can only credit an ISSUED invoice');
  const available = invoice.totalCents - invoice.creditedCents;
  if (creditCents > available) throw new Error('credit exceeds available balance');
  return {
    invoiceBalanceCents: available - creditCents,
    invoice,
    creditNote: { totalCents: creditCents },
  };
}

export interface InvoiceBalance { id: string; balanceCents: number; }
export interface Allocation { invoiceId: string; amountCents: number; }

/**
 * Two shapes:
 *  - { paymentCents, invoices }              -> auto-allocate greedily, oldest first
 *  - { paymentCents, allocations, invoices } -> validate an explicit allocation set
 */
export function allocatePayment(params: {
  paymentCents: number; invoices: InvoiceBalance[]; allocations?: Allocation[];
}): { allocations: Allocation[]; unappliedCents: number } {
  const { paymentCents, invoices } = params;
  assertInt(paymentCents, 'paymentCents');
  if (paymentCents <= 0) throw new Error('paymentCents must be positive');
  const byId = new Map(invoices.map((i) => [i.id, i]));

  if (params.allocations) {
    let sum = 0;
    for (const a of params.allocations) {
      const inv = byId.get(a.invoiceId);
      if (!inv) throw new Error(`unknown invoice ${a.invoiceId}`);
      assertInt(a.amountCents, 'amountCents');
      if (a.amountCents <= 0) throw new Error('allocation amount must be positive');
      if (a.amountCents > inv.balanceCents) throw new Error('allocation exceeds invoice balance');
      sum += a.amountCents;
    }
    if (sum > paymentCents) throw new Error('allocations exceed payment');
    return { allocations: params.allocations, unappliedCents: paymentCents - sum };
  }

  const allocations: Allocation[] = [];
  let remaining = paymentCents;
  for (const inv of invoices) {
    if (remaining <= 0) break;
    const amt = Math.min(remaining, inv.balanceCents);
    if (amt > 0) { allocations.push({ invoiceId: inv.id, amountCents: amt }); remaining -= amt; }
  }
  return { allocations, unappliedCents: remaining };
}
