/**
 * InventoryItem shape (Firestore/Supabase document/row)
 * {
 *   id: string,
 *   name: string,
 *   quantity: number,
 *   unit: string,           // e.g. "pcs", "kg", "L", "packs"
 *   category: string,       // e.g. "dairy", "produce", "spices"
 *   addedAt: string,        // ISO-8601
 *   expiresAt: string|null, // ISO-8601
 *   lowStockThreshold: number
 * }
 */

function createInventoryItem({
  name,
  quantity,
  unit,
  category = "uncategorized",
  expiresAt = null,
  lowStockThreshold = 1,
}) {
  return {
    id: crypto.randomUUID(),
    name,
    quantity,
    unit,
    category,
    addedAt: new Date().toISOString(),
    expiresAt,
    lowStockThreshold,
  };
}

module.exports = { createInventoryItem };
