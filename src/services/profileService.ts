import { supabase } from '../config/supabase';
import type { ProfileRow, ProfileUpdate } from '../types/supabase';
import type { Usuario } from '../types/usuario';

const TABLA = 'profiles';

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function obtenerPerfil(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from(TABLA)
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Self-heal: crea la fila de profiles si el trigger handle_new_user no corrió
 * (usuarios registrados antes de la migración). RLS permite insert own-row.
 */
export async function crearPerfilBase(userId: string, nombre: string): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from(TABLA)
    .insert({ id: userId, name: nombre })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function actualizarPerfil(userId: string, datos: ProfileUpdate): Promise<void> {
  const { error } = await supabase.from(TABLA).update(datos).eq('id', userId);
  if (error) throw error;
}

// ─── ONBOARDING ──────────────────────────────────────────────────────────────

export interface DatosOnboarding {
  esEstudiante: boolean;
  gustos: string[];
  presupuestoSemanal?: number;
  utensilios: string[];
  restriccionesAlimentarias: string[];
  tiempoCocina: number;
}

export async function completarOnboarding(
  userId: string,
  datos: DatosOnboarding
): Promise<void> {
  await actualizarPerfil(userId, {
    is_student: datos.esEstudiante,
    tastes: datos.gustos,
    weekly_budget: datos.presupuestoSemanal ?? null,
    kitchen_utensils: datos.utensilios,
    dietary_restrictions: datos.restriccionesAlimentarias,
    cooking_time_minutes: datos.tiempoCocina,
    onboarding_completed: true,
  });
}

// ─── MAPPERS dominio ↔ fila ──────────────────────────────────────────────────

/** Fila de profiles → Usuario del dominio. email/foto vienen de auth.users. */
export function perfilToUsuario(
  row: ProfileRow,
  auth: { email: string; foto?: string }
): Usuario {
  return {
    id: row.id,
    nombre: row.name,
    email: auth.email,
    foto: row.avatar_url ?? auth.foto,
    plan: row.plan_type,
    esEstudiante: row.is_student,
    estudianteVerificado: row.is_baes_verified,
    restriccionesAlimentarias: row.dietary_restrictions,
    tiempoCocina: row.cooking_time_minutes,
    presupuestoSemanal: row.weekly_budget ?? undefined,
    supermercadoFavorito: row.favorite_supermarket ?? undefined,
    onboardingCompletado: row.onboarding_completed,
    fechaRegistro: new Date(row.created_at),
    gustos: row.tastes,
    utensilios: row.kitchen_utensils,
    baes: row.baes_active
      ? {
          activo: true,
          montoDiario: row.baes_daily_amount ?? 0,
          ...(row.baes_institution ? { institucion: row.baes_institution } : {}),
        }
      : undefined,
    limites: {
      escaneosBoletaMes: row.monthly_scan_count,
      mesReferencia: row.scan_month_ref,
      recetasCacheadas: row.cached_recipes_count,
    },
  };
}

/** Partial<Usuario> del dominio → payload de update de profiles */
export function usuarioToProfileUpdate(datos: Partial<Usuario>): ProfileUpdate {
  const u: ProfileUpdate = {};
  if (datos.nombre !== undefined) u.name = datos.nombre;
  if (datos.foto !== undefined) u.avatar_url = datos.foto ?? null;
  if (datos.plan !== undefined) u.plan_type = datos.plan;
  if (datos.esEstudiante !== undefined) u.is_student = datos.esEstudiante;
  if (datos.estudianteVerificado !== undefined) u.is_baes_verified = datos.estudianteVerificado;
  if (datos.restriccionesAlimentarias !== undefined) u.dietary_restrictions = datos.restriccionesAlimentarias;
  if (datos.tiempoCocina !== undefined) u.cooking_time_minutes = datos.tiempoCocina;
  if ('presupuestoSemanal' in datos) u.weekly_budget = datos.presupuestoSemanal ?? null;
  if ('supermercadoFavorito' in datos) u.favorite_supermarket = datos.supermercadoFavorito ?? null;
  if (datos.onboardingCompletado !== undefined) u.onboarding_completed = datos.onboardingCompletado;
  if (datos.gustos !== undefined) u.tastes = datos.gustos;
  if (datos.utensilios !== undefined) u.kitchen_utensils = datos.utensilios;
  if ('baes' in datos) {
    u.baes_active = datos.baes?.activo ?? false;
    u.baes_daily_amount = datos.baes?.montoDiario ?? null;
    u.baes_institution = datos.baes?.institucion ?? null;
  }
  return u;
}

/**
 * Actualiza el perfil recibiendo campos del dominio Usuario (contrato que
 * antes vivía en services/firestore.ts — BAESScreen y PerfilScreen).
 */
export async function actualizarUsuario(userId: string, datos: Partial<Usuario>): Promise<void> {
  await actualizarPerfil(userId, usuarioToProfileUpdate(datos));
}
