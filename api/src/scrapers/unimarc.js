/**
 * Scraper Unimarc — reconstruido 2026-08-24 tras confirmar (auditoría previa)
 * que la cuenta VTEX "unimarc" está obsoleta. El sitio real corre sobre un
 * BFF propio de SMU descubierto por inspección de red con Playwright:
 *
 *   POST https://bff-unimarc-ecommerce.unimarc.cl/catalog/product/search
 *
 * El endpoint responde ante peticiones HTTP simples (node-fetch, sin
 * navegador) siempre que la petición llegue con TLS "normal" — un primer
 * intento con `curl` fue bloqueado (403, Access Denied de Akamai) contra
 * este mismo endpoint con headers casi idénticos, mientras que node-fetch
 * pasó sin problema. Los headers `session`/`anonymous` son tokens generados
 * client-side (no cookies de servidor) — no se validan server-side, valores
 * aleatorios funcionan igual que los reales capturados del navegador.
 */
const fetch = require('node-fetch');

const BFF_URL = 'https://bff-unimarc-ecommerce.unimarc.cl/catalog/product/search';

function generarToken(prefijo) {
  return `${prefijo}${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function parsearPrecio(str) {
  if (!str) return null;
  const n = parseInt(String(str).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function buscarEnUnimarc(query) {
  const res = await fetch(BFF_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'Referer': 'https://www.unimarc.cl/',
      'source': 'web',
      'channel': 'UNIMARC',
      'version': '1.0.0',
      'session': generarToken('s'),
      'anonymous': generarToken('a'),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    },
    body: JSON.stringify({
      from: '0',
      orderBy: '',
      searching: query,
      promotionsOnly: false,
      to: '9',
      userTriggered: true,
    }),
    timeout: 10000,
  });

  if (res.status === 403) {
    throw new Error('Unimarc temporalmente no disponible (acceso restringido)');
  }
  if (!res.ok) {
    throw new Error(`Unimarc temporalmente no disponible (${res.status})`);
  }

  const data = await res.json();
  const productos = Array.isArray(data.availableProducts) ? data.availableProducts : [];

  return productos
    .map((p) => {
      const item = p.item;
      if (!item) return null;

      const precio = parsearPrecio(p.price?.price);
      if (!precio) return null;
      const precioLista = parsearPrecio(p.price?.listPrice) ?? precio;

      return {
        id: `unimarc_${item.productId}`,
        nombre: item.name ?? query,
        marca: item.brand ?? 'Unimarc',
        formato: item.netContent || item.netContentLevelSmall || '',
        imageUrl: item.images?.[0] || '',
        precios: [{
          supermercado: 'Unimarc',
          precio,
          precioLista,
          enOferta: Boolean(p.price?.inOffer),
          ultimaActualizacion: new Date().toISOString(),
        }],
      };
    })
    .filter(Boolean);
}

module.exports = { buscarEnUnimarc };
