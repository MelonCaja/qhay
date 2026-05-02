// services/scraping.ts
import { Producto } from '../types/producto';

const SCRAPING_API_URL = 'https://qhay.vercel.app';

/**
 * Normaliza texto (insensible a mayúsculas y tildes)
 */
function normalizar(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Busca en la API real y transforma la respuesta al tipo Producto
 */
async function buscarEnAPI(query: string): Promise<Producto[]> {
  const url = `${SCRAPING_API_URL}/buscar?q=${encodeURIComponent(query)}`;

  // Timeout manual
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();

    return (data.productos ?? []).map((p: any): Producto => ({
      id: p.id,
      nombre: p.nombre,
      marca: p.marca,
      formato: p.formato ?? '',
      precios: (p.precios ?? []).map((pr: any) => ({
        supermercado: pr.supermercado,
        precio: pr.precio,
        enOferta: pr.enOferta ?? false,
        ultimaActualizacion: new Date(pr.ultimaActualizacion ?? Date.now()),
      })),
    }));
  } catch (err) {
    console.warn('[scraping] Error API:', err);
    // fallback mock simple
    return [
      {
        id: 'mock1',
        nombre: 'Producto Mock',
        marca: 'Marca Mock',
        formato: '1 unidad',
        precios: [{ supermercado: 'MockMarket', precio: 1000, enOferta: false, ultimaActualizacion: new Date() }],
      },
    ];
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Función principal exportada
 */
export async function buscarProductos(query: string): Promise<Producto[]> {
  // Pequeña latencia simulada
  await new Promise((r) => setTimeout(r, 300));

  if (SCRAPING_API_URL) {
    try {
      const apiResults = await buscarEnAPI(query);
      if (apiResults.length > 0) return apiResults;
    } catch (err) {
      console.warn('[scraping] API no disponible:', err);
    }
  }

  // fallback inline (no falla por undefined)
  return [
    {
      id: 'mock2',
      nombre: query,
      marca: '',
      formato: '',
      precios: [{ supermercado: 'MockMarket', precio: 0, enOferta: false, ultimaActualizacion: new Date() }],
    },
  ];
}