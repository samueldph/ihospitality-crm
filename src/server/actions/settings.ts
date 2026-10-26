'use server';
import { prisma } from '@/server/db';
import { revalidatePath } from 'next/cache';
export async function createTechnician(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  if (!name) throw new Error('Name is required');
  const email = String(formData.get('email') || '').trim() || null;
  const phone = String(formData.get('phone') || '').trim() || null;
  const payStr = String(formData.get('payRate') || '').trim();
  const payRateCents = payStr ? BigInt(Math.round((parseFloat(payStr) || 0) * 100)) : null;
  const count = await prisma.technician.count();
  const employeeNo = 'T-' + String(count + 1).padStart(4, '0');
  await prisma.technician.create({ data: { name, email, phone, employeeNo, payRateCents } });
  revalidatePath('/settings');
}
export async function createJobType(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  if (!name) throw new Error('Name is required');
  const base = (name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30)) || 'JOB';
  let code = base, n = 1;
  while (await prisma.jobType.findUnique({ where: { code } })) { n++; code = base + '_' + n; }
  await prisma.jobType.create({ data: { code, name } });
  revalidatePath('/settings');
}
