/**
 * Helper compartido para scrapers VTEX (Jumbo, Santa Isabel, Unimarc, Lider)
 * Los precios están en item.items[0].sellers[0].commertialOffer, NO en el nivel de producto
 */
const fetch = require('node-fetch');

function extraerFormato(nombre, desc) {
  const texto = `${nombre} ${desc ?? ''}`;
  const m = texto.match(/\d+\s*(kg|g|ml|L|lt|cc|un|unidades?)/i);
  return m ? m[0].trim() : '';
}

function extraerPrecio(item) {
  const sku = item.items?.[0];
  const seller = sku?.sellers?.[0];
  const oferta = seller?.commertialOffer;
  if (!oferta || !oferta.Price || oferta.Price === 0) return null;
  return {
    precio: Math.round(oferta.Price),
    precioLista: Math.round(oferta.ListPrice || oferta.Price),
    enOferta: oferta.ListPrice > oferta.Price && oferta.Price > 0,
  };
}

async function buscarVTEX(account, supermercado, query) {
  const url = `https://${account}.vtexcommercestable.com.br/api/catalog_system/pub/products/search?ft=${encodeURIComponent(query)}&_from=0&_to=9`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; QhayBot/1.0)',
    },
    timeout: 10000,
  });
  if (!res.ok) throw new Error(`${supermercado} API error: ${res.status}`);
  const data = await res.json();

  return data.map((item) => {
    const precio = extraerPrecio(item);
    if (!precio) return null;
    return {
      id: `${account}_${item.productId}`,
      nombre: item.productName ?? query,
      marca: item.brand ?? supermercado,
      formato: extraerFormato(item.productName, item.description),
      precios: [{ supermercado, ...precio, ultimaActualizacion: new Date().toISOString() }],
    };
  }).filter(Boolean);
}

module.exports = { buscarVTEX };
