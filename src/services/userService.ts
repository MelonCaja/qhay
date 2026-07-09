import { supabase } from '../config/supabase';
import { actualizarPerfil } from './profileService';
import type { Usuario } from '../types/usuario';

const mesActual = (): string => new Date().toISOString().slice(0, 7); // 'YYYY-MM'

export const LIMITE_ESCANEOS_FREE = 4;
export const LIMITE_RECETAS_CACHE_FREE = 10;

// ─── LÍMITES PLAN FREE ───────────────────────────────────────────────────────

/** Forma mínima para chequear límites en cliente (UI inmediata, 0 reads) */
export interface UsuarioConLimites {
  id: string;
  plan: 'gratuito' | 'premium';
  limites?: Usuario['limites'];
}

/**
 * Registra un escaneo de boleta vía RPC registrar_escaneo: lock FOR UPDATE,
 * reset de mes y chequeo de cuota resueltos atómicamente en Postgres.
 * Devuelve false si el plan Free ya agotó su cuota mensual (no registra).
 */
export async function registrarEscaneoBoleta(_user: UsuarioConLimites): Promise<boolean> {
  const { data, error } = await supabase.rpc('registrar_escaneo', {
    limite: LIMITE_ESCANEOS_FREE,
  });
  if (error) throw error;
  return data === true;
}

/** Chequeo optimista en cliente sobre el perfil ya cargado (la RPC re-valida) */
export function puedeEscanearBoleta(user: UsuarioConLimites): boolean {
  if (user.plan === 'premium') return true;
  if (!user.limites || user.limites.mesReferencia !== mesActual()) return true;
  return user.limites.escaneosBoletaMes < LIMITE_ESCANEOS_FREE;
}

export function escaneosRestantes(user: UsuarioConLimites): number {
  if (user.plan === 'premium') return Infinity;
  if (!user.limites || user.limites.mesReferencia !== mesActual()) return LIMITE_ESCANEOS_FREE;
  return Math.max(0, LIMITE_ESCANEOS_FREE - user.limites.escaneosBoletaMes);
}

// ─── BAES ────────────────────────────────────────────────────────────────────

export async function activarBAES(
  userId: string,
  montoDiario: number,
  institucion?: string
): Promise<void> {
  await actualizarPerfil(userId, {
    is_student: true,
    baes_active: true,
    baes_daily_amount: montoDiario,
    baes_institution: institucion ?? null,
  });
}

export async function desactivarBAES(userId: string): Promise<void> {
  await actualizarPerfil(userId, { baes_active: false });
}
