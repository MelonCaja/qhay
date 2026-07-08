import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
  increment,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { PantryItem, PantryItemDoc } from '../types/firestore';
import type { IngredienteReceta } from '../types/receta';

const itemsCol = (uid: string) => collection(db, 'pantries', uid, 'items');
const itemDoc = (uid: string, id: string) => doc(db, 'pantries', uid, 'items', id);

const aDate = (v: unknown): Date | undefined =>
  v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : undefined;

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function obtenerItems(uid: string): Promise<PantryItem[]> {
  const snap = await getDocs(query(itemsCol(uid), orderBy('nombre')));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      fechaVencimiento: aDate(data.fechaVencimiento),
      actualizadoEn: aDate(data.actualizadoEn) ?? new Date(),
    } as PantryItem;
  });
}

export async function agregarItem(
  uid: string,
  item: Omit<PantryItemDoc, 'actualizadoEn'>
): Promise<string> {
  const ref = await addDoc(itemsCol(uid), {
    ...item,
    frecuenciaUso: item.frecuenciaUso ?? 1,
    fechaVencimiento: item.fechaVencimiento
      ? Timestamp.fromDate(item.fechaVencimiento as Date)
      : null,
    actualizadoEn: Timestamp.now(),
  });
  return ref.id;
}

export async function actualizarItem(
  uid: string,
  id: string,
  datos: Partial<PantryItemDoc>
): Promise<void> {
  await updateDoc(itemDoc(uid, id), {
    ...datos,
    ...(datos.fechaVencimiento instanceof Date
      ? { fechaVencimiento: Timestamp.fromDate(datos.fechaVencimiento) }
      : {}),
    actualizadoEn: Timestamp.now(),
  } as Record<string, unknown>);
}

export async function eliminarItem(uid: string, id: string): Promise<void> {
  await deleteDoc(itemDoc(uid, id));
}

/** Incrementa el contador de uso — 1 write, 0 reads */
export async function incrementarFrecuencia(uid: string, id: string): Promise<void> {
  await updateDoc(itemDoc(uid, id), { frecuenciaUso: increment(1) });
}

// ─── RECETA REALIZADA: descuento automático ──────────────────────────────────

export interface DescuentoReceta {
  itemId: string;
  nombre: string;
  cantidadUsada: number;
  cantidadRestante: number; // <= 0 → se elimina el documento
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
  despensa: PantryItem[]
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

/** Aplica los descuentos en un solo batch (1 commit) */
export async function aplicarDescuentos(
  uid: string,
  descuentos: DescuentoReceta[]
): Promise<void> {
  if (descuentos.length === 0) return;
  const batch = writeBatch(db);
  for (const d of descuentos) {
    const ref = itemDoc(uid, d.itemId);
    if (d.cantidadRestante <= 0) {
      batch.delete(ref);
    } else {
      batch.update(ref, {
        cantidad: d.cantidadRestante,
        frecuenciaUso: increment(1),
        actualizadoEn: Timestamp.now(),
      });
    }
  }
  await batch.commit();
}
