import { prisma } from '@/server/db';
import { formatCents } from '@/lib/money';
import { createInventoryItem, adjustStock } from '@/server/actions/inventory';
export const dynamic = 'force-dynamic';
export default async function InventoryPage() {
  const items = await prisma.inventoryItem.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' }, take: 300 });
  return (<>
    <h1>Inventory</h1>
    {items.length === 0 ? <p className="muted">No items yet.</p> : (
      <table><thead><tr><th>SKU</th><th>Name</th><th>Qty</th><th>Unit cost</th><th>Location</th><th>Adjust</th></tr></thead>
        <tbody>{items.map((it) => (
          <tr key={it.id}>
            <td>{it.sku}</td><td>{it.name}</td><td>{it.quantity}</td><td>{formatCents(it.unitCostCents)}</td><td>{it.location ?? '—'}</td>
            <td><form action={adjustStock} style={{ display: 'flex', gap: 6 }}><input type="hidden" name="id" value={it.id} /><input name="delta" className="input" style={{ width: 70 }} placeholder="+/-" /><button className="btn" type="submit" style={{ padding: '6px 10px' }}>Apply</button></form></td>
          </tr>
        ))}</tbody></table>
    )}
    <h2 style={{ fontSize: 16, marginTop: 24 }}>Add item</h2>
    <form action={createInventoryItem} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', maxWidth: 940, marginTop: 8 }}>
      <div style={{ flex: 1, minWidth: 160 }}><label>Name *</label><input name="name" className="input" required /></div>
      <div style={{ width: 140 }}><label>SKU</label><input name="sku" className="input" placeholder="auto" /></div>
      <div style={{ width: 80 }}><label>Qty</label><input name="quantity" className="input" defaultValue="0" /></div>
      <div style={{ width: 110 }}><label>Unit cost $</label><input name="unitCost" className="input" defaultValue="0.00" /></div>
      <div style={{ width: 150 }}><label>Location</label><input name="location" className="input" /></div>
      <button className="btn" type="submit">Add</button>
    </form>
  </>);
}
