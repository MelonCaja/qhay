import { useState, useEffect, useMemo } from 'react';
import { Ingrediente } from '../types/ingrediente';
import {
  obtenerSugerencias,
  filtrarPorUtensilios,
  RecetaSugerida,
} from '../services/recipeService';
import { useAuthStore } from '../store/authStore';

interface FiltrosRecetas {
  tab: 'todas' | 'despensa' | 'faciles' | 'estudiantes' | 'fitness';
  restricciones: string[];
  tiempoMax?: number;
  /** Filtro avanzado: solo recetas realizables con los utensilios del usuario */
  soloMisUtensilios?: boolean;
}

export function useRecetas(despensa: Ingrediente[], filtros: FiltrosRecetas) {
  const [sugeridas, setSugeridas] = useState<RecetaSugerida[]>([]);
  const [cargando, setCargando] = useState(true);
  const { usuario } = useAuthStore();
  const plan = usuario?.plan ?? 'gratuito';
  const utensiliosUsuario = usuario?.utensilios ?? [];

  // Firma estable de la despensa: re-consultar solo cuando cambia el contenido
  // relevante para el scoring (no en cada referencia nueva del store).
  const firmaDespensa = useMemo(
    () => despensa.map((i) => `${i.id}:${i.cantidad}:${i.fechaVencimiento ?? ''}`).join('|'),
    [despensa]
  );

  useEffect(() => {
    let vigente = true;
    // JOIN + scoring en PostgreSQL (1 petición); fallback offline en cliente
    obtenerSugerencias(despensa, plan)
      .then((lista) => { if (vigente) setSugeridas(lista); })
      .catch(console.error)
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, firmaDespensa]);

  const recetasFiltradas = useMemo(() => {
    // Ya vienen puntuadas y ordenadas por scoreSugerencia (RPC o fallback)
    let lista = [...sugeridas];

    if (filtros.restricciones.length > 0) {
      lista = lista.filter((r) =>
        filtros.restricciones.every((res) => r.restricciones.includes(res))
      );
    }

    if (filtros.tiempoMax) {
      lista = lista.filter((r) => r.tiempoPreparacion <= filtros.tiempoMax!);
    }

    // Filtro avanzado: cruce utensilios receta vs utensilios del usuario
    if (filtros.soloMisUtensilios) {
      lista = filtrarPorUtensilios(lista, utensiliosUsuario);
    }

    switch (filtros.tab) {
      case 'todas':
        lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
      case 'despensa':
        lista = lista.filter((r) => (r.porcentajeCoincidencia ?? 0) > 0);
        // Ya viene ordenada por scoreSugerencia (coincidencia + vencimiento)
        break;
      case 'faciles':
        lista = lista.filter((r) => r.dificultad === 'facil');
        break;
      case 'estudiantes':
        lista = lista.filter((r) => r.esEstudiante);
        break;
      case 'fitness':
        lista = lista.filter((r) => r.esFitness);
        lista.sort((a, b) => (a.calorias ?? 9999) - (b.calorias ?? 9999));
        break;
    }

    return lista;
  }, [sugeridas, filtros, utensiliosUsuario]);

  return { recetas: recetasFiltradas, cargando };
}
