'use server';
import { prisma } from '@/server/db';
import { revalidatePath } from 'next/cache';
export async function consumeInventory(formData: FormData) {
  const workOrderId = String(formData.get('workOrderId'));
  const inventoryItemId = String(formData.get('inventoryItemId'));
  const quantity = parseInt(String(formData.get('quantity') || '0')) || 0;
  if (quantity <= 0) throw new Error('Quantity must be positive');
  await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: inventoryItemId } });
    if (!item) throw new Error('Item not found');
    if (item.quantity < quantity) throw new Error('Not enough stock (' + item.quantity + ' available)');
    await tx.inventoryItem.update({ where: { id: inventoryItemId }, data: { quantity: item.quantity - quantity } });
    await tx.workOrderItem.create({ data: { workOrderId, inventoryItemId, quantity } });
  });
  revalidatePath('/work-orders/' + workOrderId);
  revalidatePath('/inventory');
}
