import { Receta, Macros, IngredienteReceta } from '../types/receta';

export interface RecetaVisual {
  emoji: string;
  bgColor: string;
}

const _match = (texto: string, ...words: string[]) =>
  words.some((w) => texto.includes(w));

/** Devuelve un emoji y color de fondo apropiado para la categoría de la receta. */
export function getRecetaVisual(receta: Receta): RecetaVisual {
  const t = `${receta.nombre} ${receta.ingredientes.map((i: IngredienteReceta) => i.nombre).join(' ')}`.toLowerCase();

  if (receta.restricciones.includes('vegano'))
    return { emoji: '🥬', bgColor: '#E8F5E9' };
  if (receta.restricciones.includes('vegetariano'))
    return { emoji: '🥗', bgColor: '#F1F8E9' };
  if (_match(t, 'postre', 'torta', 'galleta', 'manjar', 'arroz con leche', 'panqueque', 'avena'))
    return { emoji: '🍰', bgColor: '#FCE4EC' };
  if (_match(t, 'sopaipilla', 'empanada', 'pan', 'sándwich', 'churrasco'))
    return { emoji: '🥪', bgColor: '#FFF8E1' };
  if (_match(t, 'sopa', 'cazuela', 'caldo', 'pantruca'))
    return { emoji: '🍲', bgColor: '#E8EAF6' };
  if (_match(t, 'pollo', 'pavo'))
    return { emoji: '🍗', bgColor: '#FFF3E0' };
  if (_match(t, 'vacuno', 'carne', 'bisteck', 'churrasco', 'lomo'))
    return { emoji: '🥩', bgColor: '#FFEBEE' };
  if (_match(t, 'cerdo', 'longaniza', 'costilla'))
    return { emoji: '🍖', bgColor: '#FBE9E7' };
  if (_match(t, 'pescado', 'atún', 'salmón', 'ceviche', 'mariscos'))
    return { emoji: '🐟', bgColor: '#E3F2FD' };
  if (_match(t, 'huevo', 'revuelto', 'omelette', 'tortilla de papa'))
    return { emoji: '🍳', bgColor: '#FFFDE7' };
  if (_match(t, 'arroz', 'chaufa', 'fideo', 'pasta', 'alfredo'))
    return { emoji: '🍚', bgColor: '#F9FBE7' };
  if (_match(t, 'ensalada', 'lechuga', 'tomate'))
    return { emoji: '🥙', bgColor: '#E8F5E9' };
  if (_match(t, 'poroto', 'lenteja', 'garbanzo'))
    return { emoji: '🫘', bgColor: '#EFEBE9' };
  if (_match(t, 'fajita', 'taco'))
    return { emoji: '🌮', bgColor: '#FFF8E1' };
  if (receta.esFitness)
    return { emoji: '💪', bgColor: '#E0F7FA' };

  return { emoji: '🍽️', bgColor: '#F5F5F5' };
}

export interface TagFitness {
  label: string;
  color: string;
  bgColor: string;
}

/** Genera tags automáticos basados en los macros de la receta (por porción base). */
export function obtenerTagsFitness(macros: Macros | undefined): TagFitness[] {
  if (!macros) return [];
  const tags: TagFitness[] = [];
  if (macros.proteinas > 25)
    tags.push({ label: '💪 Alta Proteína', color: '#0097A7', bgColor: '#E0F7FA' });
  if (macros.carbohidratos < 15)
    tags.push({ label: '🥑 Keto Friendly', color: '#7B1FA2', bgColor: '#F3E5F5' });
  if (macros.grasas < 10)
    tags.push({ label: '✨ Low Fat', color: '#F57F17', bgColor: '#FFFDE7' });
  return tags;
}

/** Escala macros según un factor (porciones actuales / porciones base). */
export function escalarMacros(macros: Macros, factor: number): Macros {
  const r = (v: number) => Math.round(v * factor * 10) / 10;
  return {
    proteinas: r(macros.proteinas),
    carbohidratos: r(macros.carbohidratos),
    grasas: r(macros.grasas),
  };
}

/**
 * Valida que las calorías declaradas en una receta coincidan (±10%) con las
 * calculadas desde sus macros: proteínas×4 + carbos×4 + grasas×9.
 * Solo emite warning en entorno de desarrollo.
 */
export function validarCaloriasReceta(receta: Receta): void {
  if (!__DEV__ || !receta.macros || !receta.calorias) return;
  const kcalCalculadas =
    receta.macros.proteinas * 4 +
    receta.macros.carbohidratos * 4 +
    receta.macros.grasas * 9;
  const margen = receta.calorias * 0.1;
  if (Math.abs(kcalCalculadas - receta.calorias) > margen) {
    console.warn(
      `[Qhay Nutrition] "${receta.nombre}": declaradas ${receta.calorias} kcal, ` +
      `calculadas ${Math.round(kcalCalculadas)} kcal (diferencia > 10%)`
    );
  }
}

/** Valida todas las recetas en lote. Llámalo en desarrollo al montar la app. */
export function validarTodasLasRecetas(recetas: Receta[]): void {
  if (!__DEV__) return;
  recetas.forEach(validarCaloriasReceta);
}
