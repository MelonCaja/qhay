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

/** CLP por km recorrido (ida y vuelta se calcula aparte) — bencina/micro aprox */
export const COSTO_TRANSPORTE_POR_KM = 150;

export interface MarketSummaryReal extends MarketSummary {
  costoDesplazamiento: number; // CLP, ida y vuelta
  costoTotalReal: number;      // totalAjustado + desplazamiento
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

function buildSummaries(
  userLoc: UserLocation,
  items: ItemLista[],
  markets: Supermercado[]
): MarketSummary[] {
  // Penalización por ítems sin stock confirmado:
  // Si stockRatio = 0.5 → totalAjustado = totalCost × 1.5 (50% de penalidad)
  // Si stockRatio = 0   → totalAjustado = totalCost × 2   (100% de penalidad)
  const STOCK_PENALTY = 1.0;

  return markets.map((market) => {
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

  const summaries = buildSummaries(userLoc, items, markets);

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

/**
 * Ranking por costo REAL: precio de la lista (ajustado por stock) + costo de
 * desplazamiento ida y vuelta (distancia × 2 × COSTO_TRANSPORTE_POR_KM).
 * El primero del ranking es el óptimo precio/distancia; incluye saveLabel
 * con el ahorro real frente al local más cercano.
 */
export function rankMarketsReal(
  userLoc: UserLocation,
  items: ItemLista[],
  markets: Supermercado[]
): MarketSummaryReal[] {
  if (markets.length === 0) return [];

  const summaries: MarketSummaryReal[] = buildSummaries(userLoc, items, markets).map((sm) => {
    const costoDesplazamiento = Math.round(sm.distanceKm * 2 * COSTO_TRANSPORTE_POR_KM);
    return {
      ...sm,
      costoDesplazamiento,
      costoTotalReal: Math.round(sm.totalAjustado + costoDesplazamiento),
    };
  });

  summaries.sort((a, b) => a.costoTotalReal - b.costoTotalReal);

  const nearest = summaries.reduce((a, b) => (a.distanceKm <= b.distanceKm ? a : b));
  const best = summaries[0];
  const ahorroReal = Math.round(nearest.costoTotalReal - best.costoTotalReal);
  if (best.market.id !== nearest.market.id && ahorroReal >= 500) {
    summaries[0] = {
      ...best,
      saveLabel: `Ahorra $${ahorroReal.toLocaleString('es-CL')}`,
    };
  }

  return summaries;
}
