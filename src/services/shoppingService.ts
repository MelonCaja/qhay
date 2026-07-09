import { supabase } from '../config/supabase';
import type {
  ShoppingListWithItems,
  ShoppingListItemRow,
} from '../types/supabase';
import type { ShoppingList, ShoppingItem } from '../types/firestore';

const LISTAS = 'shopping_lists';
const ITEMS = 'shopping_list_items';

/** Sin amarre a cadena: valor por defecto de store_name en el schema */
const STORE_GENERIC = 'generic';

// ─── MAPPERS fila → dominio ──────────────────────────────────────────────────

function rowToItem(row: ShoppingListItemRow): ShoppingItem {
  return {
    id: row.id,
    productName: row.product_name,
    quantity: row.quantity,
    checked: row.is_checked,
    brand: row.brand,
    price: row.price,
    // 'generic' es detalle de la tabla; el dominio usa null = cualquier tienda
    supermarket: row.store_name === STORE_GENERIC ? null : row.store_name,
  };
}

function rowToList(row: ShoppingListWithItems): ShoppingList {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.list_name,
    createdAt: new Date(row.created_at),
    items: (row.shopping_list_items ?? []).map(rowToItem),
  };
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function createShoppingList(userId: string, name: string): Promise<ShoppingList> {
  const { data, error } = await supabase
    .from(LISTAS)
    .insert({ user_id: userId, list_name: name })
    .select()
    .single();
  if (error) throw error;
  return rowToList({ ...data, shopping_list_items: [] });
}

// JOIN embebido lists ← items: UNA petición, items en orden de creación
export async function getShoppingLists(userId: string): Promise<ShoppingList[]> {
  const { data, error } = await supabase
    .from(LISTAS)
    .select('*, shopping_list_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('created_at', { referencedTable: ITEMS, ascending: true });
  if (error) throw error;
  return (data as ShoppingListWithItems[]).map(rowToList);
}

export async function deleteList(listId: string): Promise<void> {
  // ON DELETE CASCADE elimina los items
  const { error } = await supabase.from(LISTAS).delete().eq('id', listId);
  if (error) throw error;
}

// ─── ITEMS (1 fila por item; RLS vía EXISTS a la lista padre) ────────────────

export async function addItemToList(
  list: ShoppingList,
  productName: string,
  quantity = 1
): Promise<ShoppingItem> {
  const { data, error } = await supabase
    .from(ITEMS)
    .insert({
      list_id: list.id,
      product_name: productName.trim(),
      quantity,
      store_name: STORE_GENERIC, // Lista Universal: anotar sin elegir tienda
    })
    .select()
    .single();
  if (error) throw error;
  return rowToItem(data as ShoppingListItemRow);
}

export async function toggleItemCheck(list: ShoppingList, itemId: string): Promise<ShoppingItem[]> {
  const item = list.items.find((i) => i.id === itemId);
  if (!item) return list.items;
  const { error } = await supabase
    .from(ITEMS)
    .update({ is_checked: !item.checked })
    .eq('id', itemId);
  if (error) throw error;
  return list.items.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i));
}

export async function removeItemFromList(list: ShoppingList, itemId: string): Promise<ShoppingItem[]> {
  const { error } = await supabase.from(ITEMS).delete().eq('id', itemId);
  if (error) throw error;
  return list.items.filter((i) => i.id !== itemId);
}

/** Elimina todos los ítems ya comprados (checked) — 1 DELETE filtrado */
export async function clearCheckedItems(list: ShoppingList): Promise<ShoppingItem[]> {
  const { error } = await supabase
    .from(ITEMS)
    .delete()
    .eq('list_id', list.id)
    .eq('is_checked', true);
  if (error) throw error;
  return list.items.filter((i) => !i.checked);
}
