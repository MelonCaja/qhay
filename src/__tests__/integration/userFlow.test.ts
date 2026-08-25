/**
 * SUITE REALEZA — Simulación secuencial de usuario real sobre los servicios
 * Supabase. El cliente (config/supabase) se mockea completo: query builder
 * encadenable + thenable (como PostgREST) y RPCs con respuestas controladas.
 */
import type { ProductScrapedRow, ShoppingListItemRow } from '../../types/supabase';
import type { Ingrediente } from '../../types/ingrediente';
import type { IngredienteReceta } from '../../types/receta';
import type { ItemLista } from '../../types/producto';
import type { ItemBoleta } from '../../services/boleta';

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
    },
  },
}));

import { supabase } from '../../config/supabase';
import { registrarUsuario } from '../../services/auth';
import { completarOnboarding, actualizarUsuario } from '../../services/profileService';
import { agregarItem, calcularDescuentos, aplicarDescuentos } from '../../services/pantryService';
import { buscarIndexado, indiceFresco, aProducto } from '../../services/productService';
import { agregarItemLista, obtenerLista, actualizarItemLista } from '../../services/listaService';
import {
  registrarEscaneoBoleta, puedeEscanearBoleta, escaneosRestantes, LIMITE_ESCANEOS_FREE,
} from '../../services/userService';
import { mapearItemsAProductos } from '../../services/ocrService';

const mockFrom = supabase.from as jest.Mock;
const mockRpc = supabase.rpc as jest.Mock;
const mockSignUp = supabase.auth.signUp as jest.Mock;

/** Query builder encadenable + thenable, como el de supabase-js/PostgREST */
function mockQuery(resultado: { data?: unknown; error?: unknown } = {}) {
  const b: Record<string, jest.Mock> & { then?: unknown } = {} as never;
  const metodos = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'order', 'limit', 'textSearch', 'maybeSingle', 'single',
  ];
  for (const m of metodos) b[m] = jest.fn().mockReturnValue(b);
  (b as { then: unknown }).then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null, ...resultado }).then(res, rej);
  return b;
}

const AHORA_ISO = new Date().toISOString();
const MES_ACTUAL = AHORA_ISO.slice(0, 7); // 'YYYY-MM'

beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// TEST 1 — Flujo Auth + Perfil Completo
// ═══════════════════════════════════════════════════════════════════════════
describe('TEST 1: registro → onboarding → perfil BAES', () => {
  it('registra con metadata para el trigger y exige confirmación de correo', async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: 'uid-1', identities: [{ id: 'ident-1' }] }, session: null },
      error: null,
    });

    const r = await registrarUsuario('ana@qhay.cl', 'secreta1', 'Ana');

    expect(r.requiereConfirmacion).toBe(true); // sin session → confirmar correo
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'ana@qhay.cl',
      password: 'secreta1',
      options: { data: { name: 'Ana', terms_version: expect.any(String) } },
    });
  });

  it('NO infiere duplicado de identities vacías sin error (regresión 2026-08-25)', async () => {
    // signUp() puede devolver identities=[] sin error también para un
    // registro genuinamente nuevo (@supabase/auth-js solo garantiza el
    // objeto ofuscado cuando Confirm email Y Confirm phone están ambos
    // habilitados — ver GoTrueClient.ts). Adivinar "duplicado" desde esto
    // causó un incidente real: falsos positivos con correos nuevos sobre
    // una base de datos vacía. El único duplicado confiable es el que
    // Supabase reporta como error explícito (ver test siguiente).
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: 'uid-x', identities: [] }, session: null },
      error: null,
    });

    await expect(registrarUsuario('nueva@qhay.cl', 'otra', 'Ana'))
      .resolves.toMatchObject({ requiereConfirmacion: true });
  });

  it('propaga el error real de Supabase para un correo genuinamente duplicado', async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: Object.assign(new Error('User already registered'), {
        name: 'AuthApiError',
        status: 422,
        code: 'user_already_exists',
      }),
    });

    await expect(registrarUsuario('ana@qhay.cl', 'otra', 'Ana'))
      .rejects.toMatchObject({ code: 'user_already_exists' });
  });

  it('onboarding mapea dominio → columnas y marca onboarding_completed', async () => {
    const q = mockQuery();
    mockFrom.mockReturnValueOnce(q);

    await completarOnboarding('uid-1', {
      esEstudiante: true,
      gustos: ['chileno', 'economico'],
      presupuestoSemanal: 30000,
      utensilios: ['olla', 'microondas'],
      restriccionesAlimentarias: ['sin-lactosa'],
      tiempoCocina: 20,
    });

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(q.update).toHaveBeenCalledWith({
      is_student: true,
      tastes: ['chileno', 'economico'],
      weekly_budget: 30000,
      kitchen_utensils: ['olla', 'microondas'],
      dietary_restrictions: ['sin-lactosa'],
      cooking_time_minutes: 20,
      onboarding_completed: true,
    });
    expect(q.eq).toHaveBeenCalledWith('id', 'uid-1');
  });

  it('actualizarUsuario impacta presupuesto, restricciones y campos BAES', async () => {
    const q = mockQuery();
    mockFrom.mockReturnValueOnce(q);

    await actualizarUsuario('uid-1', {
      presupuestoSemanal: 50000,
      restriccionesAlimentarias: ['vegetariano'],
      baes: { activo: true, montoDiario: 32000, institucion: 'USACH' },
    });

    expect(q.update).toHaveBeenCalledWith({
      weekly_budget: 50000,
      dietary_restrictions: ['vegetariano'],
      baes_active: true,
      baes_daily_amount: 32000,
      baes_institution: 'USACH',
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TEST 2 — Flujo Despensa + Descuento RPC
// ═══════════════════════════════════════════════════════════════════════════
describe('TEST 2: despensa → receta realizada → RPC descontar_receta', () => {
  const despensa: Ingrediente[] = [
    { id: 'pan-1', nombre: 'Arroz', cantidad: 2, unidad: 'kg', agregadoPor: 'manual' },
    { id: 'pan-2', nombre: 'Huevos', cantidad: 6, unidad: 'unidad', agregadoPor: 'manual' },
  ];

  it('agrega un ingrediente con el mapeo dominio → pantries', async () => {
    const q = mockQuery({ data: { id: 'pan-1' } });
    mockFrom.mockReturnValueOnce(q);

    const id = await agregarItem('uid-1', {
      nombre: 'Arroz', cantidad: 2, unidad: 'kg', agregadoPor: 'manual',
    });

    expect(id).toBe('pan-1');
    expect(mockFrom).toHaveBeenCalledWith('pantries');
    expect(q.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'uid-1',
      product_name: 'Arroz',
      quantity: 2,
      unit: 'kg',
      added_by: 'manual',
      expires_at: null,
    }));
  });

  it('calcula descuentos: agotado → delete, parcial → update', () => {
    const receta: IngredienteReceta[] = [
      { nombre: 'arroz', cantidad: 2, unidad: 'kg' },     // misma unidad → -2 (queda 0)
      { nombre: 'huevo', cantidad: 2, unidad: 'unidad' }, // match por inclusión → -2 (quedan 4)
    ];

    const descuentos = calcularDescuentos(receta, despensa);

    expect(descuentos).toEqual([
      { itemId: 'pan-1', nombre: 'Arroz', cantidadUsada: 2, cantidadRestante: 0 },
      { itemId: 'pan-2', nombre: 'Huevos', cantidadUsada: 2, cantidadRestante: 4 },
    ]);
  });

  it('aplica los descuentos en 1 RPC atómica y el estado local converge', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });
    const descuentos = calcularDescuentos(
      [{ nombre: 'arroz', cantidad: 2, unidad: 'kg' }, { nombre: 'huevo', cantidad: 2, unidad: 'unidad' }],
      despensa
    );

    await aplicarDescuentos(descuentos);

    expect(mockRpc).toHaveBeenCalledWith('descontar_receta', {
      descuentos: [
        { item_id: 'pan-1', cantidad_restante: 0 },
        { item_id: 'pan-2', cantidad_restante: 4 },
      ],
    });

    // Sincronización local (misma regla que useDespensa.descontarReceta)
    let estado = [...despensa];
    for (const d of descuentos) {
      estado = d.cantidadRestante <= 0
        ? estado.filter((i) => i.id !== d.itemId)
        : estado.map((i) => (i.id === d.itemId ? { ...i, cantidad: d.cantidadRestante } : i));
    }
    expect(estado).toHaveLength(1);
    expect(estado[0]).toMatchObject({ id: 'pan-2', cantidad: 4 }); // Arroz eliminado
  });

  it('con 0 descuentos no toca la red', async () => {
    await aplicarDescuentos([]);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TEST 3 — Buscador FTS + Lista Legacy (store_name generic + all_prices)
// ═══════════════════════════════════════════════════════════════════════════
describe('TEST 3: FTS → agregar a lista → contratos ItemLista', () => {
  const filasFts: ProductScrapedRow[] = [
    {
      id: 'r1', supermarket: 'jumbo', brand: 'Tucapel', product_name: 'Arroz Grado 2',
      format: '1 kg', price: 1890, image_url: 'https://img/arroz.jpg', category: 'abarrotes',
      list_price: 2190, on_sale: true, certainty: true, updated_at: AHORA_ISO,
    },
    {
      id: 'r2', supermarket: 'lider', brand: 'Tucapel', product_name: 'Arroz Grado 2',
      format: '1 kg', price: 1790, image_url: null, category: 'abarrotes',
      list_price: null, on_sale: false, certainty: true, updated_at: AHORA_ISO,
    },
  ];

  it('busca por tsquery de prefijos y agrupa filas por producto', async () => {
    const q = mockQuery({ data: filasFts });
    mockFrom.mockReturnValueOnce(q);

    const resultados = await buscarIndexado('arroz tucapel');

    expect(q.textSearch).toHaveBeenCalledWith('fts', 'arroz:* & tucapel:*', { config: 'spanish' });
    expect(resultados).toHaveLength(1); // 2 filas → 1 producto agrupado
    expect(resultados[0].precios).toHaveLength(2);
    expect(resultados[0].precioMin).toBe(1790);
    expect(resultados[0].imageUrl).toBe('https://img/arroz.jpg'); // primera no nula
    expect(indiceFresco(resultados)).toBe(true);
  });

  it('agrega a la lista con supermercado elegido y all_prices jsonb', async () => {
    const qFts = mockQuery({ data: filasFts });
    mockFrom.mockReturnValueOnce(qFts);
    const producto = aProducto((await buscarIndexado('arroz'))[0]);

    // get-or-create de la lista (select) + insert del item
    mockFrom.mockReturnValueOnce(mockQuery({ data: { id: 'lista-1' } }));
    const qItem = mockQuery({ data: { id: 'item-1' } });
    mockFrom.mockReturnValueOnce(qItem);

    const itemData: Omit<ItemLista, 'id'> = {
      productoId: producto.id,
      nombre: producto.nombre,
      marca: producto.marca,
      cantidad: 1,
      unidad: producto.formato,
      precioEstimado: 1790,
      supermercado: 'lider',
      todosLosPrecios: producto.precios,
      completado: false,
    };
    const nuevoId = await agregarItemLista('uid-lista', itemData);

    expect(nuevoId).toBe('item-1');
    expect(qItem.insert).toHaveBeenCalledWith(expect.objectContaining({
      list_id: 'lista-1',
      product_name: 'Arroz Grado 2',
      brand: 'Tucapel',
      price: 1790,
      store_name: 'lider',
      all_prices: producto.precios, // comparador multi-súper persistido
      product_ref: producto.id,
    }));
  });

  it('sin supermercado el item cae al sentinel store_name generic', async () => {
    // El listId de 'uid-lista' ya está cacheado: solo ocurre el insert
    const qItem = mockQuery({ data: { id: 'item-2' } });
    mockFrom.mockReturnValueOnce(qItem);

    await agregarItemLista('uid-lista', {
      nombre: 'pan', cantidad: 1, unidad: 'unidad', completado: false,
    });

    expect(qItem.insert).toHaveBeenCalledWith(
      expect.objectContaining({ store_name: 'generic' })
    );
  });

  it('obtenerLista restaura el contrato ItemLista (fechas jsonb revividas) y el toggle optimista mapea a is_checked', async () => {
    const filaItem: ShoppingListItemRow = {
      id: 'item-1', list_id: 'lista-1', product_name: 'Arroz Grado 2', quantity: 1,
      is_checked: false, store_name: 'lider', brand: 'Tucapel', price: 1790,
      unit: '1 kg', category: null, product_ref: 'arroz-grado-2_tucapel_1-kg',
      all_prices: JSON.parse(JSON.stringify([
        { supermercado: 'jumbo', precio: 1890, enOferta: true, ultimaActualizacion: AHORA_ISO },
        { supermercado: 'lider', precio: 1790, enOferta: false, ultimaActualizacion: AHORA_ISO },
      ])),
      created_at: AHORA_ISO,
    };
    mockFrom.mockReturnValueOnce(mockQuery({ data: [filaItem] })); // listId cacheado

    const lista = await obtenerLista('uid-lista');

    expect(lista[0]).toMatchObject({
      id: 'item-1',
      nombre: 'Arroz Grado 2',
      marca: 'Tucapel',
      unidad: '1 kg',
      precioEstimado: 1790,
      supermercado: 'lider',
      completado: false,
    });
    expect(lista[0].todosLosPrecios).toHaveLength(2);
    expect(lista[0].todosLosPrecios![0].ultimaActualizacion).toBeInstanceOf(Date);

    // UI optimista: marcar comprado → update puntual is_checked
    const qUpd = mockQuery();
    mockFrom.mockReturnValueOnce(qUpd);
    await actualizarItemLista('uid-lista', 'item-1', { completado: true });
    expect(qUpd.update).toHaveBeenCalledWith({ is_checked: true });
    expect(qUpd.eq).toHaveBeenCalledWith('id', 'item-1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TEST 4 — Pipeline OCR + RPC registrar_escaneo
// ═══════════════════════════════════════════════════════════════════════════
describe('TEST 4: boleta OCR → enriquecimiento FTS → cuota Free → despensa', () => {
  const itemBoleta: ItemBoleta = { nombre: 'Leche Colun', cantidad: 2, unidad: 'unidad' };

  const filaLeche: ProductScrapedRow = {
    id: 'r-leche', supermarket: 'unimarc', brand: '', product_name: 'Leche Colun',
    format: '1 L', price: 1190, image_url: 'https://img/leche.jpg', category: 'lacteos',
    list_price: null, on_sale: false, certainty: true, updated_at: AHORA_ISO,
  };

  it('enriquece el item de boleta contra el catálogo FTS (imagen + precio referencia)', async () => {
    mockFrom.mockReturnValueOnce(mockQuery({ data: [filaLeche] })); // buscarIndexado('leche')

    const [mapeado] = await mapearItemsAProductos([itemBoleta]);

    expect(mapeado.productoScrapedId).toBeDefined();
    expect(mapeado.imageUrl).toBe('https://img/leche.jpg');
    expect(mapeado.precioUnitario).toBe(1190); // boleta sin precio → precioMin del catálogo
    expect(mapeado.confianzaMatch).toBe(1);    // match exacto
  });

  it('registra el escaneo vía RPC y permite el flujo (plan Free con cuota)', async () => {
    const usuarioFree = {
      id: 'uid-1',
      plan: 'gratuito' as const,
      limites: { escaneosBoletaMes: 3, mesReferencia: MES_ACTUAL, recetasCacheadas: 0 },
    };
    expect(puedeEscanearBoleta(usuarioFree)).toBe(true);
    expect(escaneosRestantes(usuarioFree)).toBe(1);

    mockRpc.mockResolvedValueOnce({ data: true, error: null });
    await expect(registrarEscaneoBoleta(usuarioFree)).resolves.toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('registrar_escaneo', { limite: LIMITE_ESCANEOS_FREE });

    // Inyección directa en pantries con origen 'boleta'
    const qPantry = mockQuery({ data: { id: 'pan-9' } });
    mockFrom.mockReturnValueOnce(qPantry);
    await agregarItem('uid-1', {
      nombre: itemBoleta.nombre,
      cantidad: itemBoleta.cantidad,
      unidad: itemBoleta.unidad,
      precioUnitario: 1190,
      imageUrl: 'https://img/leche.jpg',
      categoria: 'lacteos',
      agregadoPor: 'boleta',
    });
    expect(qPantry.insert).toHaveBeenCalledWith(expect.objectContaining({
      product_name: 'Leche Colun',
      added_by: 'boleta',
      unit_price: 1190,
      category: 'lacteos',
      image_url: 'https://img/leche.jpg',
    }));
  });

  it('bloquea al plan Free con cuota agotada (cliente y servidor)', async () => {
    const freeAgotado = {
      id: 'uid-1',
      plan: 'gratuito' as const,
      limites: { escaneosBoletaMes: LIMITE_ESCANEOS_FREE, mesReferencia: MES_ACTUAL, recetasCacheadas: 0 },
    };
    // Chequeo optimista en cliente
    expect(puedeEscanearBoleta(freeAgotado)).toBe(false);
    expect(escaneosRestantes(freeAgotado)).toBe(0);

    // Re-validación server-side: la RPC devuelve false y NO registra
    mockRpc.mockResolvedValueOnce({ data: false, error: null });
    await expect(registrarEscaneoBoleta(freeAgotado)).resolves.toBe(false);
  });

  it('premium sin límites y mes nuevo resetea la cuota en cliente', () => {
    const premium = { id: 'uid-2', plan: 'premium' as const };
    expect(puedeEscanearBoleta(premium)).toBe(true);
    expect(escaneosRestantes(premium)).toBe(Infinity);

    const mesViejo = {
      id: 'uid-1',
      plan: 'gratuito' as const,
      limites: { escaneosBoletaMes: 4, mesReferencia: '2026-06', recetasCacheadas: 0 },
    };
    expect(puedeEscanearBoleta(mesViejo)).toBe(true);
    expect(escaneosRestantes(mesViejo)).toBe(LIMITE_ESCANEOS_FREE);
  });
});
