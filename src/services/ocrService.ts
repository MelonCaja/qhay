import { buscarIndexado } from './productService';
import type { ProductScraped } from '../types/firestore';
import type { ItemBoleta } from './boleta';

/**
 * Pipeline OCR de boletas:
 *  1. parsearTextoBoleta(): texto sucio de Google ML Kit → ItemBoleta[]
 *     (conectar @react-native-ml-kit/text-recognition en dev build; el parser
 *     recibe el string plano y es agnóstico del motor OCR).
 *  2. mapearItemsAProductos(): fuzzy matching contra /products_scraped para
 *     enriquecer con imagen, precio de referencia e id del producto.
 */

const norm = (s: string) =>
  s.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ─── FUZZY MATCHING (Dice sobre bigramas + solapamiento de tokens) ───────────

function bigramas(s: string): Set<string> {
  const b = new Set<string>();
  const t = s.replace(/\s/g, '');
  for (let i = 0; i < t.length - 1; i++) b.add(t.slice(i, i + 2));
  return b;
}

/** Similitud [0,1] tolerante a abreviaciones de boleta ("LCH DESC COLUN") */
export function similitud(a: string, b: string): number {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  // Dice sobre bigramas
  const ba = bigramas(na);
  const bb = bigramas(nb);
  let inter = 0;
  for (const x of ba) if (bb.has(x)) inter++;
  const dice = (2 * inter) / (ba.size + bb.size || 1);

  // Solapamiento de tokens (prefijos: "lch" matchea "leche")
  const ta = na.split(' ');
  const tb = nb.split(' ');
  let hits = 0;
  for (const t of ta) {
    if (t.length < 2) continue;
    if (tb.some((u) => u.startsWith(t) || t.startsWith(u))) hits++;
  }
  const tokenScore = hits / Math.max(ta.length, 1);

  return Math.max(dice, tokenScore * 0.9);
}

/** Umbral mínimo para aceptar un match boleta→producto */
export const UMBRAL_MATCH = 0.45;

// ─── PARSER DE TEXTO OCR (ML Kit) ────────────────────────────────────────────

const LINEAS_IGNORAR = /total|subtotal|iva|efectivo|cambio|vuelto|tarjeta|debito|credito|boleta|rut|sii|gracias|puntos|ahorro|descuento total|n°|nro/i;

/**
 * Convierte el texto plano de ML Kit en items estructurados.
 * Formato típico chileno: "COCA COLA ZERO 1.5L   2.190" o
 * "2 x 1.090\nPAN HALLULLA KG  2.180".
 */
export function parsearTextoBoleta(textoOCR: string): ItemBoleta[] {
  const items: ItemBoleta[] = [];
  const lineas = textoOCR.split('\n').map((l) => l.trim()).filter(Boolean);
  let cantidadPendiente = 1;

  for (const linea of lineas) {
    if (LINEAS_IGNORAR.test(linea)) continue;

    // "2 x 1.090" → cantidad para la línea siguiente
    const multi = linea.match(/^(\d{1,2})\s*[xX]\s*[\d.,]+$/);
    if (multi) {
      cantidadPendiente = parseInt(multi[1], 10);
      continue;
    }

    // "NOMBRE PRODUCTO  12.345" (precio al final, formato CLP)
    const m = linea.match(/^(.{4,}?)\s+\$?\s*([\d]{1,3}(?:[.,]\d{3})+|\d{3,6})$/);
    if (!m) continue;

    const nombre = m[1].replace(/\s{2,}/g, ' ').trim();
    const precio = parseInt(m[2].replace(/[.,]/g, ''), 10);
    if (!nombre || !precio || precio < 50 || precio > 500_000) continue;
    if (/^\d+$/.test(nombre)) continue; // solo código

    items.push({
      nombre,
      cantidad: cantidadPendiente,
      unidad: 'unidad',
      precioUnitario: Math.round(precio / cantidadPendiente),
    });
    cantidadPendiente = 1;
  }

  return items;
}

// ─── MAPEO A /products_scraped ───────────────────────────────────────────────

export interface ItemBoletaMapeado extends ItemBoleta {
  productoScrapedId?: string;
  imageUrl?: string;
  confianzaMatch?: number; // [0,1]
}

async function mejorMatch(item: ItemBoleta): Promise<ProductScraped | null> {
  // Busca por el primer token significativo (índice por prefijo, lecturas acotadas)
  const tokens = norm(item.nombre).split(' ').filter((t) => t.length >= 3);
  if (tokens.length === 0) return null;

  const candidatos = await buscarIndexado(tokens[0], 15).catch(() => []);
  let mejor: ProductScraped | null = null;
  let mejorScore = 0;
  for (const c of candidatos) {
    const score = similitud(item.nombre, `${c.nombre} ${c.marca}`);
    if (score > mejorScore) {
      mejorScore = score;
      mejor = c;
    }
  }
  return mejorScore >= UMBRAL_MATCH ? mejor : null;
}

/**
 * Enriquece items de boleta con datos del catálogo scrapeado.
 * El item conserva sus datos originales; el match solo agrega imagen,
 * id de producto y precio de referencia si la boleta no lo trae.
 */
export async function mapearItemsAProductos(items: ItemBoleta[]): Promise<ItemBoletaMapeado[]> {
  return Promise.all(
    items.map(async (item) => {
      const match = await mejorMatch(item);
      if (!match) return { ...item };
      return {
        ...item,
        productoScrapedId: match.idGenerico,
        imageUrl: match.imageUrl,
        precioUnitario: item.precioUnitario ?? match.precioMin,
        categoria: item.categoria ?? (match.categoria as ItemBoleta['categoria'] || undefined),
        confianzaMatch: similitud(item.nombre, `${match.nombre} ${match.marca}`),
      };
    })
  );
}
