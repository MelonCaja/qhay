import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import {
  observarAuth,
  cerrarSesion,
  reenviarVerificacion as reenviarVerificacionApi,
  verificacionConfirmada,
} from '../services/auth';
import { obtenerPerfil, crearPerfilBase, perfilToUsuario } from '../services/profileService';
import { useAuthStore } from '../store/authStore';
import { Usuario } from '../types/usuario';

const USUARIO_KEY = '@qhay_usuario';

export function useAuth() {
  const {
    usuario, cargando, emailVerificado,
    setUsuario, setCargando, setEmailVerificado, actualizarUsuario,
  } = useAuthStore();

  useEffect(() => {
    AsyncStorage.getItem(USUARIO_KEY).then((data) => {
      if (data) {
        try { setUsuario(JSON.parse(data)); } catch { /* datos corruptos */ }
      }
    });

    // Perfil por defecto desde la sesión de Auth: se usa si Postgres falla
    // (RLS/red) o si la fila aún no existe. La sesión NUNCA se queda
    // bloqueada esperando a la base de datos.
    const perfilPorDefecto = (session: Session): Usuario => ({
      id: session.user.id,
      nombre: (session.user.user_metadata?.name as string) || 'Usuario',
      email: session.user.email ?? '',
      foto: (session.user.user_metadata?.avatar_url as string) || undefined,
      plan: 'gratuito',
      esEstudiante: false,
      estudianteVerificado: false,
      restriccionesAlimentarias: [],
      tiempoCocina: 45,
      onboardingCompletado: false,
      gustos: [],
      utensilios: [],
    });

    const cargarPerfil = async (session: Session) => {
      const datosAuth = {
        email: session.user.email ?? '',
        foto: (session.user.user_metadata?.avatar_url as string) || undefined,
      };
      try {
        let fila = await obtenerPerfil(session.user.id);

        // Self-heal: sesión válida sin fila en profiles (cuenta anterior al
        // trigger handle_new_user) → crear fila base.
        if (!fila) {
          fila = await crearPerfilBase(session.user.id, perfilPorDefecto(session).nombre);
        }

        const usuarioData = perfilToUsuario(fila, datosAuth);
        setUsuario(usuarioData);
        await AsyncStorage.setItem(USUARIO_KEY, JSON.stringify(usuarioData));
      } catch (error) {
        console.error('[useAuth] Error cargando perfil, usando fallback:', error);
        // Bypass: caché local si existe; si no, perfil por defecto →
        // el navigator avanza a Onboarding/Home en vez de congelarse.
        const cache = await AsyncStorage.getItem(USUARIO_KEY).catch(() => null);
        if (cache) {
          try { setUsuario(JSON.parse(cache)); } catch { setUsuario(perfilPorDefecto(session)); }
        } else {
          setUsuario(perfilPorDefecto(session));
        }
      } finally {
        setCargando(false);
      }
    };

    const unsub = observarAuth((session, event) => {
      if (session) {
        setEmailVerificado(!!session.user.email_confirmed_at);
        if (event === 'TOKEN_REFRESHED') return; // solo rotó el JWT: no recargar perfil
        // setTimeout: no llamar a la API dentro del callback (supabase-js
        // mantiene un lock interno durante onAuthStateChange → deadlock).
        setTimeout(() => { void cargarPerfil(session); }, 0);
      } else {
        setUsuario(null);
        setEmailVerificado(false);
        AsyncStorage.removeItem(USUARIO_KEY).catch(() => {});
        setCargando(false);
      }
    });

    return unsub;
  }, []);

  const logout = async () => {
    try {
      await cerrarSesion();
      await AsyncStorage.removeItem(USUARIO_KEY);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Reenvía el correo de confirmación al usuario actual
  const reenviarVerificacion = async () => {
    if (usuario?.email) {
      await reenviarVerificacionApi(usuario.email);
    }
  };

  // Recarga el estado de verificación desde Supabase (tras el clic en el enlace)
  const recargarVerificacion = async () => {
    const verificado = await verificacionConfirmada();
    setEmailVerificado(verificado);
    return verificado;
  };

  return {
    usuario, cargando, emailVerificado,
    logout, actualizarUsuario, reenviarVerificacion, recargarVerificacion,
  };
}
