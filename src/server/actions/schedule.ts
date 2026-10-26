'use server';
import { prisma } from '@/server/db';
import { revalidatePath } from 'next/cache';

const ALLOWED = ['SCHEDULED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
type WoStatus = (typeof ALLOWED)[number];

function touch(id: string) {
  revalidatePath('/dispatch');
  revalidatePath('/work-orders');
  revalidatePath('/work-orders/' + id);
}

export async function scheduleWorkOrder(formData: FormData) {
  const id = String(formData.get('workOrderId') || '');
  const techId = String(formData.get('technicianId') || '').trim();
  const whenRaw = String(formData.get('scheduledAt') || '').trim();
  if (!id) throw new Error('Missing work order');
  const scheduledAt = whenRaw ? new Date(whenRaw) : null;
  const data: { technicianId: string | null; scheduledAt: Date | null; status?: 'SCHEDULED' } = {
    technicianId: techId || null,
    scheduledAt,
  };
  const wo = await prisma.workOrder.findUnique({ where: { id }, select: { status: true } });
  if (wo && wo.status === 'DRAFT' && scheduledAt) data.status = 'SCHEDULED';
  await prisma.workOrder.update({ where: { id }, data });
  touch(id);
}

export async function unscheduleWorkOrder(formData: FormData) {
  const id = String(formData.get('workOrderId') || '');
  if (!id) throw new Error('Missing work order');
  const wo = await prisma.workOrder.findUnique({ where: { id }, select: { status: true } });
  const data: { scheduledAt: null; technicianId: null; status?: 'DRAFT' } = { scheduledAt: null, technicianId: null };
  if (wo && wo.status === 'SCHEDULED') data.status = 'DRAFT';
  await prisma.workOrder.update({ where: { id }, data });
  touch(id);
}

export async function setWorkOrderStatus(formData: FormData) {
  const id = String(formData.get('workOrderId') || '');
  const status = String(formData.get('status') || '') as WoStatus;
  if (!id) throw new Error('Missing work order');
  if (!ALLOWED.includes(status)) throw new Error('Invalid status');
  const data: { status: WoStatus; completedAt: Date | null } = {
    status,
    completedAt: status === 'COMPLETED' ? new Date() : null,
  };
  await prisma.workOrder.update({ where: { id }, data });
  touch(id);
}

export async function reassignTechnician(formData: FormData) {
  const id = String(formData.get('workOrderId') || '');
  const techId = String(formData.get('technicianId') || '').trim();
  if (!id) throw new Error('Missing work order');
  await prisma.workOrder.update({ where: { id }, data: { technicianId: techId || null } });
  touch(id);
}
