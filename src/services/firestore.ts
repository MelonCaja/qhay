import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ItemLista } from '../types/producto';
import { Usuario } from '../types/usuario';

// ─── USUARIOS (colección /users — ver userService.ts) ───────────────────────

export async function obtenerUsuario(uid: string): Promise<Usuario | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) return { id: snap.id, ...snap.data() } as Usuario;

  // Automigración: cuentas creadas antes del cambio de colección viven en /usuarios
  const legacy = await getDoc(doc(db, 'usuarios', uid));
  if (!legacy.exists()) return null;

  const datos = legacy.data();
  try {
    await setDoc(doc(db, 'users', uid), datos);
  } catch (error) {
    console.error('[firestore] No se pudo migrar /usuarios → /users:', error);
  }
  return { id: legacy.id, ...datos } as Usuario;
}

export async function actualizarUsuario(uid: string, datos: Partial<Usuario>): Promise<void> {
  await updateDoc(doc(db, 'users', uid), datos as Record<string, unknown>);
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
