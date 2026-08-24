/**
 * Qhay API — Servidor de scraping de precios chilenos Optimizado
 *
 * Todas las rutas van bajo /api (el proyecto raíz en Vercel enruta /api/*
 * a este servidor y sirve el export estático de Expo Web para todo lo
 * demás — ver vercel.json en la raíz). En dev local también aplica:
 * http://localhost:3000/api/buscar, no http://localhost:3000/buscar.
 *
 * Endpoints:
 *   GET /api/buscar?q=leche    → busca en todos los supermercados y combina
 *   GET /api/health            → status del servidor
 *   POST /api/analizar-boleta  → OCR con GPT-4o Vision
 *   POST /api/asistente        → Asistente de cocina con GPT-4o-mini
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
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.options('*', cors());
app.use(express.json({ limit: '20mb' }));

// Todas las rutas cuelgan de /api — ver comentario de cabecera
const router = express.Router();

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
router.get('/health', (req, res) => {
  res.json({ ok: true, version: '1.1.0', ts: new Date().toISOString() });
});

// Strips HTML tags, control chars, and limits length — prevents reflected XSS / prompt injection
function sanitizarQuery(raw) {
  return String(raw)
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\s\-.,()]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 100);
}

router.get('/buscar', async (req, res) => {
  const q = sanitizarQuery(req.query.q ?? '');
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
router.post('/analizar-boleta', async (req, res) => {
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
{"items":[{"nombre":"Leche Colun 1L","cantidad":2,"unidad":"unidad","precioUnitario":1290,"categoria":"lacteos"}]}

Reglas:
- nombre: nombre limpio (sin códigos de barra)
- cantidad: unidades compradas (entero)
- unidad: "unidad","kg","g","L","ml","paquete" o "lata"
- precioUnitario: precio en CLP (entero)
- Solo alimentos y productos del hogar
- Omite filas con precio 0 o ilegibles
- categoria: asigna UNA de estas 13 categorías exactas según el tipo de producto:
  "frutas_verduras" → frutas, verduras, vegetales frescos
  "lacteos" → leche, yogur, mantequilla, huevos, helados, congelados
  "quesos_fiambres" → quesos, jamón, cecinas, fiambres
  "despensa" → arroz, pasta, harina, aceite, conservas, salsas, condimentos, cereales
  "carnes_pescados" → carne, pollo, cerdo, mariscos, pescado
  "panaderia" → pan, marraqueta, hallulla, pasteles, tortas, empanadas
  "bebidas" → agua, jugos, bebidas, cervezas, vinos, licores
  "snacks" → chocolates, galletas, papas fritas, dulces, snacks
  "limpieza" → detergente, cloro, limpiador, esponja, papel higiénico, servilletas
  "cuidado_personal" → shampoo, jabón, pasta de dientes, desodorante, pañales, cosméticos
  "mascotas" → alimento para mascotas, accesorios para animales
  "hogar" → utensilios, electrodomésticos pequeños, juguetes, artículos de librería
  "farmacia" → medicamentos, vitaminas, suplementos, artículos de salud`,
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

// Trunca strings de entrada del asistente para no dejar el costo de la
// llamada a OpenAI a merced del tamaño del payload que mande el cliente.
function limitarTexto(str, max) {
  return String(str ?? '').trim().slice(0, max);
}

// Endpoint del asistente de cocina IA (antes se llamaba a OpenAI directo
// desde el cliente con EXPO_PUBLIC_OPENAI_API_KEY — inseguro en web, donde
// el bundle es inspeccionable. Ahora la key vive solo server-side.)
/**
 * POST /asistente
 * Body: { pregunta: string, contexto: { despensa, recetaActual?, pasoActual?, restricciones } }
 * Retorna: { respuesta: string }
 */
router.post('/asistente', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Asistente no configurado en el servidor' });

  const pregunta = limitarTexto(req.body?.pregunta, 500);
  if (!pregunta) return res.status(400).json({ error: 'Falta el campo pregunta' });

  const contexto = req.body?.contexto ?? {};
  const despensa = Array.isArray(contexto.despensa) ? contexto.despensa.slice(0, 50) : [];
  const restricciones = Array.isArray(contexto.restricciones) ? contexto.restricciones.slice(0, 20) : [];
  const recetaActual = contexto.recetaActual;
  const pasoActual = contexto.pasoActual;

  const ingredientesTexto = despensa
    .map((i) => `${limitarTexto(i?.nombre, 60)} (${limitarTexto(i?.cantidad, 10)} ${limitarTexto(i?.unidad, 20)})`)
    .join(', ');

  const sistemaMensaje = `Eres el asistente de cocina de Qhay. Responde en español de forma concisa y amigable.
Ayudas a cocinar con lo que el usuario tiene en su despensa.
${restricciones.length > 0 ? `Restricciones alimentarias del usuario: ${restricciones.map((r) => limitarTexto(r, 40)).join(', ')}.` : ''}`;

  const usuarioMensaje = `Despensa actual: ${ingredientesTexto}
${recetaActual?.nombre ? `Receta que estoy haciendo: ${limitarTexto(recetaActual.nombre, 100)}, paso ${pasoActual ?? 1}` : ''}
Pregunta: ${pregunta}`;

  try {
    const respuesta = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: sistemaMensaje },
          { role: 'user', content: usuarioMensaje },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!respuesta.ok) {
      const err = await respuesta.text();
      console.error('[asistente] OpenAI error:', err);
      return res.status(502).json({ error: `Error OpenAI: ${respuesta.status}` });
    }

    const data = await respuesta.json();
    const texto = data.choices?.[0]?.message?.content ?? 'No pude responder en este momento.';
    return res.json({ respuesta: texto });
  } catch (err) {
    console.error('[asistente] Error:', err);
    return res.status(500).json({ error: 'Error interno al consultar el asistente' });
  }
});

app.use('/api', router);

app.listen(PORT, () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🛒 Qhay API escuchando en http://localhost:${PORT}`);
    console.log(`  GET  /api/buscar?q=leche`);
    console.log(`  POST /api/analizar-boleta`);
    console.log(`  POST /api/asistente`);
    console.log(`  GET  /api/health`);
  }
});
