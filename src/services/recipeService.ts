import { collection, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';
import { Receta } from '../types/receta';
import { Ingrediente } from '../types/ingrediente';
import { validarTodasLasRecetas, getRecetaVisual } from '../utils/fitnessUtils';
import { diasParaVencer } from '../utils/fechaHelper';

const CACHE_KEY = '@qhay_recetas_offline';

/** Límite de recetas en caché offline según plan */
export const LIMITE_CACHE_FREE = 10;

let _cache: Receta[] | null = null;

const norm = (s: string) =>
  s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// ─── OBTENCIÓN + CACHÉ OFFLINE ───────────────────────────────────────────────

async function fetchDesdeFirestore(): Promise<Receta[]> {
  // Colección nueva /recipes; fallback a legacy /recetas si aún no hay datos migrados
  let snap = await getDocs(collection(db, 'recipes'));
  if (snap.empty) snap = await getDocs(collection(db, 'recetas'));
  return snap.docs.map((d) => {
    const receta = { id: d.id, ...d.data() } as Receta;
    if (!receta.imageUrl && !receta.foto) {
      receta.imageUrl = getRecetaVisual(receta).defaultImageUrl;
    }
    return receta;
  });
}

/**
 * Recetas con triple capa: memoria → Firestore → caché offline (AsyncStorage).
 * El caché offline se limita según plan: Free 10 recetas, Premium ilimitadas.
 */
export async function getRecetas(plan: 'gratuito' | 'premium' = 'gratuito'): Promise<Receta[]> {
  if (_cache) return _cache;
  try {
    _cache = await fetchDesdeFirestore();
    validarTodasLasRecetas(_cache);
    await guardarCacheOffline(_cache, plan);
    return _cache;
  } catch {
    // Sin conexión: usar caché offline
    const offline = await cargarCacheOffline();
    if (offline.length > 0) {
      _cache = offline;
      return offline;
    }
    throw new Error('Sin conexión y sin recetas en caché');
  }
}

async function guardarCacheOffline(recetas: Receta[], plan: 'gratuito' | 'premium'): Promise<void> {
  const aGuardar = plan === 'premium' ? recetas : recetas.slice(0, LIMITE_CACHE_FREE);
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(aGuardar));
  } catch {
    // Caché llena o storage no disponible: no es fatal
  }
}

async function cargarCacheOffline(): Promise<Receta[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Receta[]) : [];
  } catch {
    return [];
  }
}

export function clearRecetasCache(): void {
  _cache = null;
}

// ─── MOTOR DE SUGERENCIAS ────────────────────────────────────────────────────

export interface RecetaSugerida extends Receta {
  porcentajeCoincidencia: number;
  scoreSugerencia: number;        // coincidencia + urgencia por vencimiento
  ingredientesPorVencer: string[]; // ingredientes de la receta que vencen pronto
  ingredientesFaltantes: string[];
}

/**
 * Ordena recetas por: % de ingredientes disponibles + boost por ingredientes
 * de la despensa próximos a vencer (prioriza cocinar lo que se va a perder).
 * Todo en cliente — 0 lecturas Firestore.
 */
export function sugerirRecetas(recetas: Receta[], despensa: Ingrediente[]): RecetaSugerida[] {
  const despensaNorm = despensa.map((i) => ({
    nombre: norm(i.nombre),
    dias: diasParaVencer(i.fechaVencimiento),
    original: i.nombre,
  }));

  return recetas
    .map((r) => {
      let aciertos = 0;
      const porVencer: string[] = [];
      const faltantes: string[] = [];
      let boostVencimiento = 0;

      for (const ing of r.ingredientes) {
        const nombreIng = norm(ing.nombre);
        const enDespensa = despensaNorm.find(
          (d) => d.nombre.includes(nombreIng) || nombreIng.includes(d.nombre)
        );
        if (!enDespensa) {
          faltantes.push(ing.nombre);
          continue;
        }
        aciertos++;
        if (enDespensa.dias !== null && enDespensa.dias >= 0 && enDespensa.dias <= 7) {
          porVencer.push(enDespensa.original);
          // Urgencia: vence en <=2 días pesa el doble
          boostVencimiento += enDespensa.dias <= 2 ? 30 : 15;
        }
      }

      const total = r.ingredientes.length || 1;
      const coincidencia = Math.round((aciertos / total) * 100);

      return {
        ...r,
        porcentajeCoincidencia: coincidencia,
        scoreSugerencia: coincidencia + Math.min(boostVencimiento, 60),
        ingredientesPorVencer: porVencer,
        ingredientesFaltantes: faltantes,
      };
    })
    .sort((a, b) => b.scoreSugerencia - a.scoreSugerencia);
}

// ─── FILTRO POR UTENSILIOS (cliente) ─────────────────────────────────────────

/** true si el usuario tiene todos los utensilios que requiere la receta */
export function recetaRealizable(receta: Receta, utensiliosUsuario: string[]): boolean {
  if (!receta.utensilios || receta.utensilios.length === 0) return true;
  const propios = utensiliosUsuario.map(norm);
  return receta.utensilios.every((u) => {
    const req = norm(u);
    return propios.some((p) => p.includes(req) || req.includes(p));
  });
}

export function filtrarPorUtensilios<T extends Receta>(
  recetas: T[],
  utensiliosUsuario: string[]
): T[] {
  if (utensiliosUsuario.length === 0) return recetas;
  return recetas.filter((r) => recetaRealizable(r, utensiliosUsuario));
}
