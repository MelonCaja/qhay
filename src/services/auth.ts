import type { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from '../config/supabase';
import { TERMINOS_VERSION } from '../legal/terms';

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
  // exp://<ip>:8081 en Expo Go, qhay:// en builds — debe estar en la
  // allowlist: Supabase → Auth → URL Configuration → Redirect URLs.
  const redirectTo = makeRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const resultado = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (resultado.type !== 'success') return null;

  // Flujo implícito: los tokens vuelven en el fragment del redirect
  const { params, errorCode } = QueryParams.getQueryParams(resultado.url);
  if (errorCode) throw new Error(errorCode);
  if (params.error_description) throw new Error(params.error_description);

  const { access_token, refresh_token } = params;
  if (!access_token || !refresh_token) {
    throw new Error('Respuesta OAuth sin tokens de sesión');
  }

  const { data: sesion, error: errorSesion } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (errorSesion) throw errorSesion;
  return sesion.session;
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
  if (error) throw error;

  // Con "Confirm email" activo, un correo ya registrado devuelve un usuario
  // ofuscado sin identities en vez de error → normalizar a error de duplicado.
  if (data.user && data.user.identities?.length === 0) {
    throw Object.assign(new Error('Ya existe una cuenta con ese correo'), {
      code: 'user_already_exists',
    });
  }

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
