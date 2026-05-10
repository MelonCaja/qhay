import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Ingrediente } from '../types/ingrediente';
import { ItemLista } from '../types/producto';
import { Usuario } from '../types/usuario';
import { Receta } from '../types/receta';

// ─── USUARIOS ────────────────────────────────────────────────────────────────

export async function crearUsuarioEnFirestore(
  uid: string,
  datos: Omit<Usuario, 'id'>
): Promise<void> {
  await setDoc(doc(db, 'usuarios', uid), datos);
}

export async function obtenerUsuario(uid: string): Promise<Usuario | null> {
  const snap = await getDoc(doc(db, 'usuarios', uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Usuario;
}

export async function actualizarUsuario(uid: string, datos: Partial<Usuario>): Promise<void> {
  await updateDoc(doc(db, 'usuarios', uid), datos as Record<string, unknown>);
}

// ─── DESPENSA ─────────────────────────────────────────────────────────────────

export async function obtenerDespensa(uid: string): Promise<Ingrediente[]> {
  const snap = await getDocs(
    query(collection(db, 'usuarios', uid, 'despensa'), orderBy('nombre'))
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      fechaVencimiento: data.fechaVencimiento
        ? (data.fechaVencimiento as Timestamp).toDate()
        : undefined,
    } as Ingrediente;
  });
}

export async function agregarIngrediente(
  uid: string,
  ingrediente: Omit<Ingrediente, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'usuarios', uid, 'despensa'), {
    ...ingrediente,
    frecuenciaUso: ingrediente.frecuenciaUso ?? 1,
    fechaVencimiento: ingrediente.fechaVencimiento
      ? Timestamp.fromDate(ingrediente.fechaVencimiento)
      : null,
  });
  return ref.id;
}

/** Incrementa el contador de uso de un ingrediente ya existente — 1 write, 0 reads */
export async function incrementarFrecuencia(uid: string, ingredienteId: string): Promise<void> {
  await updateDoc(
    doc(db, 'usuarios', uid, 'despensa', ingredienteId),
    { frecuenciaUso: increment(1) },
  );
}

export async function eliminarIngrediente(uid: string, ingredienteId: string): Promise<void> {
  await deleteDoc(doc(db, 'usuarios', uid, 'despensa', ingredienteId));
}

export async function actualizarIngrediente(
  uid: string,
  ingredienteId: string,
  datos: Partial<Ingrediente>
): Promise<void> {
  await updateDoc(doc(db, 'usuarios', uid, 'despensa', ingredienteId), datos as Record<string, unknown>);
}

// ─── LISTA DE COMPRAS ─────────────────────────────────────────────────────────

export async function obtenerLista(uid: string): Promise<ItemLista[]> {
  const snap = await getDocs(collection(db, 'usuarios', uid, 'lista'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ItemLista);
}

export async function agregarItemLista(
  uid: string,
  item: Omit<ItemLista, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'usuarios', uid, 'lista'), item);
  return ref.id;
}

export async function actualizarItemLista(
  uid: string,
  itemId: string,
  datos: Partial<ItemLista>
): Promise<void> {
  await updateDoc(doc(db, 'usuarios', uid, 'lista', itemId), datos as Record<string, unknown>);
}

export async function eliminarItemLista(uid: string, itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'usuarios', uid, 'lista', itemId));
}

// ─── RECETAS ──────────────────────────────────────────────────────────────────

export async function obtenerRecetas(): Promise<Receta[]> {
  const snap = await getDocs(collection(db, 'recetas'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Receta);
}

export async function guardarRecetasIniciales(recetas: Receta[]): Promise<void> {
  for (const receta of recetas) {
    await setDoc(doc(db, 'recetas', receta.id), receta);
  }
}
