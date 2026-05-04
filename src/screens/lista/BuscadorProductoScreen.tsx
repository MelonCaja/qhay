import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TextInput, TouchableOpacity, Alert, StatusBar, Modal, Pressable, Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { agregarItemLista } from '../../services/firestore';
import { useAuthStore } from '../../store/authStore';
import { useListaStore } from '../../store/listaStore';
import { buscarProductos } from '../../services/scraping';
import { Producto, PrecioSupermercado, ItemLista } from '../../types/producto';
import { formatearPrecio } from '../../utils/precioHelper';
import { CATEGORIAS_LISTA } from '../../constants/categorias';

export function BuscadorProductoScreen() {
  const C = useColors();
  const s = makeStyles(C);
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [categoriaSel, setCategoriaSel] = useState<string | null>(null);
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [noDisponibles, setNoDisponibles] = useState<string[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [modalCategorias, setModalCategorias] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { agregarItem } = useListaStore();
  const { usuario } = useAuthStore();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) { setResultados([]); setNoDisponibles([]); return; }

    timerRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const { productos, supermercadosNoDisponibles } = await buscarProductos(query);
        setResultados(productos);
        setNoDisponibles(supermercadosNoDisponibles);
      } finally {
        setBuscando(false);
      }
    }, 500);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

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
    if (categoriaSel) itemData.categoria = categoriaSel;

    let idFinal = nuevoId;
    if (usuario) {
      try {
        idFinal = await agregarItemLista(usuario.id, itemData);
      } catch (err) {
      }
    }

    agregarItem({ ...itemData, id: idFinal });

    Alert.alert(
      'Agregado',
      `${producto.nombre} en ${precio.supermercado} agregado a tu lista.`,
      [{ text: 'OK', onPress: () => {
          navigation.goBack();
      } }]
    );
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
    if (categoriaSel) itemData.categoria = categoriaSel;

    let idFinal = nuevoId;
    if (usuario) {
      try {
        idFinal = await agregarItemLista(usuario.id, itemData);
      } catch { /* mantiene id local si falla Firestore */ }
    }

    agregarItem({ ...itemData, id: idFinal });
    navigation.goBack();
  };

  const toggleExpandido = (id: string) =>
    setExpandido((prev) => (prev === id ? null : id));

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
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={s.cardImagen} resizeMode="contain" />
          ) : null}
          <View style={s.cardInfo}>
            <View style={s.cardTituloFila}>
              <Text style={s.cardNombre} numberOfLines={1}>{item.nombre}</Text>
              {item.precios.some((p) => p.enOferta) && (
                <View style={s.badgeOferta}>
                  <Text style={s.badgeTexto}>Oferta</Text>
                </View>
              )}
            </View>
            <Text style={s.cardMeta}>{item.marca}{item.formato ? ` · ${item.formato}` : ''}</Text>
          </View>
          {tieneMultiples && <Text style={s.chevron}>{abierto ? '▲' : '▼'}</Text>}
        </TouchableOpacity>

        <View style={s.precioRow}>
          <View style={s.precioInfo}>
            <Text style={s.precioLabel}>Precio más bajo</Text>
            <Text style={s.precioValor}>{formatearPrecio(masBarato.precio)}</Text>
            <Text style={s.precioSup}>en {masBarato.supermercado}</Text>
          </View>
          <TouchableOpacity style={s.btnAgregar} onPress={() => handleAgregar(item, masBarato)}>
            <Text style={s.btnAgregarTexto}>+</Text>
          </TouchableOpacity>
        </View>

        {abierto && (
          <View style={s.otrosPrecios}>
            <Text style={s.otrosPreciosLabel}>Comparar supermercados</Text>
            {preciosOrdenados.map((precio, i) => (
              <View key={precio.supermercado} style={[s.supFila, i < preciosOrdenados.length - 1 && s.supFilaSep]}>
                <View style={s.supInfo}>
                  <View style={s.supNombreFila}>
                    <Text style={[s.supNombre, i === 0 && s.supNombreBarato]}>{precio.supermercado}</Text>
                    {i === 0 && (
                      <View style={s.badgeMasBarato}>
                        <Text style={s.badgeMasBaratoTexto}>más barato</Text>
                      </View>
                    )}
                    {precio.enOferta && (
                      <View style={s.badgeOferta}>
                        <Text style={s.badgeTexto}>Oferta</Text>
                      </View>
                    )}
                  </View>
                  {precio.precioLista && precio.precioLista > precio.precio && (
                    <Text style={s.precioLista}>antes {formatearPrecio(precio.precioLista)}</Text>
                  )}
                </View>
                <View style={s.supDerecha}>
                  <Text style={[s.supPrecio, i === 0 && s.supPrecioBarato]}>{formatearPrecio(precio.precio)}</Text>
                  <TouchableOpacity
                    style={[s.btnSupAgregar, i === 0 && s.btnSupAgregarActivo]}
                    onPress={() => handleAgregar(item, precio)}
                  >
                    <Text style={[s.btnSupAgregarTexto, i === 0 && s.btnSupAgregarTextoActivo]}>Agregar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={s.contenedor}>
      <StatusBar barStyle={C.text === '#F9FAFB' ? 'light-content' : 'dark-content'} backgroundColor={C.surface} />

      {/* Menú Desplegable de Categorías */}
      <View style={s.filtroContainer}>
        <View style={s.pickerWrapper}>
          <Picker
            selectedValue={categoriaSel}
            onValueChange={(itemValue) => {
              if (itemValue === 'todas') {
                setCategoriaSel(null);
                setQuery('');
              } else {
                setCategoriaSel(itemValue);
                const cat = CATEGORIAS_LISTA.find(c => c.id === itemValue);
                if (cat) setQuery(cat.label);
              }
            }}
            style={s.picker}
            mode="dropdown"
          >
            <Picker.Item label="Seleccionar Pasillo..." value="todas" color={C.textMuted} />
            {CATEGORIAS_LISTA.map(cat => (
              <Picker.Item key={cat.id} label={`${cat.emoji} ${cat.label}`} value={cat.id} color={C.text} />
            ))}
          </Picker>
        </View>
        {categoriaSel && (
          <TouchableOpacity onPress={() => { setCategoriaSel(null); setQuery(''); }} style={s.clearFiltro}>
            <Text style={s.clearFiltroTexto}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.searchWrap}>
        <TextInput
          style={s.search}
          placeholder="Busca por producto o marca..."
          value={query}
          onChangeText={setQuery}
          placeholderTextColor={C.textMuted}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={s.clearBtn}>
            <Text style={s.clearTexto}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {buscando && <LoadingSpinner mensaje="Buscando en supermercados..." />}

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

      {!buscando && noDisponibles.length > 0 && (
        <View style={s.warningBanner}>
          <Text style={s.warningTexto}>
            ⚠️ {noDisponibles.join(', ')} temporalmente no disponible{noDisponibles.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {!buscando && resultados.length > 0 && (
        <View style={s.resultadosHeader}>
          <Text style={s.resultadosCount}>{resultados.length} productos encontrados</Text>
          <Text style={s.resultadosTip}>Toca un producto para comparar precios</Text>
        </View>
      )}

      <FlatList
        data={resultados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.lista}
        renderItem={renderProducto}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          !buscando && resultados.length > 0 && query.trim() ? (
            <TouchableOpacity style={s.btnManualFooter} onPress={handleAgregarManual}>
              <Text style={s.btnManualFooterTexto}>¿No encuentras lo que buscas? Agregar "{query}" manualmente</Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.bg },
  filtroContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 10, gap: 10 },
  pickerWrapper: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden'
  },
  picker: { height: 50, width: '100%' },
  clearFiltro: { padding: 10, backgroundColor: C.surface, borderRadius: 100, borderWidth: 1, borderColor: C.border },
  clearFiltroTexto: { color: C.textMuted, fontSize: 14, fontWeight: '700' },
  searchWrap: {
    margin: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 24,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  search: { flex: 1, paddingVertical: 13, fontSize: 15, color: C.text },
  clearBtn: { padding: 4 },
  clearTexto: { color: C.textMuted, fontSize: 13 },
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
  resultadosHeader: { paddingHorizontal: 16, paddingBottom: 8 },
  resultadosCount: { fontSize: 13, fontWeight: '600', color: C.text },
  resultadosTip: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  lista: { paddingHorizontal: 16, paddingBottom: 32 },
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8, gap: 10 },
  cardImagen: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#F5F5F5' },
  cardInfo: { flex: 1 },
  cardTituloFila: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardNombre: { fontSize: 15, fontWeight: '700', color: C.text, flex: 1 },
  cardMeta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  chevron: { fontSize: 11, color: C.textMuted, marginLeft: 8 },
  precioRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, marginTop: 4, paddingTop: 10 },
  precioInfo: { flex: 1 },
  precioLabel: { fontSize: 11, color: C.textMuted, fontWeight: '500', textTransform: 'uppercase' },
  precioValor: { fontSize: 20, fontWeight: '800', color: C.primary, marginTop: 1 },
  precioSup: { fontSize: 12, color: C.textMuted },
  btnAgregar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  btnAgregarTexto: { color: '#fff', fontSize: 22, fontWeight: '300', lineHeight: 28 },
  otrosPrecios: { backgroundColor: C.bg, paddingHorizontal: 14, paddingBottom: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  otrosPreciosLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', marginBottom: 10 },
  supFila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  supFilaSep: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  supInfo: { flex: 1 },
  supNombreFila: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  supNombre: { fontSize: 14, color: C.text, fontWeight: '500' },
  supNombreBarato: { fontWeight: '700', color: C.primary },
  supDerecha: { alignItems: 'flex-end', gap: 6 },
  supPrecio: { fontSize: 15, fontWeight: '700', color: C.text },
  supPrecioBarato: { color: C.primary, fontSize: 16 },
  precioLista: { fontSize: 11, color: C.textMuted, textDecorationLine: 'line-through' },
  btnSupAgregar: { borderRadius: 100, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1.5, borderColor: C.border },
  btnSupAgregarActivo: { backgroundColor: C.primary, borderColor: C.primary },
  btnSupAgregarTexto: { fontSize: 12, fontWeight: '700', color: C.textMuted },
  btnSupAgregarTextoActivo: { color: '#fff' },
  badgeOferta: { backgroundColor: C.error + '20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTexto: { color: C.error, fontSize: 10, fontWeight: '700' },
  badgeMasBarato: { backgroundColor: C.primary + '20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeMasBaratoTexto: { color: C.primary, fontSize: 10, fontWeight: '700' },
  sinResultados: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  sinResultadosEmoji: { fontSize: 48, marginBottom: 4 },
  sinResultadosTitulo: { fontSize: 16, fontWeight: '700', color: C.text },
  sinResultadosSub: { fontSize: 14, color: C.textMuted, textAlign: 'center' },
  btnManual: { marginTop: 8, backgroundColor: C.primary + '30', borderRadius: 100, paddingVertical: 11, paddingHorizontal: 20 },
  btnManualTexto: { color: C.primary, fontWeight: '700', fontSize: 14 },
  btnManualFooter: { margin: 4, padding: 14, borderRadius: 14, backgroundColor: C.surface, alignItems: 'center' },
  btnManualFooterTexto: { color: C.textMuted, fontSize: 13, textAlign: 'center' },
});