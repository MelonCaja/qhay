import type { Macros, PasoReceta } from './receta';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Fecha hidratada en cliente (legacy: era Timestamp | Date en Firestore) */
export type FsDate = Date;

export type PlanUsuario = 'gratuito' | 'premium';
export type SupermercadoId = 'jumbo' | 'lider' | 'unimarc';

export type Utensilio =
  | 'olla'
  | 'sarten'
  | 'horno'
  | 'microondas'
  | 'licuadora'
  | 'batidora'
  | 'hervidor'
  | 'airfryer'
  | 'tostadora'
  | 'cuchillo'
  | 'tabla';

// ─── /users/{uid} ────────────────────────────────────────────────────────────

export interface UserDoc {
  nombre: string;
  email: string;
  foto?: string;
  plan: PlanUsuario;
  onboardingCompletado: boolean;
  fechaRegistro: FsDate;

  // Gustos y perfil culinario
  gustos: string[];                    // ej: 'italiano', 'picante', 'dulce'
  restriccionesAlimentarias: string[]; // vegetariano, sin-gluten, etc.
  tiempoCocina: number;                // minutos disponibles
  presupuestoSemanal?: number;         // CLP
  utensilios: Utensilio[];

  // BAES (beca alimentación estudiantes)
  esEstudiante: boolean;
  estudianteVerificado: boolean;
  baes?: {
    activo: boolean;
    montoDiario: number;               // CLP
    institucion?: string;
  };

  // Aceptación de Términos y Condiciones (ver src/legal/terms.ts)
  terminos?: {
    version: string;
    aceptadoEn: FsDate;
  };

  // Límites plan Free
  limites: {
    escaneosBoletaMes: number;         // contador mes actual (Free: máx 4)
    mesReferencia: string;             // 'YYYY-MM' para reset
    recetasCacheadas: number;          // Free: máx 10
  };

  supermercadoFavorito?: SupermercadoId;
}

export interface User extends UserDoc {
  id: string; // uid
}

// ─── /pantries/{uid}/items/{itemId} ──────────────────────────────────────────

export type OrigenPantryItem = 'manual' | 'boleta' | 'buscador' | 'receta';

export interface PantryItemDoc {
  nombre: string;
  marca?: string;
  cantidad: number;
  unidad: string;                      // UnidadMedida
  fechaVencimiento?: FsDate;
  categoria?: string;
  imageUrl?: string;
  precioUnitario?: number;             // CLP
  supermercado?: SupermercadoId | string;
  productoScrapedId?: string;          // ref → /products_scraped
  frecuenciaUso?: number;
  agregadoPor: OrigenPantryItem;
  actualizadoEn: FsDate;
}

export interface PantryItem extends PantryItemDoc {
  id: string;
}

// ─── /recipes/{recipeId} ─────────────────────────────────────────────────────

export interface RecipeIngredientDoc {
  nombre: string;                      // nombre genérico ('arroz', no 'Arroz Tucapel 1kg')
  cantidad: number;
  unidad: string;
  equivalenciaSinBalanza?: string;
  productoGenericoId?: string;         // ref → idGenerico en /products_scraped
  opcional?: boolean;
}

export interface RecipeDoc {
  nombre: string;
  descripcion: string;
  imageUrl?: string;
  ingredientes: RecipeIngredientDoc[];
  utensilios: Utensilio[];
  pasos: PasoReceta[];
  tiempoPreparacion: number;           // minutos
  dificultad: 'facil' | 'media' | 'dificil';
  porciones: number;
  calorias?: number;                   // kcal por porción
  macros?: Macros;
  esFitness?: boolean;
  esEstudiante?: boolean;              // económica / BAES
  restricciones: string[];
  temporada?: string[];
  tags?: string[];                     // índice de búsqueda
}

export interface Recipe extends RecipeDoc {
  id: string;
  porcentajeCoincidencia?: number;     // calculado en cliente vs despensa
}

// ─── /shopping_lists/{listId} ────────────────────────────────────────────────

/** Ítem de lista universal: sin amarre a cadena; marca/precio opcionales */
export interface ShoppingItem {
  id: string;              // generado en cliente (timestamp)
  productName: string;
  quantity: number;
  checked: boolean;
  brand: string | null;
  price?: number | null;         // null/"generic" — se resuelve al comprar
  supermarket?: string | null;
}

export interface ShoppingListDoc {
  userId: string;
  name: string;
  createdAt: FsDate;
  items: ShoppingItem[];
}

export interface ShoppingList extends ShoppingListDoc {
  id: string;
}

// ─── /products_scraped/{productId} ───────────────────────────────────────────

export interface PrecioScraped {
  /** jumbo/lider/unimarc u otra cadena scrapeada (santa isabel, acuenta…) */
  supermercado: SupermercadoId | string;
  localId?: string;                    // sucursal específica
  precio: number;                      // CLP
  precioLista?: number;
  enOferta: boolean;
  /** true = scrapeado en ese local; false = referencia sin stock confirmado */
  certezaDato: boolean;
  ultimaActualizacion: FsDate;
}

export interface ProductScrapedDoc {
  nombre: string;
  nombreNormalizado: string;           // lowercase sin tildes → búsqueda indexada
  marca: string;
  formato: string;                     // '1 kg', '900 ml'
  categoria: string;
  imageUrl?: string;
  idGenerico: string;                  // agrupa mismo producto entre supermercados
  precios: PrecioScraped[];
  precioMin?: number;                  // denormalizado para ordenar/filtrar
  scrapeadoEn: FsDate;
}

export interface ProductScraped extends ProductScrapedDoc {
  id: string;
}
