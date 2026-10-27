'use server';
import { prisma } from '@/server/db';
import { revalidatePath } from 'next/cache';

export async function lookupItem(code: string) {
  const c = (code || '').trim();
  if (!c) return null;
  const item = await prisma.inventoryItem.findFirst({
    where: { deletedAt: null, OR: [{ sku: c }, { serialNo: c }] },
    select: { id: true, sku: true, name: true, quantity: true, location: true, status: true },
  });
  return item;
}

export async function adjustByCode(code: string, delta: number) {
  const c = (code || '').trim();
  const d = Math.trunc(Number(delta)) || 0;
  if (!c) throw new Error('No code');
  const item = await prisma.inventoryItem.findFirst({ where: { deletedAt: null, OR: [{ sku: c }, { serialNo: c }] } });
  if (!item) throw new Error('Item not found: ' + c);
  const next = item.quantity + d;
  if (next < 0) throw new Error('Not enough stock (' + item.quantity + ' on hand)');
  await prisma.inventoryItem.update({ where: { id: item.id }, data: { quantity: next } });
  revalidatePath('/inventory');
  return next;
}
