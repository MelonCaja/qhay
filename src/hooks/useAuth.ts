import { useEffect } from 'react';
import { Alert } from 'react-native';
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
        try {
          let usuarioData = await obtenerUsuario(firebaseUser.uid);

          // Self-heal: Auth existe pero no hay perfil en Firestore
          // (registro interrumpido) → crear perfil base para no dejar
          // la sesión colgada sin redirección.
          if (!usuarioData) {
            console.error('[useAuth] Sesión sin perfil en /users ni /usuarios — creando perfil base');
            const base = perfilInicial({
              nombre: firebaseUser.displayName || 'Usuario',
              email: firebaseUser.email || '',
              foto: firebaseUser.photoURL || undefined,
            });
            await crearPerfil(firebaseUser.uid, base);
            usuarioData = { id: firebaseUser.uid, ...base } as unknown as Usuario;
          }

          setUsuario(usuarioData);
          await AsyncStorage.setItem(USUARIO_KEY, JSON.stringify(usuarioData));
        } catch (error: any) {
          // ⚠️ TODO(debug): Alert de auditoría — volver a console.error tras verificar
          Alert.alert(
            'ERROR ENCONTRADO (cargando perfil)',
            `${error?.code ?? 'sin-code'}: ${String(error?.message ?? error)}`
          );
          console.error('[useAuth] Error cargando perfil:', error);
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
