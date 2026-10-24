import { describe, expect, it } from 'vitest';
import { calculateInvoiceTotals, applyCreditNote, allocatePayment } from '../src/server/finance';

describe('invoice totals and tax', () => {
  it('calculates line extensions and tax in integer cents', () => {
    const result = calculateInvoiceTotals({ currency: 'USD', lines: [
      { quantity: 2, unitPriceCents: 1999, taxRateBps: 825 },
      { quantity: 1, unitPriceCents: 5000, taxRateBps: 0 },
    ] });
    expect(result.subtotalCents).toBe(8998);
    expect(result.taxCents).toBe(330);
    expect(result.totalCents).toBe(9328);
    expect(result.currency).toBe('USD');
  });
  it('rejects negative quantity and invalid tax rate', () => {
    expect(() => calculateInvoiceTotals({ currency: 'USD', lines: [{ quantity: -1, unitPriceCents: 100, taxRateBps: 0 }] })).toThrow();
    expect(() => calculateInvoiceTotals({ currency: 'USD', lines: [{ quantity: 1, unitPriceCents: 100, taxRateBps: 10001 }] })).toThrow();
  });
});

describe('credit note application', () => {
  it('reduces remaining invoice balance without mutating the issued invoice', async () => {
    const invoice = { id: 'inv-1', totalCents: 10000, creditedCents: 0, status: 'ISSUED' as const };
    const result = await applyCreditNote({ invoice, creditCents: 2500, idempotencyKey: 'credit-test-1' });
    expect(result.invoiceBalanceCents).toBe(7500);
    expect(result.invoice.totalCents).toBe(10000);
    expect(result.creditNote.totalCents).toBe(2500);
  });
  it('does not allow credits beyond the available balance', async () => {
    const invoice = { id: 'inv-1', totalCents: 10000, creditedCents: 9000, status: 'ISSUED' as const };
    await expect(applyCreditNote({ invoice, creditCents: 1001, idempotencyKey: 'credit-test-2' })).rejects.toThrow();
  });
});

describe('payment allocation', () => {
  it('allocates payment to invoices and returns unapplied remainder', () => {
    const result = allocatePayment({ paymentCents: 12000, invoices: [
      { id: 'inv-1', balanceCents: 7000 }, { id: 'inv-2', balanceCents: 3000 },
    ] });
    expect(result.allocations).toEqual([{ invoiceId: 'inv-1', amountCents: 7000 }, { invoiceId: 'inv-2', amountCents: 3000 }]);
    expect(result.unappliedCents).toBe(2000);
  });
  it('rejects allocation above payment or invoice balance', () => {
    expect(() => allocatePayment({ paymentCents: 1000, allocations: [{ invoiceId: 'inv-1', amountCents: 1001 }], invoices: [{ id: 'inv-1', balanceCents: 2000 }] })).toThrow();
  });
});
