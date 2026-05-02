import { useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDespensaStore } from '../store/despensaStore';
import { useAuthStore } from '../store/authStore';
import {
  obtenerDespensa,
  agregarIngrediente as agregarFirestore,
  eliminarIngrediente as eliminarFirestore,
} from '../services/firestore';
import { Ingrediente } from '../types/ingrediente';

const DESPENSA_KEY = '@qhay_despensa';

export function useDespensa() {
  const { ingredientes, cargando, setIngredientes, agregarIngrediente, eliminarIngrediente, setCargando } =
    useDespensaStore();
  const { usuario } = useAuthStore();

  // Cargar despensa desde Firestore (con fallback offline)
  const cargarDespensa = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    try {
      const datos = await obtenerDespensa(usuario.id);
      setIngredientes(datos);
      await AsyncStorage.setItem(DESPENSA_KEY, JSON.stringify(datos));
    } catch {
      // Sin conexión: cargar desde caché
      const cache = await AsyncStorage.getItem(DESPENSA_KEY);
      if (cache) {
        const datos = JSON.parse(cache).map((i: Ingrediente) => ({
          ...i,
          fechaVencimiento: i.fechaVencimiento ? new Date(i.fechaVencimiento) : undefined,
        }));
        setIngredientes(datos);
      }
    } finally {
      setCargando(false);
    }
  }, [usuario]);

  useEffect(() => {
    cargarDespensa();
  }, [cargarDespensa]);

  const agregar = async (ingrediente: Omit<Ingrediente, 'id'>) => {
    if (!usuario) return;
    try {
      const id = await agregarFirestore(usuario.id, ingrediente);
      agregarIngrediente({ ...ingrediente, id });
    } catch (error) {
      console.error('Error agregando ingrediente:', error);
      throw error;
    }
  };

  const eliminar = async (id: string) => {
    if (!usuario) return;
    try {
      await eliminarFirestore(usuario.id, id);
      eliminarIngrediente(id);
    } catch (error) {
      console.error('Error eliminando ingrediente:', error);
      throw error;
    }
  };

  // Ingredientes próximos a vencer (menos de 7 días)
  const proxAVencer = ingredientes.filter((i) => {
    if (!i.fechaVencimiento) return false;
    const dias = Math.ceil(
      (i.fechaVencimiento.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return dias >= 0 && dias <= 7;
  });

  return { ingredientes, cargando, agregar, eliminar, recargar: cargarDespensa, proxAVencer };
}
