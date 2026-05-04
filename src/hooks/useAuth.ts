import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { observarAuth, cerrarSesion, reenviarVerificacion } from '../services/auth';
import { auth } from '../services/firebase';
import { obtenerUsuario } from '../services/firestore';
import { useAuthStore } from '../store/authStore';

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
          const usuarioData = await obtenerUsuario(firebaseUser.uid);
          if (usuarioData) {
            setUsuario(usuarioData);
            await AsyncStorage.setItem(USUARIO_KEY, JSON.stringify(usuarioData));
          }
        } catch {
          // Error de red: mantener usuario en caché
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
