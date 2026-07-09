import { supabase } from '../config/supabase';
import type { ShoppingListItemRow, ShoppingListItemInsert } from '../types/supabase';
import type { ItemLista, PrecioSupermercado } from '../types/producto';

/**
 * Lista con comparador de precios (ItemLista): vive en las MISMAS tablas
 * shopping_lists / shopping_list_items que la Lista Universal — una sola
 * lista por usuario, dos vistas (anotación rápida y comparador multi-súper).
 */

const LISTAS = 'shopping_lists';
const ITEMS = 'shopping_list_items';
const NOMBRE_LISTA_DEFAULT = 'Lista del súper';
const STORE_GENERIC = 'generic';

// userId → listId (evita el get-or-create en cada operación)
const _listaIdCache = new Map<string, string>();

async function obtenerListaId(userId: string): Promise<string> {
  const cacheada = _listaIdCache.get(userId);
  if (cacheada) return cacheada;

  // Misma regla que ListaUniversalScreen: la lista más reciente es LA lista
  const { data, error } = await supabase
    .from(LISTAS)
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  let id = data?.id as string | undefined;
  if (!id) {
    const { data: nueva, error: errorCrear } = await supabase
      .from(LISTAS)
      .insert({ user_id: userId, list_name: NOMBRE_LISTA_DEFAULT })
      .select('id')
      .single();
    if (errorCrear) throw errorCrear;
    id = nueva.id as string;
  }
  _listaIdCache.set(userId, id);
  return id;
}

// ─── MAPPERS dominio ↔ fila ──────────────────────────────────────────────────

function rowToItemLista(row: ShoppingListItemRow): ItemLista {
  const precios = (row.all_prices ?? undefined) as PrecioSupermercado[] | undefined;
  return {
    id: row.id,
    productoId: row.product_ref ?? undefined,
    nombre: row.product_name,
    marca: row.brand ?? undefined,
    cantidad: row.quantity,
    unidad: row.unit,
    precioEstimado: row.price ?? undefined,
    supermercado: row.store_name === STORE_GENERIC ? undefined : row.store_name,
    todosLosPrecios: precios?.map((p) => ({
      ...p,
      ultimaActualizacion: new Date(p.ultimaActualizacion), // jsonb → string ISO
    })),
    completado: row.is_checked,
    categoria: row.category ?? undefined,
  };
}

function itemListaToColumns(datos: Partial<Omit<ItemLista, 'id'>>): Partial<ShoppingListItemInsert> {
  const u: Partial<ShoppingListItemInsert> = {};
  if (datos.nombre !== undefined) u.product_name = datos.nombre;
  if ('marca' in datos) u.brand = datos.marca ?? null;
  if (datos.cantidad !== undefined) u.quantity = datos.cantidad;
  if (datos.unidad !== undefined) u.unit = datos.unidad;
  if ('precioEstimado' in datos) u.price = datos.precioEstimado ?? null;
  if ('supermercado' in datos) u.store_name = datos.supermercado ?? STORE_GENERIC;
  if ('todosLosPrecios' in datos) u.all_prices = datos.todosLosPrecios ?? null;
  if (datos.completado !== undefined) u.is_checked = datos.completado;
  if ('categoria' in datos) u.category = datos.categoria ?? null;
  if ('productoId' in datos) u.product_ref = datos.productoId ?? null;
  return u;
}

// ─── CRUD (contratos de services/firestore.ts preservados) ──────────────────

export async function obtenerLista(userId: string): Promise<ItemLista[]> {
  const listId = await obtenerListaId(userId);
  const { data, error } = await supabase
    .from(ITEMS)
    .select('*')
    .eq('list_id', listId)
    .order('created_at');
  if (error) throw error;
  return (data as ShoppingListItemRow[]).map(rowToItemLista);
}

export async function agregarItemLista(
  userId: string,
  item: Omit<ItemLista, 'id'>
): Promise<string> {
  const listId = await obtenerListaId(userId);
  const { data, error } = await supabase
    .from(ITEMS)
    .insert({
      list_id: listId,
      product_name: item.nombre,
      // Explícito (no confiar en el DEFAULT de la tabla): sin tienda = generic
      store_name: item.supermercado ?? STORE_GENERIC,
      ...itemListaToColumns(item),
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function actualizarItemLista(
  _userId: string,
  itemId: string,
  datos: Partial<ItemLista>
): Promise<void> {
  const { error } = await supabase
    .from(ITEMS)
    .update(itemListaToColumns(datos))
    .eq('id', itemId); // RLS vía EXISTS a la lista padre
  if (error) throw error;
}

export async function eliminarItemLista(_userId: string, itemId: string): Promise<void> {
  const { error } = await supabase.from(ITEMS).delete().eq('id', itemId);
  if (error) throw error;
}
