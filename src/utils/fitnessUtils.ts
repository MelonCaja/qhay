import { Receta, Macros, IngredienteReceta } from '../types/receta';

// TheMealDB category images — URLs estables, fotos reales de comida, sin API key
const MDB = 'https://www.themealdb.com/images/category';

export interface RecetaVisual {
  emoji: string;
  bgColor: string;
  defaultImageUrl: string;
}

const _match = (texto: string, ...words: string[]) =>
  words.some((w) => texto.includes(w));

/** Devuelve emoji, color de fondo e imagen de referencia por categoría. */
export function getRecetaVisual(receta: Receta): RecetaVisual {
  const ingredientes = (receta.ingredientes ?? []) as IngredienteReceta[];
  const restricciones = receta.restricciones ?? [];
  const t = `${receta.nombre ?? ''} ${ingredientes.map((i) => i.nombre).join(' ')}`.toLowerCase();

  if (restricciones.includes('vegano'))
    return { emoji: '🥬', bgColor: '#E8F5E9', defaultImageUrl: `${MDB}/vegan.png` };
  if (restricciones.includes('vegetariano'))
    return { emoji: '🥗', bgColor: '#F1F8E9', defaultImageUrl: `${MDB}/vegetarian.png` };
  if (_match(t, 'postre', 'torta', 'galleta', 'manjar', 'arroz con leche', 'panqueque', 'avena'))
    return { emoji: '🍰', bgColor: '#FCE4EC', defaultImageUrl: `${MDB}/dessert.png` };
  if (_match(t, 'sopaipilla', 'empanada', 'pan', 'sándwich', 'churrasco'))
    return { emoji: '🥪', bgColor: '#FFF8E1', defaultImageUrl: `${MDB}/miscellaneous.png` };
  if (_match(t, 'sopa', 'cazuela', 'caldo', 'pantruca'))
    return { emoji: '🍲', bgColor: '#E8EAF6', defaultImageUrl: `${MDB}/side.png` };
  if (_match(t, 'pollo', 'pavo'))
    return { emoji: '🍗', bgColor: '#FFF3E0', defaultImageUrl: `${MDB}/chicken.png` };
  if (_match(t, 'vacuno', 'carne', 'bisteck', 'lomo'))
    return { emoji: '🥩', bgColor: '#FFEBEE', defaultImageUrl: `${MDB}/beef.png` };
  if (_match(t, 'cerdo', 'longaniza', 'costilla'))
    return { emoji: '🍖', bgColor: '#FBE9E7', defaultImageUrl: `${MDB}/pork.png` };
  if (_match(t, 'pescado', 'atún', 'salmón', 'ceviche', 'mariscos'))
    return { emoji: '🐟', bgColor: '#E3F2FD', defaultImageUrl: `${MDB}/seafood.png` };
  if (_match(t, 'huevo', 'revuelto', 'omelette', 'tortilla de papa'))
    return { emoji: '🍳', bgColor: '#FFFDE7', defaultImageUrl: `${MDB}/breakfast.png` };
  if (_match(t, 'arroz', 'chaufa', 'fideo', 'pasta', 'alfredo'))
    return { emoji: '🍚', bgColor: '#F9FBE7', defaultImageUrl: `${MDB}/pasta.png` };
  if (_match(t, 'ensalada', 'lechuga', 'tomate'))
    return { emoji: '🥙', bgColor: '#E8F5E9', defaultImageUrl: `${MDB}/vegetarian.png` };
  if (_match(t, 'poroto', 'lenteja', 'garbanzo'))
    return { emoji: '🫘', bgColor: '#EFEBE9', defaultImageUrl: `${MDB}/vegan.png` };
  if (_match(t, 'fajita', 'taco'))
    return { emoji: '🌮', bgColor: '#FFF8E1', defaultImageUrl: `${MDB}/miscellaneous.png` };
  if (receta.esFitness)
    return { emoji: '💪', bgColor: '#E0F7FA', defaultImageUrl: `${MDB}/starter.png` };

  return { emoji: '🍽️', bgColor: '#F5F5F5', defaultImageUrl: `${MDB}/miscellaneous.png` };
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

export function validarTodasLasRecetas(recetas: Receta[]): void {
  if (!__DEV__) return;
  recetas.forEach(validarCaloriasReceta);
}
