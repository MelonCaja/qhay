import { useState, useEffect, useMemo } from 'react';
import { Receta } from '../types/receta';
import { Ingrediente } from '../types/ingrediente';
import {
  getRecetas,
  sugerirRecetas,
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
  const [todasLasRecetas, setTodasLasRecetas] = useState<Receta[]>([]);
  const [cargando, setCargando] = useState(true);
  const { usuario } = useAuthStore();
  const plan = usuario?.plan ?? 'gratuito';
  const utensiliosUsuario = usuario?.utensilios ?? [];

  useEffect(() => {
    getRecetas(plan)
      .then(setTodasLasRecetas)
      .catch(console.error)
      .finally(() => setCargando(false));
  }, [plan]);

  const recetasFiltradas = useMemo(() => {
    // Motor de sugerencias: coincidencia + urgencia por vencimiento (0 reads)
    let lista: RecetaSugerida[] = sugerirRecetas(
      todasLasRecetas.map((r) => JSON.parse(JSON.stringify(r)) as Receta),
      despensa
    );

    // Marcar disponibilidad para la UI de detalle
    for (const r of lista) {
      for (const ing of r.ingredientes) {
        ing.disponibleEnDespensa = !r.ingredientesFaltantes.includes(ing.nombre);
      }
    }

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
  }, [todasLasRecetas, despensa, filtros, utensiliosUsuario]);

  return { recetas: recetasFiltradas, cargando };
}
