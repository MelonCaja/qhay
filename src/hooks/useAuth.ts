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

// Guard de módulo: la suscripción a auth debe existir UNA sola vez (la sostiene
// el primer componente montado, en la práctica AppNavigator). Sin esto, cada
// pantalla con useAuth() montaba su propio observador y re-hidrataba el caché
// viejo sobre el store (usuario con onboardingCompletado=false) → el navigator
// alternaba Onboarding↔Main en un loop infinito al terminar la configuración.
let authInicializado = false;

export function useAuth() {
  const {
    usuario, cargando, emailVerificado,
    setUsuario, setCargando, setEmailVerificado,
    actualizarUsuario: actualizarUsuarioStore,
  } = useAuthStore();

  useEffect(() => {
    if (authInicializado) return;
    authInicializado = true;

    // Hidratación rápida desde caché SOLO si el store aún está vacío:
    // nunca pisar un usuario ya cargado con datos viejos del disco.
    AsyncStorage.getItem(USUARIO_KEY).then((data) => {
      if (data && !useAuthStore.getState().usuario) {
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

    return () => {
      authInicializado = false;
      unsub();
    };
  }, []);

  // Actualiza store + caché AsyncStorage en conjunto: si divergen, el próximo
  // remount hidrata datos viejos (origen del loop de onboarding).
  const actualizarUsuario = (datos: Partial<Usuario>) => {
    actualizarUsuarioStore(datos);
    const actualizado = useAuthStore.getState().usuario;
    if (actualizado) {
      AsyncStorage.setItem(USUARIO_KEY, JSON.stringify(actualizado)).catch(() => {});
    }
  };

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
