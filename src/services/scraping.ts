import { Producto } from '../types/producto';

const SCRAPING_API_URL = 'https://qhay-api.vercel.app';
// 25 s — la API scraping 6 supermercados en paralelo puede tardar en cold start
const TIMEOUT_MS = 25_000;

export interface ResultadoBusqueda {
  productos: Producto[];
  supermercadosNoDisponibles: string[];
}

function mapearProducto(p: any): Producto {
  return {
    id: p.id ?? String(Math.random()),
    nombre: p.nombre ?? '',
    marca: p.marca ?? '',
    formato: p.formato ?? '',
    imageUrl: p.imageUrl || p.image || p.foto || undefined,
    precios: (p.precios ?? []).map((pr: any) => ({
      supermercado: pr.supermercado,
      precio: pr.precio,
      enOferta: pr.enOferta ?? false,
      precioLista: pr.precioLista,
      ultimaActualizacion: new Date(pr.ultimaActualizacion ?? Date.now()),
    })),
  };
}

/**
 * Función única — sin doble-catch que silencia errores.
 * Logs en cada paso del pipeline para debug en consola de Expo Go.
 */
export async function buscarProductos(query: string): Promise<ResultadoBusqueda> {
  const url = `${SCRAPING_API_URL}/buscar?q=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    console.warn('[scraping] TIMEOUT alcanzado (25s), abortando petición:', url);
    controller.abort();
  }, TIMEOUT_MS);

  try {
    console.log('[scraping] →', url);
    const res = await fetch(url, { signal: controller.signal });

    console.log('[scraping] HTTP status:', res.status, res.statusText);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

    const data = await res.json();
    console.log('[scraping] data.total:', data.total, '| data.productos?.length:', data.productos?.length);

    const productos: Producto[] = (data.productos ?? []).map(mapearProducto);
    console.log('[scraping] productos mapeados:', productos.length,
      '| primero:', productos[0]?.nombre, '| imageUrl:', productos[0]?.imageUrl ?? 'sin imagen');

    const supermercadosNoDisponibles: string[] = (data.scrapers?.errores ?? [])
      .map((msg: string) => {
        const match = msg.match(/^([A-Za-z\s]+)\s+(temporalmente|API)/i);
        return match ? match[1].trim() : null;
      })
      .filter(Boolean) as string[];

    return { productos, supermercadosNoDisponibles };

  } catch (err: any) {
    const esTimeout = err?.name === 'AbortError';
    console.error(
      `[scraping] ${esTimeout ? 'TIMEOUT' : 'ERROR'} en "${query}":`,
      err?.message ?? err
    );
    return { productos: [], supermercadosNoDisponibles: [] };
  } finally {
    clearTimeout(timer);
  }
}
