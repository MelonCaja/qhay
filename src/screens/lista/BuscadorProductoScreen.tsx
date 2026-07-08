import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TextInput, TouchableOpacity, Alert, StatusBar, Modal, Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { agregarItemLista } from '../../services/firestore';
import { useAuthStore } from '../../store/authStore';
import { useListaStore } from '../../store/listaStore';
import { buscarProductos } from '../../services/scraping';
import {
  buscarIndexado, indiceFresco, aProducto, actualizarPreciosBatch,
} from '../../services/productService';
import { Producto, PrecioSupermercado } from '../../types/producto';
import { formatearPrecio } from '../../utils/precioHelper';
import { CATEGORIAS_LISTA } from '../../constants/categorias';
import { useDespensa } from '../../hooks/useDespensa';

// ── Keywords por categoría para el filtrado local ─────────────────────────────
const KEYWORDS: Record<string, string[]> = {
  frutas_verduras:  ['fruta', 'verdura', 'manzana', 'pera', 'naranja', 'limon', 'limón',
                     'lechuga', 'tomate', 'cebolla', 'papa', 'zanahoria', 'uva', 'platano',
                     'plátano', 'brocoli', 'brócoli', 'espinaca', 'pepino', 'ajo', 'palta',
                     'kiwi', 'frutilla', 'durazno', 'sandia', 'sandía', 'melón', 'melon'],
  lacteos:          ['leche', 'yogurt', 'yoghurt', 'crema', 'mantequilla', 'manteca',
                     'nata', 'kefir', 'helado', 'postre lácteo', 'postre lacteo',
                     'huevo', 'congelado'],
  quesos_fiambres:  ['queso', 'jamón', 'jamon', 'salame', 'salami', 'cecina',
                     'fiambre', 'paté', 'pate', 'mortadela', 'longaniza', 'vienesa'],
  despensa:         ['arroz', 'fideo', 'pasta', 'aceite', 'sal ', 'azucar', 'azúcar',
                     'harina', 'lenteja', 'garbanzo', 'poroto', 'atun', 'atún', 'conserva',
                     'salsa', 'vinagre', 'mayonesa', 'ketchup', 'mostaza', 'sopa',
                     'caldo', 'puré', 'pure'],
  carnes_pescados:  ['carne', 'pollo', 'cerdo', 'pavo', 'cordero', 'vacuno', 'filete',
                     'salmón', 'salmon', 'merluza', 'camarón', 'camaron', 'mariscos',
                     'churrasco', 'costillas', 'asado', 'prieta', 'chorizo'],
  panaderia:        ['pan', 'marraqueta', 'hallulla', 'tostada', 'baguette', 'muffin',
                     'queque', 'torta', 'croissant', 'galleta', 'bizcocho', 'masa'],
  bebidas:          ['bebida', 'agua ', 'jugo', 'néctar', 'nectar', 'gaseosa', 'cerveza',
                     'vino', 'pisco', 'ron', 'whisky', 'vodka', 'té', ' te ', 'café',
                     'cafe', 'leche vegetal', 'isotónico', 'isotonica', 'energética'],
  snacks:           ['snack', 'papas fritas', 'chocolate', 'oblea', 'dulce', 'caramelo',
                     'chicle', 'maní', 'mani', 'almendra', 'nuez', 'cereal', 'granola',
                     'barra', 'gomitas'],
  limpieza:         ['detergente', 'limpieza', 'cloro', 'limpiapisos', 'jabón loza',
                     'desinfectante', 'multiuso', 'esponja', 'suavizante', 'lavandina',
                     'quitamanchas'],
  cuidado_personal: ['shampoo', 'champú', 'champu', 'acondicionador', 'gel', 'pasta dental',
                     'cepillo dental', 'desodorante', 'loción', 'crema corporal',
                     'protector solar', 'pañal', 'toalla femenina', 'afeitadora', 'jabón'],
  mascotas:         ['perro', 'gato', 'mascota', 'alimento para', 'purina', 'whiskas',
                     'pedigree', 'arena gato', 'correa'],
  hogar:            ['papel higiénico', 'papel higienico', 'toalla nova', 'servilleta',
                     'bolsa basura', 'bolsa de basura', 'foco', 'pila', 'cubierto',
                     'plástico', 'plastico', 'aluminio', 'film'],
  farmacia:         ['vitamina', 'suplemento', 'proteína', 'proteina', 'omega',
                     'colágeno', 'colageno', 'probiótico', 'probiotico'],
};

function matchesFiltro(producto: Producto, filtro: string): boolean {
  const kws = KEYWORDS[filtro];
  if (!kws) return true;
  const texto = `${producto.nombre} ${producto.marca ?? ''} ${producto.formato ?? ''}`.toLowerCase();
  return kws.some((kw) => texto.includes(kw.toLowerCase()));
}

// ─────────────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<RootStackParamList, 'BuscadorProducto'>;

export function BuscadorProductoScreen({ route }: Props) {
  const C = useColors();
  const s = makeStyles(C);
  const navigation = useNavigation();

  const [query, setQuery]                 = useState(route?.params?.query ?? '');
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);
  const [resultados, setResultados]       = useState<Producto[]>([]);
  const [noDisponibles, setNoDisponibles] = useState<string[]>([]);
  const [buscando, setBuscando]           = useState(false);
  const [origen, setOrigen]               = useState<'indice' | 'vivo' | null>(null);
  const [expandido, setExpandido]         = useState<string | null>(null);
  const [modalFiltros, setModalFiltros]   = useState(false);
  const [imgErrors, setImgErrors]         = useState<Record<string, boolean>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { agregarItem }          = useListaStore();
  const { usuario }              = useAuthStore();
  const { agregar: agregarDespensa } = useDespensa();

  // ── Búsqueda en vivo (scraping) + persistencia batch en /products_scraped ──
  const buscarEnVivo = async (q: string) => {
    const { productos, supermercadosNoDisponibles } = await buscarProductos(q);
    setResultados(productos);
    setNoDisponibles(supermercadosNoDisponibles);
    setOrigen('vivo');
    // Alimenta el índice en segundo plano (writeBatch, no bloquea la UI)
    actualizarPreciosBatch(productos).catch(() => {});
  };

  // ── Búsqueda con debounce: índice Firestore primero, scraping si no hay ────
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) { setResultados([]); setNoDisponibles([]); setOrigen(null); return; }

    timerRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        // 1) Índice /products_scraped: lecturas acotadas, respuesta inmediata
        const indexados = await buscarIndexado(query).catch(() => []);
        if (indexados.length >= 3 && indiceFresco(indexados)) {
          setResultados(indexados.map(aProducto));
          setNoDisponibles([]);
          setOrigen('indice');
          return;
        }
        // 2) Sin datos frescos → scraping en vivo
        await buscarEnVivo(query);
      } finally {
        setBuscando(false);
      }
    }, 500);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  // ── Filtrado local en tiempo real ──────────────────────────────────────────
  const productosFiltrados = useMemo(() => {
    if (!filtroCategoria) return resultados;
    return resultados.filter((p) => matchesFiltro(p, filtroCategoria));
  }, [resultados, filtroCategoria]);

  const filtroActivo = filtroCategoria !== null;
  const categoriaLabel = filtroActivo
    ? CATEGORIAS_LISTA.find((c) => c.id === filtroCategoria)
    : null;

  // ── Acciones ───────────────────────────────────────────────────────────────
  const handleAgregar = async (producto: Producto, precio: PrecioSupermercado) => {
    const nuevoId = Date.now().toString();
    const itemData: any = {
      productoId: producto.id,
      nombre: producto.nombre,
      marca: producto.marca,
      cantidad: 1,
      unidad: producto.formato,
      precioEstimado: precio.precio,
      supermercado: precio.supermercado,
      todosLosPrecios: producto.precios,
      completado: false,
    };
    if (filtroCategoria) itemData.categoria = filtroCategoria;

    let idFinal = nuevoId;
    if (usuario) {
      try { idFinal = await agregarItemLista(usuario.id, itemData); } catch {}
    }
    agregarItem({ ...itemData, id: idFinal });
    Alert.alert(
      'Agregado ✓',
      `${producto.nombre} en ${precio.supermercado} agregado a tu lista.`,
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  };

  const handleGuardarEnDespensa = async (producto: Producto, precio: PrecioSupermercado) => {
    if (!usuario) {
      Alert.alert('Inicia sesión', 'Necesitas una cuenta para guardar en la despensa.');
      return;
    }
    try {
      await agregarDespensa({
        nombre: producto.nombre,
        marca: producto.marca || undefined,
        cantidad: 1,
        unidad: producto.formato || 'unidad',
        agregadoPor: 'buscador',
        imageUrl: producto.imageUrl || undefined,
        supermercado: precio.supermercado,
        precioUnitario: precio.precio,
        categoria: filtroCategoria || undefined,
      });
      Alert.alert('¡Guardado! 🏠', `${producto.nombre} agregado a tu despensa.`);
    } catch {
      Alert.alert('Error', 'No se pudo guardar en la despensa.');
    }
  };

  const handleAgregarManual = async () => {
    if (!query.trim()) return;
    const nuevoId = Date.now().toString();
    const itemData: any = {
      nombre: query.trim(),
      cantidad: 1,
      unidad: 'unidad',
      completado: false,
    };
    if (filtroCategoria) itemData.categoria = filtroCategoria;

    let idFinal = nuevoId;
    if (usuario) {
      try { idFinal = await agregarItemLista(usuario.id, itemData); } catch {}
    }
    agregarItem({ ...itemData, id: idFinal });
    navigation.goBack();
  };

  const toggleExpandido = (id: string) =>
    setExpandido((prev) => (prev === id ? null : id));

  // ── Render producto ────────────────────────────────────────────────────────
  const renderProducto = ({ item }: { item: Producto }) => {
    const preciosOrdenados = [...item.precios].sort((a, b) => a.precio - b.precio);
    const masBarato = preciosOrdenados[0];
    const tieneMultiples = preciosOrdenados.length > 1;
    const abierto = expandido === item.id;

    return (
      <View style={s.card}>
        <TouchableOpacity
          style={s.cardHeader}
          onPress={() => tieneMultiples && toggleExpandido(item.id)}
          activeOpacity={tieneMultiples ? 0.7 : 1}
        >
          <View style={s.cardImagenBox}>
            {item.imageUrl && !imgErrors[item.id] ? (
              <Image
                source={item.imageUrl}
                style={s.cardImagenImg}
                contentFit="contain"
                transition={150}
                onError={() => setImgErrors((prev) => ({ ...prev, [item.id]: true }))}
              />
            ) : (
              <Text style={s.cardImagenFallback}>🛒</Text>
            )}
          </View>

          <View style={s.cardInfo}>
            <View style={s.cardTituloFila}>
              <Text style={s.cardNombre} numberOfLines={1}>{item.nombre}</Text>
              {item.precios.some((p) => p.enOferta) && (
                <View style={s.badgeOferta}><Text style={s.badgeTexto}>Oferta</Text></View>
              )}
            </View>
            <Text style={s.cardMeta}>{item.marca}{item.formato ? ` · ${item.formato}` : ''}</Text>
          </View>

          {tieneMultiples && (
            <MaterialCommunityIcons
              name={abierto ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={C.textMuted}
            />
          )}
        </TouchableOpacity>

        <View style={s.precioRow}>
          <View style={s.precioInfo}>
            <Text style={s.precioLabel}>Precio más bajo</Text>
            <Text style={s.precioValor}>{formatearPrecio(masBarato.precio)}</Text>
            <Text style={s.precioSup}>en {masBarato.supermercado}</Text>
          </View>
          <View style={s.accionesRow}>
            <TouchableOpacity
              style={s.btnDespensa}
              onPress={() => handleGuardarEnDespensa(item, masBarato)}
            >
              <Text style={s.btnDespensaTexto}>🏠</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnAgregar} onPress={() => handleAgregar(item, masBarato)}>
              <Text style={s.btnAgregarTexto}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {abierto && (
          <View style={s.otrosPrecios}>
            <Text style={s.otrosPreciosLabel}>Comparar supermercados</Text>
            {preciosOrdenados.map((precio, i) => (
              <View
                key={precio.supermercado}
                style={[s.supFila, i < preciosOrdenados.length - 1 && s.supFilaSep]}
              >
                <View style={s.supInfo}>
                  <View style={s.supNombreFila}>
                    <Text style={[s.supNombre, i === 0 && s.supNombreBarato]}>
                      {precio.supermercado}
                    </Text>
                    {i === 0 && (
                      <View style={s.badgeMasBarato}>
                        <Text style={s.badgeMasBaratoTexto}>más barato</Text>
                      </View>
                    )}
                    {precio.enOferta && (
                      <View style={s.badgeOferta}><Text style={s.badgeTexto}>Oferta</Text></View>
                    )}
                  </View>
                  {precio.precioLista && precio.precioLista > precio.precio && (
                    <Text style={s.precioLista}>antes {formatearPrecio(precio.precioLista)}</Text>
                  )}
                </View>
                <View style={s.supDerecha}>
                  <Text style={[s.supPrecio, i === 0 && s.supPrecioBarato]}>
                    {formatearPrecio(precio.precio)}
                  </Text>
                  <TouchableOpacity
                    style={[s.btnSupAgregar, i === 0 && s.btnSupAgregarActivo]}
                    onPress={() => handleAgregar(item, precio)}
                  >
                    <Text style={[s.btnSupAgregarTexto, i === 0 && s.btnSupAgregarTextoActivo]}>
                      Agregar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ── Render principal ───────────────────────────────────────────────────────
  return (
    <View style={s.contenedor}>
      <StatusBar
        barStyle={C.text === '#F9FAFB' ? 'light-content' : 'dark-content'}
        backgroundColor={C.bg}
      />

      {/* ── Barra superior: búsqueda + filtros ── */}
      <View style={s.topBar}>
        <View style={s.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={20} color={C.textMuted} style={s.searchIcon} />
          <TextInput
            style={s.search}
            placeholder="Busca por producto o marca..."
            value={query}
            onChangeText={setQuery}
            placeholderTextColor={C.textMuted}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={s.clearBtn}>
              <MaterialCommunityIcons name="close-circle" size={17} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Botón filtros con indicador de activo */}
        <TouchableOpacity
          style={[s.btnFiltro, filtroActivo && s.btnFiltroActivo]}
          onPress={() => setModalFiltros(true)}
        >
          <MaterialCommunityIcons
            name="tune-variant"
            size={20}
            color={filtroActivo ? '#fff' : C.textMuted}
          />
          {filtroActivo && <View style={s.filtroDot} />}
        </TouchableOpacity>
      </View>

      {/* ── Chip de filtro activo ── */}
      {filtroActivo && categoriaLabel && (
        <View style={s.filtroActivoRow}>
          <View style={s.filtroActivoChip}>
            <Text style={s.filtroActivoEmoji}>{categoriaLabel.emoji}</Text>
            <Text style={s.filtroActivoLabel}>{categoriaLabel.label}</Text>
            <TouchableOpacity onPress={() => setFiltroCategoria(null)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <MaterialCommunityIcons name="close" size={14} color={C.primary} />
            </TouchableOpacity>
          </View>
          {resultados.length > 0 && (
            <Text style={s.filtroActivoCount}>
              {productosFiltrados.length} de {resultados.length}
            </Text>
          )}
        </View>
      )}

      {/* ── Spinner ── */}
      {buscando && <LoadingSpinner mensaje="Buscando en supermercados..." />}

      {/* ── Sin resultados del API ── */}
      {!buscando && query.length > 1 && resultados.length === 0 && (
        <View style={s.sinResultados}>
          <Text style={s.sinResultadosEmoji}>🔍</Text>
          <Text style={s.sinResultadosTitulo}>Sin resultados para "{query}"</Text>
          <Text style={s.sinResultadosSub}>No encontramos ese producto en los supermercados</Text>
          <TouchableOpacity style={s.btnManual} onPress={handleAgregarManual}>
            <Text style={s.btnManualTexto}>+ Agregar "{query}" manualmente</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Sin resultados del filtro local ── */}
      {!buscando && resultados.length > 0 && productosFiltrados.length === 0 && filtroActivo && (
        <View style={s.sinResultados}>
          <Text style={s.sinResultadosEmoji}>{categoriaLabel?.emoji ?? '🔎'}</Text>
          <Text style={s.sinResultadosTitulo}>Nada en {categoriaLabel?.label}</Text>
          <Text style={s.sinResultadosSub}>
            Los {resultados.length} resultados no corresponden a esta categoría
          </Text>
          <TouchableOpacity style={s.btnManual} onPress={() => setFiltroCategoria(null)}>
            <Text style={s.btnManualTexto}>Ver todos los resultados</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Banner supermercados no disponibles ── */}
      {!buscando && noDisponibles.length > 0 && (
        <View style={s.warningBanner}>
          <Text style={s.warningTexto}>
            ⚠️ {noDisponibles.join(', ')} temporalmente no disponible{noDisponibles.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* ── Contador de resultados ── */}
      {!buscando && productosFiltrados.length > 0 && (
        <View style={s.resultadosHeader}>
          <Text style={s.resultadosCount}>
            {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''} encontrado{productosFiltrados.length !== 1 ? 's' : ''}
            {origen === 'indice' ? '  ⚡' : ''}
          </Text>
          {origen === 'indice' ? (
            <TouchableOpacity
              onPress={async () => {
                setBuscando(true);
                try { await buscarEnVivo(query); } finally { setBuscando(false); }
              }}
            >
              <Text style={s.resultadosLink}>Actualizar precios en vivo</Text>
            </TouchableOpacity>
          ) : (
            <Text style={s.resultadosTip}>🏠 despensa &nbsp;·&nbsp; + lista</Text>
          )}
        </View>
      )}

      {/* ── Lista ── */}
      <FlatList
        data={productosFiltrados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.lista}
        renderItem={renderProducto}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          !buscando && resultados.length > 0 && query.trim() ? (
            <TouchableOpacity style={s.btnManualFooter} onPress={handleAgregarManual}>
              <Text style={s.btnManualFooterTexto}>
                ¿No encuentras lo que buscas? Agregar "{query}" manualmente
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* ── Modal de filtros ── */}
      <Modal
        visible={modalFiltros}
        transparent
        animationType="slide"
        onRequestClose={() => setModalFiltros(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setModalFiltros(false)}>
          <Pressable style={s.modalSheet} onPress={() => {}}>
            {/* Handle */}
            <View style={s.modalHandle} />

            <Text style={s.modalTitulo}>Filtrar por categoría</Text>
            <Text style={s.modalSub}>Filtra los resultados actuales sin nueva búsqueda</Text>

            {/* Chips */}
            <View style={s.chipsGrid}>
              {/* Chip "Todos" */}
              <TouchableOpacity
                style={[s.chip, !filtroActivo && s.chipActivo]}
                onPress={() => { setFiltroCategoria(null); setModalFiltros(false); }}
              >
                <Text style={s.chipEmoji}>✨</Text>
                <Text style={[s.chipLabel, !filtroActivo && s.chipLabelActivo]}>Todos</Text>
              </TouchableOpacity>

              {CATEGORIAS_LISTA.map((cat) => {
                const activo = filtroCategoria === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[s.chip, activo && s.chipActivo]}
                    onPress={() => { setFiltroCategoria(cat.id); setModalFiltros(false); }}
                  >
                    <Text style={s.chipEmoji}>{cat.emoji}</Text>
                    <Text style={[s.chipLabel, activo && s.chipLabelActivo]}
                          numberOfLines={1}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.bg },

  // ── Top bar ───────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
    backgroundColor: C.bg,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 24,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: { marginRight: 6 },
  search: { flex: 1, paddingVertical: 12, fontSize: 15, color: C.text },
  clearBtn: { padding: 4 },

  // ── Botón filtros ─────────────────────────────────────────────────────────
  btnFiltro: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  btnFiltroActivo: {
    backgroundColor: C.primary,
  },
  filtroDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FF5722',
    borderWidth: 1.5,
    borderColor: C.bg,
  },

  // ── Chip filtro activo (debajo del topbar) ────────────────────────────────
  filtroActivoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },
  filtroActivoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary + '18',
    borderRadius: 100,
    paddingVertical: 5,
    paddingHorizontal: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: C.primary + '40',
  },
  filtroActivoEmoji: { fontSize: 13 },
  filtroActivoLabel: { fontSize: 12, fontWeight: '600', color: C.primary },
  filtroActivoCount: { fontSize: 12, color: C.textMuted, marginLeft: 'auto' },

  // ── Resultados header ─────────────────────────────────────────────────────
  warningBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FFA000',
  },
  warningTexto: { fontSize: 12, color: '#5D4037', fontWeight: '500' },
  resultadosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultadosCount: { fontSize: 13, fontWeight: '600', color: C.text },
  resultadosTip: { fontSize: 11, color: C.textMuted },
  resultadosLink: { fontSize: 11, color: C.primary, fontWeight: '700' },

  // ── Lista / sin resultados ────────────────────────────────────────────────
  lista: { paddingHorizontal: 16, paddingBottom: 32 },
  sinResultados: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  sinResultadosEmoji: { fontSize: 48, marginBottom: 4 },
  sinResultadosTitulo: { fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'center' },
  sinResultadosSub: { fontSize: 14, color: C.textMuted, textAlign: 'center' },
  btnManual: {
    marginTop: 8,
    backgroundColor: C.primary + '30',
    borderRadius: 100,
    paddingVertical: 11,
    paddingHorizontal: 20,
  },
  btnManualTexto: { color: C.primary, fontWeight: '700', fontSize: 14 },
  btnManualFooter: {
    margin: 4,
    padding: 14,
    borderRadius: 14,
    backgroundColor: C.surface,
    alignItems: 'center',
  },
  btnManualFooterTexto: { color: C.textMuted, fontSize: 13, textAlign: 'center' },

  // ── Tarjeta de producto ───────────────────────────────────────────────────
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 10,
  },
  cardImagenBox: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  cardImagenImg: { width: 56, height: 56 },
  cardImagenFallback: { fontSize: 26 },
  cardInfo: { flex: 1 },
  cardTituloFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardNombre: { fontSize: 15, fontWeight: '700', color: C.text, flex: 1 },
  cardMeta: { fontSize: 12, color: C.textMuted, marginTop: 2 },

  // ── Fila precio + acciones ────────────────────────────────────────────────
  precioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    marginTop: 4,
  },
  precioInfo: { flex: 1 },
  precioLabel: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  precioValor: { fontSize: 20, fontWeight: '800', color: C.primary, marginTop: 1 },
  precioSup: { fontSize: 12, color: C.textMuted },
  accionesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnDespensa: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDespensaTexto: { fontSize: 18, lineHeight: 22 },
  btnAgregar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAgregarTexto: { color: '#fff', fontSize: 22, fontWeight: '300', lineHeight: 28 },

  // ── Precios comparados ────────────────────────────────────────────────────
  otrosPrecios: {
    backgroundColor: C.bg,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  otrosPreciosLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  supFila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  supFilaSep: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  supInfo: { flex: 1 },
  supNombreFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  supNombre: { fontSize: 14, color: C.text, fontWeight: '500' },
  supNombreBarato: { fontWeight: '700', color: C.primary },
  supDerecha: { alignItems: 'flex-end', gap: 6 },
  supPrecio: { fontSize: 15, fontWeight: '700', color: C.text },
  supPrecioBarato: { color: C.primary, fontSize: 16 },
  precioLista: {
    fontSize: 11,
    color: C.textMuted,
    textDecorationLine: 'line-through',
  },
  btnSupAgregar: {
    borderRadius: 100,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  btnSupAgregarActivo: { backgroundColor: C.primary, borderColor: C.primary },
  btnSupAgregarTexto: { fontSize: 12, fontWeight: '700', color: C.textMuted },
  btnSupAgregarTextoActivo: { color: '#fff' },

  // ── Badges ────────────────────────────────────────────────────────────────
  badgeOferta: {
    backgroundColor: C.error + '20',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeTexto: { color: C.error, fontSize: 10, fontWeight: '700' },
  badgeMasBarato: {
    backgroundColor: C.primary + '20',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeMasBaratoTexto: { color: C.primary, fontSize: 10, fontWeight: '700' },

  // ── Modal filtros ─────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: 18,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: C.textMuted,
    marginBottom: 20,
  },

  // ── Chips de categoría ────────────────────────────────────────────────────
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 100,
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  chipActivo: {
    backgroundColor: C.primary + '18',
    borderColor: C.primary,
  },
  chipEmoji: { fontSize: 14 },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textMuted,
    maxWidth: 120,
  },
  chipLabelActivo: {
    color: C.primary,
    fontWeight: '700',
  },
});
