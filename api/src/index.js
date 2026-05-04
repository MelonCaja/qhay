/**
 * Qhay API — Servidor de scraping de precios chilenos Optimizado
 */
const express = require('express');
const cors = require('cors');
const { buscarEnJumbo } = require('./scrapers/jumbo');
const { buscarEnLider } = require('./scrapers/lider');
const { buscarEnSantaIsabel } = require('./scrapers/santaisabel');
const { buscarEnUnimarc } = require('./scrapers/unimarc');
const { buscarEnM10 } = require('./scrapers/m10'); // Nuevo Mayorista
const { buscarEnAlvi } = require('./scrapers/alvi'); // Nuevo Mayorista

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const PORT = process.env.PORT || 3000;

// Sistema de Caché en Memoria (Evita ataques y peticiones repetidas)
const cacheBusquedas = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutos en milisegundos

function normalizarClave(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/).filter(Boolean).sort().join(' ')
    .trim();
}

function combinarResultados(arrays) {
  const mapa = new Map();

  for (const productos of arrays) {
    for (const prod of productos) {
      const clave = `${normalizarClave(prod.nombre)}_${normalizarClave(prod.marca)}`;
      if (mapa.has(clave)) {
        const existente = mapa.get(clave);
        const supsMapa = new Set(existente.precios.map((p) => p.supermercado));
        
        // Mantener la primera imagen si existe
        if (!existente.imageUrl && prod.imageUrl) existente.imageUrl = prod.imageUrl;

        for (const p of prod.precios) {
          if (!supsMapa.has(p.supermercado)) {
            existente.precios.push(p);
            supsMapa.add(p.supermercado);
          }
        }
      } else {
        mapa.set(clave, { ...prod, precios: [...prod.precios] });
      }
    }
  }

  return Array.from(mapa.values())
    .sort((a, b) => {
      const minA = Math.min(...a.precios.map((p) => p.precio));
      const minB = Math.min(...b.precios.map((p) => p.precio));
      return minA - minB;
    });
}

app.get('/buscar', async (req, res) => {
  const q = (req.query.q ?? '').trim().toLowerCase();
  
  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Parámetro q requerido (mínimo 2 caracteres)' });
  }

  // 1. Revisar Caché primero (Mejora de Rendimiento Crítica)
  if (cacheBusquedas.has(q)) {
    const cachedData = cacheBusquedas.get(q);
    if (Date.now() - cachedData.timestamp < CACHE_TTL) {
      console.log(`[Cache Hit] Devolviendo datos guardados para: ${q}`);
      return res.json(cachedData.data);
    } else {
      cacheBusquedas.delete(q); // Expirado
    }
  }

  // 2. Ejecutar Scrapers (Los que fallan devuelven array vacío para no romper todo)
  const resultados = await Promise.allSettled([
    buscarEnJumbo(q).catch(e => { console.warn('[Jumbo Error]', e.message); return []; }),
    buscarEnSantaIsabel(q).catch(e => { console.warn('[Santa Isabel Error]', e.message); return []; }),
    buscarEnUnimarc(q).catch(e => { console.warn('[Unimarc Error]', e.message); return []; }),
    buscarEnM10(q).catch(e => { console.warn('[M10 Error]', e.message); return []; }),
    buscarEnAlvi(q).catch(e => { console.warn('[Alvi Error]', e.message); return []; }),
    buscarEnLider(q).catch(e => { console.warn('[Lider Error]', e.message); return []; })
  ]);

  const exitosos = resultados
    .filter((r) => r.status === 'fulfilled' && r.value.length > 0)
    .map((r) => r.value);

  const productos = combinarResultados(exitosos);

  const responseData = {
    query: q,
    total: productos.length,
    productos,
  };

  // 3. Guardar en Caché
  cacheBusquedas.set(q, {
    timestamp: Date.now(),
    data: responseData
  });

  res.json(responseData);
});

// El endpoint /analizar-boleta se mantiene igual...
// (Mantén tu código anterior de OpenAI aquí)

app.listen(PORT, () => {
  console.log(`🛒 Qhay API (Optimizada) escuchando en http://localhost:${PORT}`);
  console.log(`  Scrapers Activos: Jumbo, Santa Isabel, Unimarc, Lider, M10, Alvi`);
});