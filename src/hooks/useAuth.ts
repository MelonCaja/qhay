import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { observarAuth, cerrarSesion } from '../services/auth';
import { obtenerUsuario } from '../services/firestore';
import { useAuthStore } from '../store/authStore';

const USUARIO_KEY = '@qhay_usuario';

export function useAuth() {
  const { usuario, cargando, setUsuario, setCargando, actualizarUsuario } = useAuthStore();

  useEffect(() => {
    // Cargar usuario desde caché offline primero
    AsyncStorage.getItem(USUARIO_KEY).then((data) => {
      if (data) {
        try {
          setUsuario(JSON.parse(data));
        } catch {
          // Ignorar datos corruptos
        }
      }
    });

    // Observar cambios de autenticación Firebase
    const unsub = observarAuth(async (firebaseUser) => {
      if (firebaseUser) {
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

  return { usuario, cargando, logout, actualizarUsuario };
}
