import { Producto } from '../types/producto';

const SCRAPING_API_URL = 'https://qhay-api.vercel.app';
const TIMEOUT_MS = 8000;

export interface ResultadoBusqueda {
  productos: Producto[];
  supermercadosNoDisponibles: string[];
}

function mapearProducto(p: any): Producto {
  return {
    id: p.id,
    nombre: p.nombre,
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

async function buscarEnAPI(query: string): Promise<ResultadoBusqueda> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(
      `${SCRAPING_API_URL}/buscar?q=${encodeURIComponent(query)}`,
      { signal: controller.signal }
    );

    if (!res.ok) throw new Error(`API ${res.status}`);

    const data = await res.json();
    const productos: Producto[] = (data.productos ?? []).map(mapearProducto);

    const supermercadosNoDisponibles: string[] = (data.scrapers?.errores ?? [])
      .map((msg: string) => {
        const match = msg.match(/^([A-Za-z\s]+)\s+(temporalmente|API)/i);
        return match ? match[1].trim() : null;
      })
      .filter(Boolean);

    return { productos, supermercadosNoDisponibles };
  } catch (err: any) {
    const url = `${SCRAPING_API_URL}/buscar?q=${encodeURIComponent(query)}`;
    console.error(`[scraping] ERROR fetching ${url} →`, err?.message ?? err);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function buscarProductos(query: string): Promise<ResultadoBusqueda> {
  try {
    const resultado = await buscarEnAPI(query);
    if (resultado.productos.length > 0 || resultado.supermercadosNoDisponibles.length > 0) {
      return resultado;
    }
  } catch (err: any) {
    console.error('[scraping] buscarProductos falló, devolviendo vacío:', err?.message ?? err);
  }

  return { productos: [], supermercadosNoDisponibles: [] };
}
