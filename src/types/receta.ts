export interface PasoReceta {
  numero: number;
  descripcion: string;
  timerSegundos?: number;
  foto?: string;
}

export interface IngredienteReceta {
  nombre: string;
  cantidad: number;
  unidad: string;
  equivalenciaSinBalanza?: string;
  disponibleEnDespensa?: boolean;
}

export interface Macros {
  readonly proteinas: number;     // g por porción
  readonly carbohidratos: number; // g por porción
  readonly grasas: number;        // g por porción
}

export interface Receta {
  id: string;
  nombre: string;
  descripcion: string;
  foto?: string;
  imageUrl?: string;
  ingredientes: IngredienteReceta[];
  utensilios: string[];
  pasos: PasoReceta[];
  tiempoPreparacion: number; // minutos
  dificultad: 'facil' | 'media' | 'dificil';
  porciones: number;
  calorias?: number;
  macros?: Macros;
  esFitness?: boolean; // alta proteína o baja en calorías
  restricciones: string[]; // vegetariano, vegano, sin-gluten, sin-lactosa
  temporada?: string[];
  porcentajeCoincidencia?: number;
  esEstudiante?: boolean; // receta económica para BAES
}
