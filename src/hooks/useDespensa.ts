import { useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDespensaStore } from '../store/despensaStore';
import { useAuthStore } from '../store/authStore';
import {
  obtenerItems,
  agregarItem,
  eliminarItem,
  incrementarFrecuencia,
  calcularDescuentos,
  aplicarDescuentos,
  DescuentoReceta,
} from '../services/pantryService';
import { Ingrediente } from '../types/ingrediente';
import { IngredienteReceta } from '../types/receta';

const DESPENSA_KEY = '@qhay_despensa';

export function useDespensa() {
  const {
    ingredientes, cargando,
    setIngredientes, agregarIngrediente, eliminarIngrediente, actualizarIngrediente, setCargando,
  } = useDespensaStore();
  const { usuario } = useAuthStore();

  // Cargar despensa desde Supabase (con fallback offline)
  const cargarDespensa = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    try {
      const datos = await obtenerItems(usuario.id);
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

  const agregar = async (ingrediente: Omit<Ingrediente, 'id'>): Promise<string | undefined> => {
    if (!usuario) return undefined;
    try {
      // Detectar duplicado en memoria (0 lecturas extra)
      const nombreNorm = ingrediente.nombre.trim().toLowerCase();
      const existente = ingredientes.find(
        (i) => i.nombre.trim().toLowerCase() === nombreNorm,
      );

      if (existente) {
        // Solo incrementa — no crea fila nueva
        const nuevoValor = (existente.frecuenciaUso ?? 1) + 1;
        await incrementarFrecuencia(existente.id, nuevoValor);
        actualizarIngrediente(existente.id, { frecuenciaUso: nuevoValor });
        return existente.id;
      }

      // Ingrediente nuevo
      const id = await agregarItem(usuario.id, { ...ingrediente, frecuenciaUso: 1 });
      agregarIngrediente({ ...ingrediente, id, frecuenciaUso: 1 });
      return id;
    } catch (error) {
      console.error('Error agregando ingrediente:', error);
      throw error;
    }
  };

  const eliminar = async (id: string) => {
    if (!usuario) return;
    try {
      await eliminarItem(id);
      eliminarIngrediente(id);
    } catch (error) {
      console.error('Error eliminando ingrediente:', error);
      throw error;
    }
  };

  /**
   * "Receta realizada": descuenta ingredientes usados de la despensa
   * en un solo RPC atómico y sincroniza el store local.
   */
  const descontarReceta = async (
    ingredientesReceta: IngredienteReceta[]
  ): Promise<DescuentoReceta[]> => {
    if (!usuario) return [];
    const descuentos = calcularDescuentos(ingredientesReceta, ingredientes);
    if (descuentos.length === 0) return [];
    await aplicarDescuentos(descuentos);
    for (const d of descuentos) {
      if (d.cantidadRestante <= 0) {
        eliminarIngrediente(d.itemId);
      } else {
        actualizarIngrediente(d.itemId, { cantidad: d.cantidadRestante });
      }
    }
    return descuentos;
  };

  // Ingredientes próximos a vencer (menos de 7 días)
  const proxAVencer = ingredientes.filter((i) => {
    if (!i.fechaVencimiento) return false;
    const dias = Math.ceil(
      (i.fechaVencimiento.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return dias >= 0 && dias <= 7;
  });

  return { ingredientes, cargando, agregar, eliminar, descontarReceta, recargar: cargarDespensa, proxAVencer };
}
