import { Ingrediente } from '../types/ingrediente';
import { IngredienteReceta, Receta } from '../types/receta';
import { ItemLista, Supermercado } from '../types/producto';

export interface UserLocation {
  lat: number;
  lng: number;
}

export interface MarketSummary {
  market: Supermercado;
  totalCost: number;
  totalAjustado: number; // totalCost penalizado por ítems sin stock confirmado
  distanceKm: number;
  itemsConCerteza: number;
  itemsEstimados: number;
  saveLabel?: string; // e.g. "Ahorra $1.200"
}

// Haversine distance in km between two lat/lng points
function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Evaluates a list of markets and returns the best one given the user's
 * location and a shopping list.
 *
 * Decision rule:
 *   - If (price_nearest − price_cheapest) < 1000 → return nearest
 *   - Otherwise → return cheapest with "Ahorra $X" label
 */
export function getBestMarket(
  userLoc: UserLocation,
  items: ItemLista[],
  markets: Supermercado[]
): MarketSummary | null {
  if (markets.length === 0) return null;

  // Penalización por ítems sin stock confirmado:
  // Si stockRatio = 0.5 → totalAjustado = totalCost × 1.5 (50% de penalidad)
  // Si stockRatio = 0   → totalAjustado = totalCost × 2   (100% de penalidad)
  const STOCK_PENALTY = 1.0;

  // Build a summary for every market
  const summaries: MarketSummary[] = markets.map((market) => {
    let totalCost = 0;
    let itemsConCerteza = 0;
    let itemsEstimados = 0;

    items.forEach((item) => {
      const priceEntry = item.todosLosPrecios?.find(
        (p) => p.supermercado === market.nombre,
      );
      if (priceEntry) {
        totalCost += priceEntry.precio * item.cantidad;
        itemsConCerteza++;
      } else {
        // Fallback a precio estimado — no hay stock confirmado en este local
        totalCost += (item.precioEstimado ?? 0) * item.cantidad;
        itemsEstimados++;
      }
    });

    const totalItems = items.length;
    const stockRatio = totalItems > 0 ? itemsConCerteza / totalItems : 1;
    // Si todos los ítems son estimados: penalidad × 0.5 como pide la tarea
    const totalAjustado = totalCost * (1 + STOCK_PENALTY * (1 - stockRatio));

    const distanceKm = distanciaKm(userLoc.lat, userLoc.lng, market.lat, market.lng);

    return { market, totalCost, totalAjustado, distanceKm, itemsConCerteza, itemsEstimados };
  });

  // Cheapest por totalAjustado (penaliza locales sin stock confirmado)
  const cheapest = summaries.reduce((a, b) => (a.totalAjustado <= b.totalAjustado ? a : b));

  // Nearest by distance
  const nearest = summaries.reduce((a, b) => (a.distanceKm <= b.distanceKm ? a : b));

  // Diferencia de precio real (no ajustado) para el label de ahorro
  const priceDiff = nearest.totalCost - cheapest.totalCost;

  if (priceDiff < 1000) {
    return nearest;
  }

  return {
    ...cheapest,
    saveLabel: `Ahorra $${Math.round(priceDiff).toLocaleString('es-CL')}`,
  };
}

export interface PantryUpdateResult {
  updated: Array<{ id: string; nombre: string; cantidadAnterior: number; cantidadNueva: number }>;
  removed: Array<{ id: string; nombre: string }>;
  notFound: string[];
}

/**
 * Decrements pantry quantities for every ingredient used in a cooked recipe.
 * Returns three lists: updated items, fully depleted items (to delete), and
 * ingredient names that had no match in the pantry.
 *
 * The caller is responsible for persisting the changes (e.g. calling the
 * Firestore/store layer with the returned lists).
 */
export function handleCookedRecipe(
  pantry: Ingrediente[],
  recipe: Receta
): PantryUpdateResult {
  const result: PantryUpdateResult = { updated: [], removed: [], notFound: [] };

  for (const recipeIng of recipe.ingredientes) {
    const match = findPantryMatch(recipeIng, pantry);

    if (!match) {
      result.notFound.push(recipeIng.nombre);
      continue;
    }

    const cantidadAnterior = match.cantidad;
    const cantidadNueva = cantidadAnterior - recipeIng.cantidad;

    if (cantidadNueva <= 0) {
      result.removed.push({ id: match.id, nombre: match.nombre });
    } else {
      result.updated.push({
        id: match.id,
        nombre: match.nombre,
        cantidadAnterior,
        cantidadNueva,
      });
    }
  }

  return result;
}

// Flexible name matching: substring in either direction (same logic as the rest of the app)
function findPantryMatch(
  recipeIng: IngredienteReceta,
  pantry: Ingrediente[]
): Ingrediente | undefined {
  const target = recipeIng.nombre.toLowerCase();
  return pantry.find((item) => {
    const pantryName = item.nombre.toLowerCase();
    return pantryName.includes(target) || target.includes(pantryName);
  });
}
