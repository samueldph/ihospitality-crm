'use server';
import { prisma } from '@/server/db';
import { revalidatePath } from 'next/cache';
export async function createInventoryItem(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  if (!name) throw new Error('Name is required');
  let sku = String(formData.get('sku') || '').trim();
  if (!sku) { const c = await prisma.inventoryItem.count(); sku = 'SKU-' + String(c + 1).padStart(5, '0'); }
  const quantity = parseInt(String(formData.get('quantity') || '0')) || 0;
  const unitCostCents = BigInt(Math.round((parseFloat(String(formData.get('unitCost') || '0')) || 0) * 100));
  const location = String(formData.get('location') || '').trim() || null;
  await prisma.inventoryItem.create({ data: { name, sku, quantity, unitCostCents, location } });
  revalidatePath('/inventory');
}
export async function adjustStock(formData: FormData) {
  const id = String(formData.get('id'));
  const delta = parseInt(String(formData.get('delta') || '0')) || 0;
  if (delta === 0) return;
  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) throw new Error('Item not found');
  await prisma.inventoryItem.update({ where: { id }, data: { quantity: Math.max(0, item.quantity + delta) } });
  revalidatePath('/inventory');
}
