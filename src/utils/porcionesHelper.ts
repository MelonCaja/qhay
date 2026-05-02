import { IngredienteReceta } from '../types/receta';

// Ajustar cantidades de ingredientes según porciones
export function ajustarPorciones(
  ingredientes: IngredienteReceta[],
  porcionesOriginal: number,
  porcionesDeseadas: number
): IngredienteReceta[] {
  const factor = porcionesDeseadas / porcionesOriginal;
  return ingredientes.map((ing) => ({
    ...ing,
    cantidad: Math.round(ing.cantidad * factor * 10) / 10,
  }));
}

// Texto descriptivo de la cantidad
export function textoIngrediente(ing: IngredienteReceta): string {
  const cantidad = ing.cantidad % 1 === 0 ? ing.cantidad.toString() : ing.cantidad.toFixed(1);
  return `${cantidad} ${ing.unidad} de ${ing.nombre}`;
}
