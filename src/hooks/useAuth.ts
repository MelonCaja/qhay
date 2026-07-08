import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { observarAuth, cerrarSesion, reenviarVerificacion } from '../services/auth';
import { auth } from '../services/firebase';
import { obtenerUsuario } from '../services/firestore';
import { crearPerfil, perfilInicial } from '../services/userService';
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

    const unsub = observarAuth(async (firebaseUser) => {
      if (firebaseUser) {
        setEmailVerificado(firebaseUser.emailVerified);

        // Perfil por defecto desde los datos de Auth: se usa si Firestore
        // falla (permisos/red) o si el perfil aún no existe. La sesión
        // NUNCA se queda bloqueada esperando a Firestore.
        const perfilPorDefecto = (): Usuario => ({
          id: firebaseUser.uid,
          ...perfilInicial({
            nombre: firebaseUser.displayName || 'Usuario',
            email: firebaseUser.email || '',
            foto: firebaseUser.photoURL || undefined,
          }),
        } as unknown as Usuario);

        try {
          let usuarioData = await obtenerUsuario(firebaseUser.uid);

          // Self-heal: Auth existe pero no hay perfil en Firestore
          // (registro interrumpido) → crear perfil base.
          if (!usuarioData) {
            usuarioData = perfilPorDefecto();
            await crearPerfil(firebaseUser.uid, perfilInicial({
              nombre: usuarioData.nombre,
              email: usuarioData.email,
              foto: usuarioData.foto,
            })).catch((e) => console.error('[useAuth] No se pudo persistir perfil base:', e));
          }

          setUsuario(usuarioData);
          await AsyncStorage.setItem(USUARIO_KEY, JSON.stringify(usuarioData));
        } catch (error) {
          console.error('[useAuth] Error cargando perfil, usando fallback:', error);
          // Bypass: caché local si existe; si no, perfil por defecto →
          // el navigator avanza a Onboarding/Home en vez de congelarse.
          const cache = await AsyncStorage.getItem(USUARIO_KEY).catch(() => null);
          if (cache) {
            try { setUsuario(JSON.parse(cache)); } catch { setUsuario(perfilPorDefecto()); }
          } else {
            setUsuario(perfilPorDefecto());
          }
        }
      } else {
        setUsuario(null);
        setEmailVerificado(false);
        await AsyncStorage.removeItem(USUARIO_KEY);
      }
      setCargando(false);
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

  // Recarga el estado de verificación desde Firebase (para después del clic en el enlace)
  const recargarVerificacion = async () => {
    await auth.currentUser?.reload();
    const verificado = auth.currentUser?.emailVerified ?? false;
    setEmailVerificado(verificado);
    return verificado;
  };

  return {
    usuario, cargando, emailVerificado,
    logout, actualizarUsuario, reenviarVerificacion, recargarVerificacion,
  };
}
