import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Receta } from '../types/receta';
import { validarTodasLasRecetas, getRecetaVisual } from '../utils/fitnessUtils';

let _cache: Receta[] | null = null;

export async function getRecetas(): Promise<Receta[]> {
  if (_cache) return _cache;
  const snap = await getDocs(collection(db, 'recetas'));
  _cache = snap.docs.map((d) => {
    const receta = { id: d.id, ...d.data() } as Receta;
    // Inyectar imageUrl desde categoría si Firestore no la tiene
    if (!receta.imageUrl && !receta.foto) {
      receta.imageUrl = getRecetaVisual(receta).defaultImageUrl;
    }
    return receta;
  });
  validarTodasLasRecetas(_cache);
  return _cache;
}

export function clearRecetasCache(): void {
  _cache = null;
}
