import { prisma } from '@/server/db';
import { QrLabels } from '@/components/QrLabels';

export const dynamic = 'force-dynamic';

export default async function LabelsPage() {
  const items = await prisma.inventoryItem.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    select: { sku: true, name: true },
  });
  return <QrLabels items={items} />;
}
