import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  startAt,
  endAt,
  limit,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Producto } from '../types/producto';
import type { ProductScraped, PrecioScraped } from '../types/firestore';

const COL = 'products_scraped';
const BATCH_MAX = 450;            // margen bajo el límite de 500 ops por batch
const MAX_EDAD_HORAS = 24;        // frescura máxima del índice antes de re-scrapear

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
 * Persiste resultados del scraping en /products_scraped usando writeBatch
 * (lotes de 450 ops, merge). El doc ID es el idGenerico → re-scrapear el mismo
 * producto sobreescribe en vez de duplicar. 0 lecturas, N/450 commits.
 */
export async function actualizarPreciosBatch(productos: Producto[]): Promise<number> {
  if (productos.length === 0) return 0;
  let escritos = 0;

  for (let i = 0; i < productos.length; i += BATCH_MAX) {
    const chunk = productos.slice(i, i + BATCH_MAX);
    const batch = writeBatch(db);

    for (const p of chunk) {
      if (!p.nombre || p.precios.length === 0) continue;
      const id = idGenericoDe(p);
      const precios: PrecioScraped[] = p.precios.map((pr) => ({
        supermercado: norm(pr.supermercado),
        precio: pr.precio,
        ...(pr.precioLista != null ? { precioLista: pr.precioLista } : {}),
        enOferta: pr.enOferta,
        certezaDato: pr.certezaDato ?? true,
        ultimaActualizacion: Timestamp.fromDate(
          pr.ultimaActualizacion instanceof Date ? pr.ultimaActualizacion : new Date()
        ),
      }));

      batch.set(
        doc(db, COL, id),
        {
          nombre: p.nombre,
          nombreNormalizado: norm(p.nombre),
          marca: p.marca ?? '',
          formato: p.formato ?? '',
          categoria: '',
          ...(p.imageUrl ? { imageUrl: p.imageUrl } : {}),
          idGenerico: id,
          precios,
          precioMin: Math.min(...precios.map((x) => x.precio)),
          scrapeadoEn: Timestamp.now(),
        },
        { merge: true }
      );
      escritos++;
    }

    await batch.commit();
  }
  return escritos;
}

// ─── 5.2 BUSCADOR INDEXADO ───────────────────────────────────────────────────

/**
 * Búsqueda por prefijo sobre nombreNormalizado (índice simple de Firestore).
 * Lecturas acotadas por `max` — mucho más barato/rápido que scraping en vivo.
 */
export async function buscarIndexado(termino: string, max = 25): Promise<ProductScraped[]> {
  const t = norm(termino);
  if (!t) return [];
  const snap = await getDocs(
    query(
      collection(db, COL),
      orderBy('nombreNormalizado'),
      startAt(t),
      endAt(t + '\uf8ff'),
      limit(max)
    )
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      scrapeadoEn: data.scrapeadoEn instanceof Timestamp ? data.scrapeadoEn.toDate() : new Date(0),
      precios: (data.precios ?? []).map((pr: PrecioScraped) => ({
        ...pr,
        ultimaActualizacion: pr.ultimaActualizacion instanceof Timestamp
          ? pr.ultimaActualizacion.toDate()
          : pr.ultimaActualizacion,
      })),
    } as ProductScraped;
  });
}

/** true si el resultado indexado sigue fresco (no requiere scraping en vivo) */
export function indiceFresco(productos: ProductScraped[]): boolean {
  if (productos.length === 0) return false;
  const limite = Date.now() - MAX_EDAD_HORAS * 3600_000;
  return productos.some((p) => (p.scrapeadoEn as Date).getTime() >= limite);
}

/** Mapea el modelo Firestore al modelo legacy de UI */
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
