// Money is integer cents (BigInt in the DB). Format only at the edges.
export function formatCents(cents: bigint | number, currency = 'USD'): string {
  const n = typeof cents === 'bigint' ? Number(cents) : cents;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n / 100);
}
