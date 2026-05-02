import { Config } from '../constants/config';

export type CategoriaId =
  | 'frutas_verduras'
  | 'lacteos'
  | 'quesos_fiambres'
  | 'despensa'
  | 'carnes_pescados'
  | 'panaderia'
  | 'bebidas'
  | 'snacks'
  | 'limpieza'
  | 'cuidado_personal'
  | 'mascotas'
  | 'hogar'
  | 'farmacia';

export interface ItemBoleta {
  nombre: string;
  cantidad: number;
  unidad: string;
  precioUnitario?: number;
  categoria?: CategoriaId;
}

/**
 * Analiza una foto de boleta con GPT-4o Vision usando la key del .env.
 */
export async function escanearBoleta(base64Image: string): Promise<ItemBoleta[]> {
  if (!Config.openaiApiKey) throw new Error('API key no configurada. Agrega EXPO_PUBLIC_OPENAI_API_KEY en el .env');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Config.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'high' },
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

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `Error OpenAI: ${res.status}`);
  }

  const data = await res.json();
  const texto: string = data.choices?.[0]?.message?.content ?? '{"items":[]}';
  const match = texto.match(/\{[\s\S]*\}/);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

/**
 * Busca un producto por código de barras en Open Food Facts (gratis, sin API key).
 * Retorna null si no se encuentra.
 */
export async function buscarPorCodigoBarras(codigo: string): Promise<ItemBoleta | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${codigo}.json?fields=product_name,product_name_es,brands,quantity,categories_tags`,
    { headers: { 'User-Agent': 'QhayApp/1.0' } }
  );

  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;

  const p = data.product;
  const nombre = (p.product_name_es || p.product_name || '').trim();
  if (!nombre) return null;

  // Detectar unidad desde quantity ("500 g", "1 L", "6 x 350 ml", etc.)
  const { cantidad, unidad } = parsearCantidad(p.quantity ?? '');

  return {
    nombre: p.brands ? `${nombre} ${p.brands.split(',')[0].trim()}` : nombre,
    cantidad,
    unidad,
  };
}

function parsearCantidad(quantity: string): { cantidad: number; unidad: string } {
  const q = quantity.toLowerCase().trim();
  // "6 x 350 ml" → cantidad 6, unidad "unidad"
  const multi = q.match(/^(\d+)\s*x/);
  if (multi) return { cantidad: parseInt(multi[1]), unidad: 'unidad' };
  // "500 g", "1.5 L", etc.
  const simple = q.match(/([\d.,]+)\s*(kg|g|l|ml|lt)/i);
  if (simple) {
    const map: Record<string, string> = { kg: 'kg', g: 'g', l: 'L', lt: 'L', ml: 'ml' };
    return { cantidad: 1, unidad: map[simple[2].toLowerCase()] ?? 'unidad' };
  }
  return { cantidad: 1, unidad: 'unidad' };
}
