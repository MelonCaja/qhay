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
  distanceKm: number;
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

  // Build a summary for every market
  const summaries: MarketSummary[] = markets.map((market) => {
    // Total cost: sum of each item's price in this market
    const totalCost = items.reduce((acc, item) => {
      const priceEntry = item.todosLosPrecios?.find(
        (p) => p.supermercado === market.nombre
      );
      const unitPrice = priceEntry?.precio ?? item.precioEstimado ?? 0;
      return acc + unitPrice * item.cantidad;
    }, 0);

    const distanceKm = distanciaKm(userLoc.lat, userLoc.lng, market.lat, market.lng);

    return { market, totalCost, distanceKm };
  });

  // Cheapest by total cost
  const cheapest = summaries.reduce((a, b) => (a.totalCost <= b.totalCost ? a : b));

  // Nearest by distance
  const nearest = summaries.reduce((a, b) => (a.distanceKm <= b.distanceKm ? a : b));

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
