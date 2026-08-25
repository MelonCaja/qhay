import type { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from '../config/supabase';
import { TERMINOS_VERSION } from '../legal/terms';

// Cierra el popup/pestaña de auth si la app fue reabierta por el redirect
// (no-op en Android; necesario en iOS/web para que la sesión del navegador
// no quede colgada tras volver a la app)
WebBrowser.maybeCompleteAuthSession();

export interface ResultadoRegistro {
  user: User | null;
  /** true = Supabase exige confirmar el correo antes de emitir sesión */
  requiereConfirmacion: boolean;
}

// Login con Google vía OAuth de Supabase (navegador del sistema). El Web
// Client ID + secret viven en el dashboard (Auth → Providers → Google), así
// que la app no necesita client IDs nativos → funciona en Expo Go/Dev Client.
// El perfil en /profiles lo crea el trigger handle_new_user (schema.sql).
// Devuelve null si el usuario cierra el navegador sin completar el login.
export async function loginConGoogle(): Promise<Session | null> {
  // exp://<ip>:8081 en Expo Go, qhay://auth en builds nativas, y en web
  // ignora `scheme` y usa dinámicamente window.location.origin + '/auth'
  // (confirmado en expo-auth-session/build/SessionUrlProvider.js) — así
  // que en producción web resuelve solo al dominio real, sin hardcodear
  // nada acá. Los TRES patrones deben estar en la allowlist de Supabase:
  // Auth → URL Configuration → Redirect URLs — qhay://**, exp://**, y
  // el dominio de producción real (ej. https://qhay.cl/** o el dominio
  // de Vercel), o el login con Google falla en web con redirect_uri
  // no permitido. Esto se configura en el dashboard, no en el código.
  const redirectTo = makeRedirectUri({ scheme: 'qhay', path: 'auth' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  // 'cancel' | 'dismiss' = el usuario cerró el navegador → salida silenciosa
  const resultado = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (resultado.type !== 'success') return null;

  // getQueryParams lee tanto el query (?a=b) como el fragment (#a=b)
  const { params, errorCode } = QueryParams.getQueryParams(resultado.url);
  if (errorCode) throw new Error(errorCode);
  if (params.error_description) throw new Error(params.error_description);

  // Flujo implícito: tokens directos en el redirect
  const { access_token, refresh_token } = params;
  if (access_token && refresh_token) {
    const { data: sesion, error: errorSesion } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (errorSesion) throw errorSesion;
    return sesion.session;
  }

  // Flujo PKCE: vuelve ?code= en lugar de tokens
  if (params.code) {
    const { data: sesion, error: errorSesion } =
      await supabase.auth.exchangeCodeForSession(params.code);
    if (errorSesion) throw errorSesion;
    return sesion.session;
  }

  throw new Error('Respuesta OAuth sin tokens de sesión');
}

// Registro con email y contraseña. name/terms_version viajan en la metadata
// para que handle_new_user los persista en profiles (con confirmación de
// correo activa no hay sesión todavía, así que el cliente no puede escribir).
export async function registrarUsuario(
  email: string,
  password: string,
  nombre: string
): Promise<ResultadoRegistro> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name: nombre, terms_version: TERMINOS_VERSION },
    },
  });

  if (error) {
    // Auditoría: el código/status/mensaje real de Supabase, nunca inferido.
    console.error('[auth] signUp error:', {
      name: error.name,
      status: error.status,
      code: error.code,
      message: error.message,
    });
    throw error;
  }

  // OJO — NO inferir "correo duplicado" desde data.user.identities.length === 0.
  // Ese heurístico (usado antes acá) causó un incidente real: falsos positivos
  // de "ya existe una cuenta" con correos nuevos sobre una base de datos vacía
  // (2026-08-25). Motivo, documentado en la fuente de @supabase/auth-js
  // (GoTrueClient.ts, remarks de signUp): el objeto de usuario "ofuscado" con
  // identities=[] SOLO se devuelve cuando "Confirm email" Y "Confirm phone"
  // están AMBOS habilitados en el proyecto — si "Confirm phone" está
  // deshabilitado (lo normal en un proyecto sin auth por teléfono, como este),
  // un correo duplicado ya lanza un error real ("User already registered",
  // code: user_already_exists), capturado arriba. El heurístico no tenía
  // ninguna garantía de no dispararse también para un signUp genuinamente
  // nuevo, y evidentemente lo hacía. El único duplicado real y confiable es
  // el que Supabase reporta como error explícito — si signUp() no lanza
  // error, se trata como éxito, con o sin sesión según requiereConfirmacion.
  return { user: data.user, requiereConfirmacion: !data.session };
}

// Login con email y contraseña
export async function iniciarSesion(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

// Reenvía el correo de confirmación de registro
export async function reenviarVerificacion(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw error;
}

// Envía el correo de restablecimiento de contraseña (SMTP ya configurado en
// Supabase). El enlace del correo usa el Site URL del proyecto.
export async function recuperarPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

// Cerrar sesión
export async function cerrarSesion(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Consulta al servidor si el correo del usuario actual ya fue confirmado */
export async function verificacionConfirmada(): Promise<boolean> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return false;
  return !!data.user?.email_confirmed_at;
}

// Observador de estado de autenticación. Devuelve la función de desuscripción.
export function observarAuth(
  callback: (session: Session | null, event: string) => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => callback(session, event)
  );
  return () => subscription.unsubscribe();
}
