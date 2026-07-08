import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User, UserDoc, Utensilio } from '../types/firestore';
import { TERMINOS_VERSION } from '../legal/terms';

const USERS = 'users';

const mesActual = (): string => new Date().toISOString().slice(0, 7); // 'YYYY-MM'

export const LIMITE_ESCANEOS_FREE = 4;
export const LIMITE_RECETAS_CACHE_FREE = 10;

// ─── PERFIL ──────────────────────────────────────────────────────────────────

/** Documento base para un usuario recién registrado */
export function perfilInicial(datos: {
  nombre: string;
  email: string;
  foto?: string;
}): UserDoc {
  return {
    nombre: datos.nombre,
    email: datos.email,
    ...(datos.foto ? { foto: datos.foto } : {}),
    plan: 'gratuito',
    onboardingCompletado: false,
    fechaRegistro: new Date(),
    gustos: [],
    restriccionesAlimentarias: [],
    tiempoCocina: 45,
    utensilios: [],
    esEstudiante: false,
    estudianteVerificado: false,
    // El registro exige el checkbox de aceptación (RegisterScreen)
    terminos: { version: TERMINOS_VERSION, aceptadoEn: new Date() },
    limites: {
      escaneosBoletaMes: 0,
      mesReferencia: mesActual(),
      recetasCacheadas: 0,
    },
  };
}

export async function crearPerfil(uid: string, datos: UserDoc): Promise<void> {
  await setDoc(doc(db, USERS, uid), datos);
}

export async function obtenerPerfil(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, USERS, uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    fechaRegistro: data.fechaRegistro instanceof Timestamp
      ? data.fechaRegistro.toDate()
      : data.fechaRegistro,
  } as User;
}

export async function actualizarPerfil(
  uid: string,
  datos: Partial<UserDoc>
): Promise<void> {
  await updateDoc(doc(db, USERS, uid), datos as Record<string, unknown>);
}

export async function completarOnboarding(
  uid: string,
  datos: Partial<UserDoc>
): Promise<void> {
  await actualizarPerfil(uid, { ...datos, onboardingCompletado: true });
}

// ─── UTENSILIOS ──────────────────────────────────────────────────────────────

export async function guardarUtensilios(
  uid: string,
  utensilios: Utensilio[]
): Promise<void> {
  await actualizarPerfil(uid, { utensilios });
}

// ─── BAES ────────────────────────────────────────────────────────────────────

export async function activarBAES(
  uid: string,
  montoDiario: number,
  institucion?: string
): Promise<void> {
  await actualizarPerfil(uid, {
    esEstudiante: true,
    baes: { activo: true, montoDiario, ...(institucion ? { institucion } : {}) },
  });
}

export async function desactivarBAES(uid: string): Promise<void> {
  await updateDoc(doc(db, USERS, uid), { 'baes.activo': false });
}

// ─── LÍMITES PLAN FREE ───────────────────────────────────────────────────────

/** Forma mínima para chequear límites (acepta User nuevo o Usuario legacy) */
export interface UsuarioConLimites {
  id: string;
  plan: 'gratuito' | 'premium';
  limites?: User['limites'];
}

/**
 * Registra un escaneo de boleta. Devuelve false si el usuario Free
 * ya agotó su cuota mensual (no registra en ese caso).
 * Usuarios legacy sin `limites` inician el contador este mes.
 */
export async function registrarEscaneoBoleta(user: UsuarioConLimites): Promise<boolean> {
  const ref = doc(db, USERS, user.id);
  const mes = mesActual();

  if (!user.limites || user.limites.mesReferencia !== mes) {
    // Legacy sin contador o nuevo mes: reset
    await updateDoc(ref, {
      'limites.mesReferencia': mes,
      'limites.escaneosBoletaMes': 1,
      'limites.recetasCacheadas': user.limites?.recetasCacheadas ?? 0,
    });
    return true;
  }

  if (user.plan === 'gratuito' && user.limites.escaneosBoletaMes >= LIMITE_ESCANEOS_FREE) {
    return false;
  }

  await updateDoc(ref, { 'limites.escaneosBoletaMes': increment(1) });
  return true;
}

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
