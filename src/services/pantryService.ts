import { supabase } from '../config/supabase';
import type { PantryRow, PantryInsert, PantryUpdate } from '../types/supabase';
import type { Ingrediente } from '../types/ingrediente';
import type { IngredienteReceta } from '../types/receta';

const TABLA = 'pantries';

// ─── MAPPERS dominio ↔ tabla ─────────────────────────────────────────────────

// expires_at es DATE ('YYYY-MM-DD'): parsear a medianoche LOCAL — con new Date
// directo sería medianoche UTC y en Chile (UTC-4) el día se corre hacia atrás.
const aFechaLocal = (iso: string | null): Date | undefined =>
  iso ? new Date(`${iso}T00:00:00`) : undefined;

const aFechaISO = (fecha?: Date): string | null =>
  fecha
    ? `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
    : null;

export function pantryRowToIngrediente(row: PantryRow): Ingrediente {
  return {
    id: row.id,
    nombre: row.product_name,
    marca: row.brand ?? undefined,
    cantidad: row.quantity,
    unidad: row.unit,
    fechaVencimiento: aFechaLocal(row.expires_at),
    categoria: row.category ?? undefined,
    imageUrl: row.image_url ?? undefined,
    precioUnitario: row.unit_price ?? undefined,
    supermercado: row.supermarket ?? undefined,
    frecuenciaUso: row.usage_count,
    agregadoPor: row.added_by as Ingrediente['agregadoPor'],
  };
}

function ingredienteToUpdate(datos: Partial<Ingrediente>): PantryUpdate {
  const u: PantryUpdate = {};
  if (datos.nombre !== undefined) u.product_name = datos.nombre;
  if (datos.marca !== undefined) u.brand = datos.marca ?? null;
  if (datos.cantidad !== undefined) u.quantity = datos.cantidad;
  if (datos.unidad !== undefined) u.unit = datos.unidad;
  if ('fechaVencimiento' in datos) u.expires_at = aFechaISO(datos.fechaVencimiento);
  if (datos.categoria !== undefined) u.category = datos.categoria ?? null;
  if (datos.imageUrl !== undefined) u.image_url = datos.imageUrl ?? null;
  if (datos.precioUnitario !== undefined) u.unit_price = datos.precioUnitario ?? null;
  if (datos.supermercado !== undefined) u.supermarket = datos.supermercado ?? null;
  if (datos.frecuenciaUso !== undefined) u.usage_count = datos.frecuenciaUso;
  return u;
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function obtenerItems(userId: string): Promise<Ingrediente[]> {
  const { data, error } = await supabase
    .from(TABLA)
    .select('*')
    .eq('user_id', userId)
    .order('product_name');
  if (error) throw error;
  return (data as PantryRow[]).map(pantryRowToIngrediente);
}

export async function agregarItem(
  userId: string,
  item: Omit<Ingrediente, 'id'>
): Promise<string> {
  const payload: PantryInsert = {
    user_id: userId,
    product_name: item.nombre,
    brand: item.marca ?? null,
    quantity: item.cantidad,
    unit: item.unidad,
    expires_at: aFechaISO(item.fechaVencimiento),
    category: item.categoria ?? null,
    image_url: item.imageUrl ?? null,
    unit_price: item.precioUnitario ?? null,
    supermarket: item.supermercado ?? null,
    added_by: item.agregadoPor,
    usage_count: item.frecuenciaUso ?? 1,
  };
  const { data, error } = await supabase.from(TABLA).insert(payload).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function actualizarItem(
  id: string,
  datos: Partial<Ingrediente>
): Promise<void> {
  const { error } = await supabase
    .from(TABLA)
    .update({ ...ingredienteToUpdate(datos), updated_at: new Date().toISOString() })
    .eq('id', id); // RLS restringe a filas propias
  if (error) throw error;
}

export async function eliminarItem(id: string): Promise<void> {
  const { error } = await supabase.from(TABLA).delete().eq('id', id);
  if (error) throw error;
}

/** Sube el contador de uso al valor calculado en memoria — 1 write, 0 reads */
export async function incrementarFrecuencia(id: string, nuevoValor: number): Promise<void> {
  await actualizarItem(id, { frecuenciaUso: nuevoValor });
}

// ─── RECETA REALIZADA: descuento automático ──────────────────────────────────

export interface DescuentoReceta {
  itemId: string;
  nombre: string;
  cantidadUsada: number;
  cantidadRestante: number; // <= 0 → se elimina la fila
}

const norm = (s: string) =>
  s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Cruza los ingredientes de una receta con la despensa en memoria (0 reads).
 * Si la unidad coincide descuenta la cantidad de la receta;
 * si difiere, descuenta 1 unidad como aproximación conservadora.
 */
export function calcularDescuentos(
  ingredientesReceta: IngredienteReceta[],
  despensa: Ingrediente[]
): DescuentoReceta[] {
  const descuentos: DescuentoReceta[] = [];
  for (const ing of ingredientesReceta) {
    const item = despensa.find(
      (d) => norm(d.nombre).includes(norm(ing.nombre)) || norm(ing.nombre).includes(norm(d.nombre))
    );
    if (!item) continue;
    const mismaUnidad = norm(item.unidad) === norm(ing.unidad);
    const usada = mismaUnidad ? ing.cantidad : 1;
    descuentos.push({
      itemId: item.id,
      nombre: item.nombre,
      cantidadUsada: usada,
      cantidadRestante: item.cantidad - usada,
    });
  }
  return descuentos;
}

/**
 * Aplica los descuentos vía RPC descontar_receta (schema.sql): 1 round trip,
 * transacción atómica, updates + deletes juntos, RLS del invocador.
 */
export async function aplicarDescuentos(descuentos: DescuentoReceta[]): Promise<void> {
  if (descuentos.length === 0) return;
  const { error } = await supabase.rpc('descontar_receta', {
    descuentos: descuentos.map((d) => ({
      item_id: d.itemId,
      cantidad_restante: d.cantidadRestante,
    })),
  });
  if (error) throw error;
}
