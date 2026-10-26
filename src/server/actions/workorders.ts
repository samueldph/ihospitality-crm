'use server';
import { prisma } from '@/server/db';
import type { WorkOrderStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
export async function createWorkOrder(input: { accountId: string; jobTypeId: string; technicianId?: string | null; line1: string; city: string; region?: string; scheduledAt?: string | null; summary?: string; }) {
  if (!input.accountId) throw new Error('Account is required');
  if (!input.jobTypeId) throw new Error('Job type is required');
  if (!input.line1 || !input.city) throw new Error('Service address is required');
  const addr = await prisma.serviceAddress.create({ data: { accountId: input.accountId, line1: input.line1, city: input.city, region: input.region || null, country: 'US' } });
  const count = await prisma.workOrder.count();
  const orderNumber = 'WO-' + String(count + 1).padStart(5, '0');
  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
  const wo = await prisma.workOrder.create({ data: { orderNumber, accountId: input.accountId, serviceAddressId: addr.id, jobTypeId: input.jobTypeId, technicianId: input.technicianId || null, status: scheduledAt ? 'SCHEDULED' : 'DRAFT', scheduledAt, summary: input.summary || null } });
  revalidatePath('/work-orders');
  return wo.id;
}
export async function updateWorkOrderStatus(formData: FormData) {
  const id = String(formData.get('id'));
  const status = String(formData.get('status')) as WorkOrderStatus;
  const data: any = { status };
  if (status === 'COMPLETED') data.completedAt = new Date();
  await prisma.workOrder.update({ where: { id }, data });
  revalidatePath('/work-orders'); revalidatePath('/work-orders/' + id);
}
