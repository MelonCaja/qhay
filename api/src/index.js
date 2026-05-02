/**
 * Qhay API — Servidor de scraping de precios chilenos
 *
 * Endpoints:
 *   GET /buscar?q=leche        → busca en todos los supermercados y combina
 *   GET /health                → status del servidor
 *
 * Despliegue: Railway, Render, Fly.io, o VPS propio.
 * Luego actualiza SCRAPING_API_URL en src/services/scraping.ts
 */

const express = require('express');
const cors = require('cors');
const { buscarEnJumbo } = require('./scrapers/jumbo');
const { buscarEnLider } = require('./scrapers/lider');
const { buscarEnSantaIsabel } = require('./scrapers/santaisabel');
const { buscarEnUnimarc } = require('./scrapers/unimarc');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' })); // boletas en base64 pueden ser grandes
app.use(express.json());

const PORT = process.env.PORT || 3000;

/**
 * Combina resultados de múltiples scrapers agrupando por nombre+marca.
 * Si el mismo producto aparece en varios supermercados, se mergean los precios.
 */
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

app.get('/health', (req, res) => {
  res.json({ ok: true, version: '1.0.0', ts: new Date().toISOString() });
});

app.get('/buscar', async (req, res) => {
  const q = (req.query.q ?? '').trim();
  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Parámetro q requerido (mínimo 2 caracteres)' });
  }

  // Ejecutar todos los scrapers en paralelo — los que fallen se ignoran
  const resultados = await Promise.allSettled([
    buscarEnJumbo(q),
    buscarEnLider(q),
    buscarEnSantaIsabel(q),
    buscarEnUnimarc(q),
  ]);

  const exitosos = resultados
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);

  const fallidos = resultados
    .filter((r) => r.status === 'rejected')
    .map((r) => r.reason?.message);

  if (fallidos.length > 0) {
    console.warn(`[buscar] Scrapers con error (${fallidos.length}/4):`, fallidos);
  }

  const productos = combinarResultados(exitosos);

  res.json({
    query: q,
    total: productos.length,
    scrapers: {
      ok: resultados.filter((r) => r.status === 'fulfilled').length,
      error: fallidos.length,
      errores: fallidos,
    },
    productos,
  });
});

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
});
