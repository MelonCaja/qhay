import { supabase } from '../config/supabase';
import { Producto } from '../types/producto';
import type { ProductScraped, PrecioScraped } from '../types/firestore';
import type { ProductScrapedRow, ProductScrapedInsert } from '../types/supabase';

const TABLA = 'products_scraped';
const MAX_EDAD_HORAS = 24;        // frescura máxima del índice antes de re-scrapear
const CLAVE_UNICA = 'supermarket,product_name,brand,format'; // unique del schema

const norm = (s: string) =>
  s.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');

/** ID estable que agrupa el mismo producto entre supermercados */
export function idGenericoDe(p: { nombre: string; marca?: string; formato?: string }): string {
  return [norm(p.nombre), norm(p.marca ?? ''), norm(p.formato ?? '')]
    .filter(Boolean).join('_').replace(/\s/g, '-').slice(0, 200);
}

// ─── 5.1 ACTUALIZACIÓN POR LOTES ─────────────────────────────────────────────

/**
 * Persiste resultados del scraping como upsert masivo sobre el unique
 * (supermarket, product_name, brand, format): re-scrapear actualiza el precio
 * en vez de duplicar. 1 fila por producto×supermercado, 1 round trip total.
 */
export async function actualizarPreciosBatch(productos: Producto[]): Promise<number> {
  // Dedupe por clave única: dos filas iguales en el mismo upsert rompen
  // ON CONFLICT DO UPDATE ("cannot affect row a second time")
  const filas = new Map<string, ProductScrapedInsert>();

  for (const p of productos) {
    if (!p.nombre || p.precios.length === 0) continue;
    for (const pr of p.precios) {
      const supermercado = norm(pr.supermercado);
      const fila: ProductScrapedInsert = {
        supermarket: supermercado,
        brand: p.marca ?? '',
        product_name: p.nombre,
        format: p.formato ?? '',
        price: pr.precio,
        list_price: pr.precioLista ?? null,
        on_sale: pr.enOferta,
        certainty: pr.certezaDato ?? true,
        image_url: p.imageUrl ?? null,
        updated_at: new Date().toISOString(),
      };
      filas.set(`${supermercado}|${p.nombre}|${fila.brand}|${fila.format}`, fila);
    }
  }
  if (filas.size === 0) return 0;

  const { error } = await supabase
    .from(TABLA)
    .upsert([...filas.values()], { onConflict: CLAVE_UNICA });
  if (error) throw error;
  return filas.size;
}

// ─── 5.2 BUSCADOR FTS NATIVO ─────────────────────────────────────────────────

/** Término libre → tsquery de prefijos: "arroz tuc" → "arroz:* & tuc:*" */
function aTsQuery(termino: string): string {
  return norm(termino)
    .split(' ')
    .filter((t) => t.length >= 2)
    .map((t) => `${t}:*`)
    .join(' & ');
}

/** Agrupa filas producto×supermercado en un ProductScraped con precios[] */
function agruparPorProducto(rows: ProductScrapedRow[]): ProductScraped[] {
  const grupos = new Map<string, ProductScrapedRow[]>();
  for (const r of rows) {
    const key = idGenericoDe({ nombre: r.product_name, marca: r.brand, formato: r.format });
    const grupo = grupos.get(key);
    if (grupo) grupo.push(r);
    else grupos.set(key, [r]);
  }

  return [...grupos.entries()].map(([idGenerico, filas]) => {
    const precios: PrecioScraped[] = filas.map((f) => ({
      supermercado: f.supermarket,
      precio: f.price,
      ...(f.list_price != null ? { precioLista: f.list_price } : {}),
      enOferta: f.on_sale,
      certezaDato: f.certainty,
      ultimaActualizacion: new Date(f.updated_at),
    }));
    const base = filas[0];
    return {
      id: idGenerico,
      idGenerico,
      nombre: base.product_name,
      nombreNormalizado: norm(base.product_name),
      marca: base.brand,
      formato: base.format,
      categoria: base.category,
      imageUrl: filas.find((f) => f.image_url)?.image_url ?? undefined,
      precios,
      precioMin: Math.min(...precios.map((x) => x.precio)),
      scrapeadoEn: new Date(Math.max(...filas.map((f) => Date.parse(f.updated_at)))),
    } as ProductScraped;
  });
}

/**
 * Búsqueda full-text nativa sobre la columna generada fts (tsvector spanish,
 * índice GIN): match por prefijo en nombre + marca, sin scraping en vivo.
 * limit alto porque cada producto ocupa hasta ~6 filas (una por supermercado).
 */
export async function buscarIndexado(termino: string, max = 25): Promise<ProductScraped[]> {
  const tsquery = aTsQuery(termino);
  if (!tsquery) return [];
  const { data, error } = await supabase
    .from(TABLA)
    .select('*')
    .textSearch('fts', tsquery, { config: 'spanish' })
    .order('updated_at', { ascending: false })
    .limit(max * 6);
  if (error) throw error;
  return agruparPorProducto(data as ProductScrapedRow[]).slice(0, max);
}

/** true si el resultado indexado sigue fresco (no requiere scraping en vivo) */
export function indiceFresco(productos: ProductScraped[]): boolean {
  if (productos.length === 0) return false;
  const limite = Date.now() - MAX_EDAD_HORAS * 3600_000;
  return productos.some((p) => (p.scrapeadoEn as Date).getTime() >= limite);
}

/** Mapea el modelo agrupado al modelo legacy de UI */
export function aProducto(ps: ProductScraped): Producto {
  return {
    id: ps.id,
    nombre: ps.nombre,
    marca: ps.marca,
    formato: ps.formato,
    imageUrl: ps.imageUrl,
    precios: ps.precios.map((pr) => ({
      supermercado: pr.supermercado,
      precio: pr.precio,
      enOferta: pr.enOferta,
      precioLista: pr.precioLista,
      ultimaActualizacion: pr.ultimaActualizacion as Date,
      certezaDato: pr.certezaDato,
    })),
  };
}
