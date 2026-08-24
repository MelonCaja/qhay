import { API_BASE_URL } from '../config/api';

export type CategoriaId =
  | 'frutas_verduras'
  | 'lacteos'
  | 'quesos_fiambres'
  | 'despensa'
  | 'carnes_pescados'
  | 'panaderia'
  | 'bebidas'
  | 'snacks'
  | 'limpieza'
  | 'cuidado_personal'
  | 'mascotas'
  | 'hogar'
  | 'farmacia';

export interface ItemBoleta {
  nombre: string;
  cantidad: number;
  unidad: string;
  precioUnitario?: number;
  categoria?: CategoriaId;
}

/**
 * Analiza una foto de boleta con GPT-4o Vision vía api/ (POST /analizar-boleta),
 * que llama a OpenAI server-side con OPENAI_API_KEY. No llamar a OpenAI directo
 * desde aquí: en un bundle web la key quedaría expuesta en las devtools.
 */
export async function escanearBoleta(base64Image: string): Promise<ItemBoleta[]> {
  const res = await fetch(`${API_BASE_URL}/analizar-boleta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagen: base64Image }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Error al analizar boleta: ${res.status}`);
  }

  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}

/**
 * Busca un producto por código de barras en Open Food Facts (gratis, sin API key).
 * Retorna null si no se encuentra.
 */
export async function buscarPorCodigoBarras(codigo: string): Promise<ItemBoleta | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${codigo}.json?fields=product_name,product_name_es,brands,quantity,categories_tags`,
    { headers: { 'User-Agent': 'QhayApp/1.0' } }
  );

  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;

  const p = data.product;
  const nombre = (p.product_name_es || p.product_name || '').trim();
  if (!nombre) return null;

  // Detectar unidad desde quantity ("500 g", "1 L", "6 x 350 ml", etc.)
  const { cantidad, unidad } = parsearCantidad(p.quantity ?? '');

  return {
    nombre: p.brands ? `${nombre} ${p.brands.split(',')[0].trim()}` : nombre,
    cantidad,
    unidad,
  };
}

function parsearCantidad(quantity: string): { cantidad: number; unidad: string } {
  const q = quantity.toLowerCase().trim();
  // "6 x 350 ml" → cantidad 6, unidad "unidad"
  const multi = q.match(/^(\d+)\s*x/);
  if (multi) return { cantidad: parseInt(multi[1]), unidad: 'unidad' };
  // "500 g", "1.5 L", etc.
  const simple = q.match(/([\d.,]+)\s*(kg|g|l|ml|lt)/i);
  if (simple) {
    const map: Record<string, string> = { kg: 'kg', g: 'g', l: 'L', lt: 'L', ml: 'ml' };
    return { cantidad: 1, unidad: map[simple[2].toLowerCase()] ?? 'unidad' };
  }
  return { cantidad: 1, unidad: 'unidad' };
}
