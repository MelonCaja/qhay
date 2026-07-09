import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import type { RecipeWithIngredients, SugerenciaRow } from '../types/supabase';
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

// ─── MAPPERS fila → dominio ──────────────────────────────────────────────────

function baseReceta(row: Omit<RecipeWithIngredients, 'recipe_ingredients' | 'instructions' | 'created_at'>): Omit<Receta, 'ingredientes'> {
  return {
    id: row.id,
    nombre: row.title,
    descripcion: row.description,
    imageUrl: row.image_url ?? undefined,
    utensilios: row.utensils_required,
    pasos: row.steps ?? [],
    tiempoPreparacion: row.prep_time_minutes,
    dificultad: row.difficulty as Receta['dificultad'],
    porciones: row.servings,
    calorias: row.calories ?? undefined,
    macros: row.macros ?? undefined,
    esFitness: row.is_fitness,
    esEstudiante: row.is_student,
    restricciones: row.restrictions,
    temporada: row.seasons.length > 0 ? row.seasons : undefined,
  };
}

function conImagenPorDefecto<T extends Receta>(receta: T): T {
  if (!receta.imageUrl && !receta.foto) {
    receta.imageUrl = getRecetaVisual(receta).defaultImageUrl;
  }
  return receta;
}

function rowToReceta(row: RecipeWithIngredients): Receta {
  return conImagenPorDefecto({
    ...baseReceta(row),
    ingredientes: (row.recipe_ingredients ?? []).map((ri) => ({
      nombre: ri.ingredient_name,
      cantidad: ri.quantity,
      unidad: ri.unit,
      equivalenciaSinBalanza: ri.no_scale_equivalent ?? undefined,
    })),
  });
}

// ─── OBTENCIÓN + CACHÉ OFFLINE ───────────────────────────────────────────────

// JOIN embebido recipes ← recipe_ingredients: UNA petición PostgREST
async function fetchDesdeSupabase(): Promise<Receta[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*, recipe_ingredients(*)')
    .order('title');
  if (error) throw error;
  return (data as RecipeWithIngredients[]).map(rowToReceta);
}

/**
 * Recetas con triple capa: memoria → Supabase → caché offline (AsyncStorage).
 * El caché offline se limita según plan: Free 10 recetas, Premium ilimitadas.
 */
export async function getRecetas(plan: 'gratuito' | 'premium' = 'gratuito'): Promise<Receta[]> {
  if (_cache) return _cache;
  try {
    _cache = await fetchDesdeSupabase();
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
 * Sugerencias vía RPC sugerir_recetas: JOIN recipe_ingredients × pantries del
 * usuario y scoring (coincidencia + urgencia) resueltos en PostgreSQL —
 * UNA petición devuelve recetas + ingredientes + disponibilidad + score.
 */
export async function sugerirRecetasServidor(
  plan: 'gratuito' | 'premium' = 'gratuito'
): Promise<RecetaSugerida[]> {
  const { data, error } = await supabase.rpc('sugerir_recetas');
  if (error) throw error;

  const sugeridas = (data as SugerenciaRow[]).map((row) =>
    conImagenPorDefecto({
      ...baseReceta(row),
      ingredientes: row.ingredients.map((i) => ({
        nombre: i.nombre,
        cantidad: i.cantidad,
        unidad: i.unidad,
        equivalenciaSinBalanza: i.equivalenciaSinBalanza ?? undefined,
        disponibleEnDespensa: i.disponibleEnDespensa,
      })),
      porcentajeCoincidencia: row.match_pct,
      scoreSugerencia: row.score,
      ingredientesPorVencer: row.expiring,
      ingredientesFaltantes: row.missing,
    })
  );

  validarTodasLasRecetas(sugeridas);
  // Alimenta memoria + caché offline: getRecetas no vuelve a pedir
  _cache = sugeridas;
  await guardarCacheOffline(sugeridas, plan);
  return sugeridas;
}

/**
 * Fallback offline: mismo scoring que la RPC pero sobre el caché en memoria.
 * No muta las recetas de entrada (copia ingredientes con disponibilidad).
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

      const ingredientes = r.ingredientes.map((ing) => {
        const nombreIng = norm(ing.nombre);
        const enDespensa = despensaNorm.find(
          (d) => d.nombre.includes(nombreIng) || nombreIng.includes(d.nombre)
        );
        if (!enDespensa) {
          faltantes.push(ing.nombre);
          return { ...ing, disponibleEnDespensa: false };
        }
        aciertos++;
        if (enDespensa.dias !== null && enDespensa.dias >= 0 && enDespensa.dias <= 7) {
          porVencer.push(enDespensa.original);
          // Urgencia: vence en <=2 días pesa el doble
          boostVencimiento += enDespensa.dias <= 2 ? 30 : 15;
        }
        return { ...ing, disponibleEnDespensa: true };
      });

      const total = r.ingredientes.length || 1;
      const coincidencia = Math.round((aciertos / total) * 100);

      return {
        ...r,
        ingredientes,
        porcentajeCoincidencia: coincidencia,
        scoreSugerencia: coincidencia + Math.min(boostVencimiento, 60),
        ingredientesPorVencer: porVencer,
        ingredientesFaltantes: faltantes,
      };
    })
    .sort((a, b) => b.scoreSugerencia - a.scoreSugerencia);
}

/**
 * Orquestador: RPC (1 round trip, JOIN en Postgres) con fallback offline
 * (caché AsyncStorage + scoring en cliente). Nunca lanza si hay caché.
 */
export async function obtenerSugerencias(
  despensa: Ingrediente[],
  plan: 'gratuito' | 'premium' = 'gratuito'
): Promise<RecetaSugerida[]> {
  try {
    return await sugerirRecetasServidor(plan);
  } catch {
    const recetas = await getRecetas(plan); // resuelve desde memoria/offline
    return sugerirRecetas(recetas, despensa);
  }
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
