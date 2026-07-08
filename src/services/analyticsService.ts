import { Ingrediente } from '../types/ingrediente';
import { Receta } from '../types/receta';

/**
 * Agregadores de analíticas Premium — 100% en cliente, 0 lecturas extra:
 * operan sobre la despensa ya cargada y las recetas ya cacheadas.
 */

export interface GastoAgregado {
  clave: string;   // categoría o supermercado
  total: number;   // CLP
  items: number;
  pct: number;     // [0,100] sobre el total
}

export interface ResumenGasto {
  total: number;
  items: number;
  promedioItem: number;
  porCategoria: GastoAgregado[];
  porSupermercado: GastoAgregado[];
}

const gastoDe = (i: Ingrediente): number =>
  (i.precioUnitario ?? 0) * (i.cantidad > 0 ? i.cantidad : 1);

function agrupar(
  despensa: Ingrediente[],
  claveDe: (i: Ingrediente) => string
): GastoAgregado[] {
  const mapa = new Map<string, { total: number; items: number }>();
  let totalGlobal = 0;

  for (const item of despensa) {
    const gasto = gastoDe(item);
    if (gasto <= 0) continue;
    totalGlobal += gasto;
    const clave = claveDe(item);
    const acc = mapa.get(clave) ?? { total: 0, items: 0 };
    acc.total += gasto;
    acc.items += 1;
    mapa.set(clave, acc);
  }

  return [...mapa.entries()]
    .map(([clave, { total, items }]) => ({
      clave,
      total: Math.round(total),
      items,
      pct: totalGlobal > 0 ? Math.round((total / totalGlobal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function resumenGasto(despensa: Ingrediente[]): ResumenGasto {
  const conPrecio = despensa.filter((i) => (i.precioUnitario ?? 0) > 0);
  const total = Math.round(conPrecio.reduce((acc, i) => acc + gastoDe(i), 0));
  return {
    total,
    items: conPrecio.length,
    promedioItem: conPrecio.length > 0 ? Math.round(total / conPrecio.length) : 0,
    porCategoria: agrupar(despensa, (i) => i.categoria ?? 'sin_categoria'),
    porSupermercado: agrupar(despensa, (i) => i.supermercado ?? 'Otro'),
  };
}

// ─── NUTRICIÓN ───────────────────────────────────────────────────────────────

export interface PerfilNutricional {
  recetas: number;             // recetas consideradas (favoritas con macros)
  caloriasPromedio: number;    // kcal por porción
  proteinasPromedio: number;   // g por porción
  carbohidratosPromedio: number;
  grasasPromedio: number;
  pctProteinas: number;        // distribución [0,100]
  pctCarbohidratos: number;
  pctGrasas: number;
}

/** Perfil nutricional promedio de un set de recetas (p. ej. favoritas) */
export function perfilNutricional(recetas: Receta[]): PerfilNutricional | null {
  const conMacros = recetas.filter((r) => r.macros);
  if (conMacros.length === 0) return null;

  let prot = 0, carb = 0, gras = 0, cal = 0, conCal = 0;
  for (const r of conMacros) {
    prot += r.macros!.proteinas;
    carb += r.macros!.carbohidratos;
    gras += r.macros!.grasas;
    if (r.calorias) { cal += r.calorias; conCal++; }
  }
  const n = conMacros.length;
  const pProm = prot / n;
  const cProm = carb / n;
  const gProm = gras / n;
  const totalMacros = pProm + cProm + gProm || 1;

  return {
    recetas: n,
    caloriasPromedio: conCal > 0 ? Math.round(cal / conCal) : 0,
    proteinasPromedio: Math.round(pProm),
    carbohidratosPromedio: Math.round(cProm),
    grasasPromedio: Math.round(gProm),
    pctProteinas: Math.round((pProm / totalMacros) * 100),
    pctCarbohidratos: Math.round((cProm / totalMacros) * 100),
    pctGrasas: Math.round((gProm / totalMacros) * 100),
  };
}
