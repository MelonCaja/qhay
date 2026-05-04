import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Receta } from '../types/receta';
import { validarTodasLasRecetas } from '../utils/fitnessUtils';

let _cache: Receta[] | null = null;

export async function getRecetas(): Promise<Receta[]> {
  if (_cache) return _cache;
  const snap = await getDocs(collection(db, 'recetas'));
  _cache = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Receta);
  validarTodasLasRecetas(_cache);
  return _cache;
}

export function clearRecetasCache(): void {
  _cache = null;
}
