/**
 * Tipos de las tablas PostgreSQL (ver supabase/schema.sql).
 * *Row = fila leída; *Insert = payload de inserción (defaults opcionales).
 */

export type PlanType = 'gratuito' | 'premium';

// ─── profiles ────────────────────────────────────────────────────────────────

export interface ProfileRow {
  id: string; // uuid = auth.users.id
  name: string;
  plan_type: PlanType;
  dietary_restrictions: string[];
  kitchen_utensils: string[];
  is_baes_verified: boolean;
  avatar_url: string | null;
  onboarding_completed: boolean;
  is_student: boolean;
  tastes: string[]; // gustos culinarios ('italiano', 'picante', …)
  weekly_budget: number | null; // CLP
  cooking_time_minutes: number;
  terms_version: string | null;
  terms_accepted_at: string | null; // ISO timestamptz
  favorite_supermarket: string | null;
  scan_month_ref: string; // 'YYYY-MM'
  monthly_scan_count: number;
  cached_recipes_count: number;
  baes_active: boolean;
  baes_daily_amount: number | null; // CLP
  baes_institution: string | null;
  created_at: string; // ISO timestamptz
}

export type ProfileUpdate = Partial<Omit<ProfileRow, 'id' | 'created_at'>>;

// ─── pantries ────────────────────────────────────────────────────────────────

export interface PantryRow {
  id: string;
  user_id: string;
  product_name: string;
  brand: string | null;
  quantity: number;
  unit: string;
  expires_at: string | null; // ISO date 'YYYY-MM-DD'
  category: string | null;
  image_url: string | null;
  unit_price: number | null; // CLP
  supermarket: string | null;
  added_by: string; // 'manual' | 'boleta' | 'buscador'
  usage_count: number;
  updated_at: string;
  created_at: string;
}

export interface PantryInsert {
  user_id: string;
  product_name: string;
  brand?: string | null;
  quantity?: number;
  unit?: string;
  expires_at?: string | null;
  category?: string | null;
  image_url?: string | null;
  unit_price?: number | null;
  supermarket?: string | null;
  added_by?: string;
  usage_count?: number;
}

export type PantryUpdate = Partial<Omit<PantryRow, 'id' | 'user_id' | 'created_at'>>;

// ─── recipes / recipe_ingredients ────────────────────────────────────────────

export interface MacrosJson {
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}

export interface PasoRecetaJson {
  numero: number;
  descripcion: string;
  timerSegundos?: number;
  foto?: string;
}

export interface RecipeRow {
  id: string;
  title: string;
  instructions: string[]; // legacy sprint 1 — superseded por steps jsonb
  utensils_required: string[];
  calories: number | null;
  description: string;
  image_url: string | null;
  steps: PasoRecetaJson[]; // jsonb
  prep_time_minutes: number;
  difficulty: string; // 'facil' | 'media' | 'dificil'
  servings: number;
  macros: MacrosJson | null; // jsonb
  is_fitness: boolean;
  is_student: boolean;
  restrictions: string[];
  seasons: string[];
  created_at: string;
}

export interface RecipeIngredientRow {
  id: string;
  recipe_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  no_scale_equivalent: string | null;
  is_optional: boolean;
}

/** Receta con ingredientes embebidos (join recipes ← recipe_ingredients) */
export interface RecipeWithIngredients extends RecipeRow {
  recipe_ingredients: RecipeIngredientRow[];
}

/** Fila devuelta por la RPC sugerir_recetas (JOIN pantries × recipe_ingredients) */
export interface SugerenciaRow extends Omit<RecipeRow, 'instructions' | 'created_at'> {
  ingredients: {
    nombre: string;
    cantidad: number;
    unidad: string;
    equivalenciaSinBalanza: string | null;
    opcional: boolean;
    disponibleEnDespensa: boolean;
  }[];
  match_pct: number;
  score: number;
  expiring: string[];
  missing: string[];
}

// ─── products_scraped ────────────────────────────────────────────────────────

export interface ProductScrapedRow {
  id: string;
  supermarket: string;
  brand: string;
  product_name: string;
  format: string;
  price: number;
  image_url: string | null;
  category: string;
  list_price: number | null;
  on_sale: boolean;
  certainty: boolean;
  updated_at: string;
}

export interface ProductScrapedInsert {
  supermarket: string;
  brand?: string;
  product_name: string;
  format?: string;
  price: number;
  image_url?: string | null;
  category?: string;
  list_price?: number | null;
  on_sale?: boolean;
  certainty?: boolean;
  updated_at?: string;
}

// ─── shopping_lists / shopping_list_items ────────────────────────────────────

export interface ShoppingListRow {
  id: string;
  user_id: string;
  list_name: string;
  created_at: string;
}

export interface ShoppingListItemRow {
  id: string;
  list_id: string;
  product_name: string;
  quantity: number;
  is_checked: boolean;
  store_name: string; // 'generic' = sin amarre a cadena
  brand: string | null;
  price: number | null; // CLP
  unit: string;
  category: string | null;
  product_ref: string | null; // idGenerico → products_scraped
  all_prices: unknown | null; // jsonb: PrecioSupermercado[] serializado
  created_at: string;
}

export interface ShoppingListItemInsert {
  list_id: string;
  product_name: string;
  quantity?: number;
  is_checked?: boolean;
  store_name?: string;
  brand?: string | null;
  price?: number | null;
  unit?: string;
  category?: string | null;
  product_ref?: string | null;
  all_prices?: unknown | null;
}

/** Lista con items embebidos (join shopping_lists ← shopping_list_items) */
export interface ShoppingListWithItems extends ShoppingListRow {
  shopping_list_items: ShoppingListItemRow[];
}
