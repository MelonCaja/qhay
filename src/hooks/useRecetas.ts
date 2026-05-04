import { useState, useEffect, useMemo } from 'react';
import { Receta } from '../types/receta';
import { Ingrediente } from '../types/ingrediente';
import { getRecetas } from '../services/recipeService';

export function calcularCoincidencia(receta: Receta, despensa: Ingrediente[]): number {
  if (receta.ingredientes.length === 0) return 0;

  const ingredientesDespensa = despensa.map((i) => i.nombre.toLowerCase());
  let aciertos = 0;

  receta.ingredientes.forEach((ing) => {
    const nombreReq = ing.nombre.toLowerCase();
    const encontrado = ingredientesDespensa.some(
      (d) => nombreReq.includes(d) || d.includes(nombreReq)
    );
    ing.disponibleEnDespensa = encontrado;
    if (encontrado) aciertos++;
  });

  return Math.round((aciertos / receta.ingredientes.length) * 100);
}

interface FiltrosRecetas {
  tab: 'todas' | 'despensa' | 'faciles' | 'estudiantes' | 'fitness';
  restricciones: string[];
  tiempoMax?: number;
}

export function useRecetas(despensa: Ingrediente[], filtros: FiltrosRecetas) {
  const [todasLasRecetas, setTodasLasRecetas] = useState<Receta[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    getRecetas()
      .then(setTodasLasRecetas)
      .catch(console.error)
      .finally(() => setCargando(false));
  }, []);

  const recetasFiltradas = useMemo(() => {
    let lista = todasLasRecetas.map((r) => {
      const recetaCopia = JSON.parse(JSON.stringify(r)) as Receta;
      const coincidencia = calcularCoincidencia(recetaCopia, despensa);

      const ingredientesFaltantes = recetaCopia.ingredientes
        .filter((ing) => !ing.disponibleEnDespensa)
        .map((ing) => ing.nombre);

      return {
        ...recetaCopia,
        porcentajeCoincidencia: coincidencia,
        ingredientesFaltantes,
      };
    });

    if (filtros.restricciones.length > 0) {
      lista = lista.filter((r) =>
        filtros.restricciones.every((res) => r.restricciones.includes(res))
      );
    }

    if (filtros.tiempoMax) {
      lista = lista.filter((r) => r.tiempoPreparacion <= filtros.tiempoMax!);
    }

    switch (filtros.tab) {
      case 'todas':
        lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
      case 'despensa':
        lista = lista.filter((r) => (r.porcentajeCoincidencia ?? 0) > 0);
        lista.sort((a, b) => (b.porcentajeCoincidencia ?? 0) - (a.porcentajeCoincidencia ?? 0));
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
      default:
        lista.sort((a, b) => (b.porcentajeCoincidencia ?? 0) - (a.porcentajeCoincidencia ?? 0));
    }

    return lista;
  }, [todasLasRecetas, despensa, filtros]);

  return { recetas: recetasFiltradas, cargando };
}
