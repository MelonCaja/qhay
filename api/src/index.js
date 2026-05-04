/**
 * Qhay API — Servidor de scraping de precios chilenos Optimizado
 *
 * Endpoints:
 *   GET /buscar?q=leche        → busca en todos los supermercados y combina
 *   GET /health                → status del servidor
 *   POST /analizar-boleta      → OCR con GPT-4o Vision
 */

const express = require('express');
const cors = require('cors');
const { buscarEnJumbo } = require('./scrapers/jumbo');
const { buscarEnLider } = require('./scrapers/lider');
const { buscarEnSantaIsabel } = require('./scrapers/santaisabel');
const { buscarEnUnimarc } = require('./scrapers/unimarc');
const { buscarEnM10 } = require('./scrapers/m10'); 
const { buscarEnAlvi } = require('./scrapers/alvi'); 

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' })); // boletas en base64 pueden ser grandes
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ==========================================
// 1. SISTEMA DE CACHÉ EN MEMORIA (OPTIMIZACIÓN)
// ==========================================
const cacheBusquedas = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutos en milisegundos

// ==========================================
// 2. FUNCIONES HELPER
// ==========================================
// Normaliza texto removiendo acentos, números, puntuación y ordena palabras
// para que "Leche Entera Colun 1L" y "Colun Leche Entera" coincidan
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
        // Agregar precio a producto existente (evitar duplicar el mismo supermercado)
        const existente = mapa.get(clave);
        const supsMapa = new Set(existente.precios.map((p) => p.supermercado));
        
        // Conservar la imagen si el nuevo producto la trae y el existente no
        if (!existente.imageUrl && prod.imageUrl) {
            existente.imageUrl = prod.imageUrl;
        }

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

// ==========================================
// 3. ENDPOINTS API
// ==========================================

// Endpoint de Salud del Servidor
app.get('/health', (req, res) => {
  res.json({ ok: true, version: '1.1.0', ts: new Date().toISOString() });
});

// Endpoint de Búsqueda de Productos con Scraping
app.get('/buscar', async (req, res) => {
  const q = (req.query.q ?? '').trim();
  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Parámetro q requerido (mínimo 2 caracteres)' });
  }

  const queryNormalizada = q.toLowerCase();

  // Revisar Caché primero
  if (cacheBusquedas.has(queryNormalizada)) {
    const cachedData = cacheBusquedas.get(queryNormalizada);
    if (Date.now() - cachedData.timestamp < CACHE_TTL) {
      console.log(`[Cache Hit] Devolviendo datos guardados para: ${queryNormalizada}`);
      return res.json(cachedData.data);
    } else {
      cacheBusquedas.delete(queryNormalizada); // Eliminar si expiró
    }
  }

  // Ejecutar todos los scrapers en paralelo. El .catch(() => []) evita que
  // un supermercado caído (como Lider) rompa toda la búsqueda.
  const resultados = await Promise.allSettled([
    buscarEnJumbo(q).catch((e) => { console.warn('[Jumbo Error]', e.message); return []; }),
    buscarEnSantaIsabel(q).catch((e) => { console.warn('[Santa Isabel Error]', e.message); return []; }),
    buscarEnUnimarc(q).catch((e) => { console.warn('[Unimarc Error]', e.message); return []; }),
    buscarEnM10(q).catch((e) => { console.warn('[M10 Error]', e.message); return []; }),
    buscarEnAlvi(q).catch((e) => { console.warn('[Alvi Error]', e.message); return []; }),
    buscarEnLider(q).catch((e) => { console.warn('[Lider Error]', e.message); return []; })
  ]);

  const exitosos = resultados
    .filter((r) => r.status === 'fulfilled' && r.value.length > 0)
    .map((r) => r.value);

  const fallidos = resultados
    .filter((r) => r.status === 'rejected')
    .map((r) => r.reason?.message);

  const productos = combinarResultados(exitosos);

  const responseData = {
    query: q,
    total: productos.length,
    scrapers: {
      ejecutados: 6,
      error: fallidos.length,
      errores: fallidos,
    },
    productos,
  };

  // Guardar en Caché la respuesta exitosa
  cacheBusquedas.set(queryNormalizada, {
    timestamp: Date.now(),
    data: responseData
  });

  res.json(responseData);
});

// Endpoint de OCR para Boletas usando OpenAI
/**
 * POST /analizar-boleta
 * Body: { imagen: "<base64 jpeg>" }
 * Llama a GPT-4o Vision server-side (OPENAI_API_KEY en env de Vercel)
 * Retorna: { items: [{ nombre, cantidad, unidad, precioUnitario }] }
 */
app.post('/analizar-boleta', async (req, res) => {
  const { imagen } = req.body;
  if (!imagen) return res.status(400).json({ error: 'Falta el campo imagen (base64)' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'API de visión no configurada en el servidor' });

  try {
    const respuesta = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imagen}`, detail: 'high' },
            },
            {
              type: 'text',
              text: `Esta es una boleta de supermercado chileno. Extrae TODOS los productos.
Responde SOLO con JSON válido, sin texto adicional:
{"items":[{"nombre":"Leche Colun 1L","cantidad":2,"unidad":"unidad","precioUnitario":1290}]}

Reglas:
- nombre: nombre limpio (sin códigos de barra)
- cantidad: unidades compradas (entero)
- unidad: "unidad","kg","g","L","ml","paquete" o "lata"
- precioUnitario: precio en CLP (entero)
- Solo alimentos y productos del hogar
- Omite filas con precio 0 o ilegibles`,
            },
          ],
        }],
        max_tokens: 2000,
      }),
    });

    if (!respuesta.ok) {
      const err = await respuesta.text();
      console.error('[analizar-boleta] OpenAI error:', err);
      return res.status(502).json({ error: `Error OpenAI: ${respuesta.status}` });
    }

    const data = await respuesta.json();
    const texto = data.choices?.[0]?.message?.content ?? '{"items":[]}';
    const match = texto.match(/\{[\s\S]*\}/);
    if (!match) return res.json({ items: [] });

    const parsed = JSON.parse(match[0]);
    return res.json({ items: Array.isArray(parsed.items) ? parsed.items : [] });
  } catch (err) {
    console.error('[analizar-boleta] Error:', err);
    return res.status(500).json({ error: 'Error interno al analizar la boleta' });
  }
});

app.listen(PORT, () => {
  console.log(`🛒 Qhay API escuchando en http://localhost:${PORT}`);
  console.log(`  GET  /buscar?q=leche`);
  console.log(`  POST /analizar-boleta`);
  console.log(`  GET  /health`);
  console.log(`  Scrapers Activos: Jumbo, Santa Isabel, Unimarc, Lider, M10, Alvi`);
});