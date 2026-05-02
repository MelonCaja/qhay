import { useState, useEffect, useMemo } from 'react';
import { Receta } from '../types/receta';
import { Ingrediente } from '../types/ingrediente';
import { recetasIniciales } from '../data/recetasIniciales';

// Algoritmo de coincidencia entre receta y despensa
export function calcularCoincidencia(receta: Receta, despensa: Ingrediente[]): number {
  if (receta.ingredientes.length === 0) return 0;
  
  const ingredientesDespensa = despensa.map((i) => i.nombre.toLowerCase());
  let aciertos = 0;

  receta.ingredientes.forEach((ing) => {
    const nombreReq = ing.nombre.toLowerCase();
    // Búsqueda simple: si la despensa incluye una palabra clave de la receta
    // Ej: Receta pide "Cebolla blanca", Despensa tiene "Cebolla"
    const encontrado = ingredientesDespensa.some(
      (d) => nombreReq.includes(d) || d.includes(nombreReq)
    );
    
    // Marcar en el objeto para la UI
    ing.disponibleEnDespensa = encontrado;
    if (encontrado) aciertos++;
  });

  return Math.round((aciertos / receta.ingredientes.length) * 100);
}

interface FiltrosRecetas {
  tab: 'todas' | 'despensa' | 'faciles' | 'estudiantes';
  restricciones: string[];
  tiempoMax?: number;
}

export function useRecetas(despensa: Ingrediente[], filtros: FiltrosRecetas) {
  const [cargando, setCargando] = useState(false);

  // Calcular coincidencias y aplicar filtros
  const recetasFiltradas = useMemo(() => {
    // Asignar ingredientes que faltan (los usamos en la Home)
    let lista = recetasIniciales.map((r) => {
      const recetaCopia = JSON.parse(JSON.stringify(r)) as Receta; // Deep copy
      const coincidencia = calcularCoincidencia(recetaCopia, despensa);
      
      const ingredientesFaltantes = recetaCopia.ingredientes
        .filter(ing => !ing.disponibleEnDespensa)
        .map(ing => ing.nombre);

      return {
        ...recetaCopia,
        porcentajeCoincidencia: coincidencia,
        ingredientesFaltantes, // Guardamos los que faltan para mostrar en UI
      };
    });

    // Filtrar por restricciones del usuario
    if (filtros.restricciones.length > 0) {
      lista = lista.filter((r) =>
        filtros.restricciones.every((res) => r.restricciones.includes(res))
      );
    }

    // Filtrar por tiempo máximo
    if (filtros.tiempoMax) {
      lista = lista.filter((r) => r.tiempoPreparacion <= filtros.tiempoMax!);
    }

    // Filtrar por tab
    switch (filtros.tab) {
      case 'todas':
        // En "Todas", devolvemos la lista completa (el filtro de tiempoMax se omite desde arriba)
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
      default:
        lista.sort((a, b) => (b.porcentajeCoincidencia ?? 0) - (a.porcentajeCoincidencia ?? 0));
    }

    return lista;
  }, [despensa, filtros]);

  return { recetas: recetasFiltradas, cargando };
}
