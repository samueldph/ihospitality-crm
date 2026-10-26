'use server';
import { prisma } from '@/server/db';
import type { AccountKind } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
export async function createAccount(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  if (!name) throw new Error('Name is required');
  const kind = (String(formData.get('kind')) === 'PROPERTY' ? 'PROPERTY' : 'PARENT') as AccountKind;
  const email = String(formData.get('email') || '').trim() || null;
  const phone = String(formData.get('phone') || '').trim() || null;
  const count = await prisma.customerAccount.count();
  const accountNumber = 'ACC-' + String(count + 1).padStart(5, '0');
  await prisma.customerAccount.create({ data: { name, kind, email, phone, accountNumber } });
  revalidatePath('/accounts');
  redirect('/accounts');
}
