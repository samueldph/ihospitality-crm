// Seed roles, permissions, and ONE real admin — no insecure demo logins.
// Set ADMIN_EMAIL and ADMIN_PASSWORD in the environment before running
//   npm run prisma:seed
// If they're absent the admin is skipped (so the seed is safe to re-run in CI).
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PERMISSIONS = [
  ['account.read', 'View customer accounts'],
  ['account.write', 'Edit customer accounts'],
  ['workorder.manage', 'Create and dispatch work orders'],
  ['invoice.manage', 'Create and issue invoices'],
  ['invoice.collect', 'Create payment links and record payments'],
  ['inventory.manage', 'Manage inventory'],
  ['admin', 'Full administrative access'],
] as const;

async function main() {
  for (const [key, label] of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key }, update: { label }, create: { key, label } });
  }
  const admin = await prisma.role.upsert({
    where: { name: 'Administrator' }, update: {}, create: { name: 'Administrator', description: 'Full access' },
  });
  const perms = await prisma.permission.findMany();
  for (const p of perms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: admin.id, permissionId: p.id } },
      update: {}, create: { roleId: admin.id, permissionId: p.id },
    });
  }

  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.upsert({
      where: { email }, update: { passwordHash, status: 'ACTIVE' },
      create: { email, name: 'Administrator', passwordHash, status: 'ACTIVE' },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: admin.id } },
      update: {}, create: { userId: user.id, roleId: admin.id },
    });
    console.log(`Seeded admin ${email}`);
  } else {
    console.log('ADMIN_EMAIL/ADMIN_PASSWORD not set — skipped admin user creation.');
  }
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
