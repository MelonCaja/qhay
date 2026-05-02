import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  TouchableOpacity, Alert, StatusBar, Modal,
  TextInput, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { ProductoItem } from '../../components/lista/ProductoItem';
import { TotalEstimado } from '../../components/lista/TotalEstimado';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useListaStore } from '../../store/listaStore';
import { useAuthStore } from '../../store/authStore';
import { obtenerLista, actualizarItemLista, eliminarItemLista } from '../../services/firestore';
import { formatearPrecio } from '../../utils/precioHelper';
import { ItemLista } from '../../types/producto';
import { CATEGORIAS_LISTA } from '../../constants/categorias';

// ── Algoritmo comparador ──────────────────────────────────────────────────────

interface ResultadoSuper {
  supermercado: string;
  total: number;
  itemsCubiertos: number;
  total100: number;
}

function calcularComparacion(pendientes: ItemLista[]): ResultadoSuper[] {
  if (pendientes.length === 0) return [];

  const supers = new Set<string>();
  pendientes.forEach((item) => {
    item.todosLosPrecios?.forEach((p) => supers.add(p.supermercado));
    if (item.supermercado) supers.add(item.supermercado);
  });
  if (supers.size === 0) return [];

  return Array.from(supers)
    .map((sup) => {
      let total = 0;
      let itemsCubiertos = 0;

      pendientes.forEach((item) => {
        const enTodos = item.todosLosPrecios?.find((p) => p.supermercado === sup);
        if (enTodos) {
          total += enTodos.precio * item.cantidad;
          itemsCubiertos++;
        } else if (item.supermercado === sup && item.precioEstimado) {
          total += item.precioEstimado * item.cantidad;
          itemsCubiertos++;
        } else {
          // Producto equivalente: fallback a precio estimado
          total += (item.precioEstimado || 0) * item.cantidad;
        }
      });

      return {
        supermercado: sup,
        total,
        itemsCubiertos,
        total100: total,
      };
    })
    .sort((a, b) => a.total - b.total);
}

// ── Componente comparador ─────────────────────────────────────────────────────

function ComparadorSupermercados({ items }: { items: ItemLista[] }) {
  const C = useColors();
  const s = makeStyles(C);
  const [abierto, setAbierto] = useState(true);

  const pendientes = items.filter((i) => !i.completado);
  const comparacion = calcularComparacion(pendientes);
  if (comparacion.length === 0) return null;

  const mejor = comparacion[0];
  const totalItems = pendientes.length;

  return (
    <View style={s.comparador}>
      <TouchableOpacity style={s.comparadorHeader} onPress={() => setAbierto((v) => !v)} activeOpacity={0.7}>
        <View>
          <Text style={s.comparadorTitulo}>Comparar (Carro 100%)</Text>
          <Text style={s.comparadorSub}>
            Más conveniente: <Text style={s.comparadorMejor}>{mejor.supermercado}</Text>
          </Text>
        </View>
        <Text style={s.chevron}>{abierto ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {abierto && (
        <View style={s.comparadorBody}>
          {comparacion.map((r, i) => {
            const esMejor = i === 0;
            return (
              <View
                key={r.supermercado}
                style={[s.supRow, i < comparacion.length - 1 && s.supRowSep, esMejor && s.supRowMejor]}
              >
                <View style={s.supRowIzq}>
                  {esMejor && (
                    <View style={s.badgeMejor}>
                      <Text style={s.badgeMejorTexto}>Recomendado</Text>
                    </View>
                  )}
                  <Text style={[s.supNombre, esMejor && s.supNombreMejor]}>{r.supermercado}</Text>
                  <Text style={s.supCobertura}>
                    {r.itemsCubiertos}/{totalItems} exactos
                    {r.itemsCubiertos < totalItems ? ` (resto equivalente)` : ''}
                  </Text>
                </View>
                <View style={s.supRowDer}>
                  <Text style={[s.supTotal, esMejor && s.supTotalMejor]}>
                    {formatearPrecio(r.total)}
                  </Text>
                </View>
              </View>
            );
          })}
          <Text style={s.comparadorDisclaimer}>
            Calculado con precio equivalente para ítems no encontrados en el local.
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Modal Mis Listas ──────────────────────────────────────────────────────────

function MisListasModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const C = useColors();
  const s = makeStyles(C);
  const [nombreNueva, setNombreNueva] = useState('');
  const { listasGuardadas, guardarListaActual, cargarListaGuardada, eliminarListaGuardada } = useListaStore();

  const handleGuardar = async () => {
    if (!nombreNueva.trim()) {
      Alert.alert('Nombre requerido', 'Ingresa un nombre para la lista.');
      return;
    }
    await guardarListaActual(nombreNueva.trim());
    setNombreNueva('');
    Alert.alert('Lista guardada', `"${nombreNueva.trim()}" guardada correctamente.`);
  };

  const handleCargar = (id: string, nombre: string) => {
    Alert.alert('Cargar lista', `¿Reemplazar la lista actual con "${nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cargar', onPress: () => {
          cargarListaGuardada(id);
          onClose();
        },
      },
    ]);
  };

  const handleEliminar = (id: string, nombre: string) => {
    Alert.alert('Eliminar lista', `¿Eliminar "${nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminarListaGuardada(id) },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.modalOverlay} onPress={onClose}>
        <Pressable style={s.modalSheet} onPress={() => {}}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitulo}>Mis Listas</Text>

          <View style={s.guardarRow}>
            <TextInput
              style={s.guardarInput}
              placeholder="Nombre de la lista..."
              placeholderTextColor={C.textMuted}
              value={nombreNueva}
              onChangeText={setNombreNueva}
            />
            <TouchableOpacity style={s.guardarBtn} onPress={handleGuardar}>
              <Text style={s.guardarBtnTexto}>Guardar actual</Text>
            </TouchableOpacity>
          </View>

          {listasGuardadas.length === 0 ? (
            <Text style={s.listaVaciaTexto}>No tienes listas guardadas.</Text>
          ) : (
            <FlatList
              data={[...listasGuardadas].sort((a, b) => b.creadaEn - a.creadaEn)}
              keyExtractor={(l) => l.id}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <View style={s.listaRow}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => handleCargar(item.id, item.nombre)}>
                    <Text style={s.listaRowNombre}>{item.nombre}</Text>
                    <Text style={s.listaRowSub}>
                      {item.items.length} productos · {new Date(item.creadaEn).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleEliminar(item.id, item.nombre)} style={s.listaRowDel}>
                    <Text style={s.listaRowDelTexto}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────

export function ListaComprasScreen() {
  const C = useColors();
  const s = makeStyles(C);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { usuario } = useAuthStore();
  const {
    items, cargando,
    setItems, setCargando,
    eliminarItem, toggleCompletado,
    actualizarCantidad, totalEstimado,
    guardarListaActual, cargarListaGuardada,
    listasGuardadas, inicializarListasGuardadas,
  } = useListaStore();

  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [modalListasVisible, setModalListasVisible] = useState(false);

  useEffect(() => {
    inicializarListasGuardadas();
  }, []);

  useEffect(() => {
    if (!usuario) return;
    setCargando(true);
    obtenerLista(usuario.id).then(setItems).catch(() => {}).finally(() => setCargando(false));
  }, [usuario]);

  const handleToggle = async (id: string) => {
    if (!usuario) return;
    const item = items.find((i) => i.id === id);
    if (!item) return;
    toggleCompletado(id);
    try {
      await actualizarItemLista(usuario.id, id, { completado: !item.completado });
    } catch {
      toggleCompletado(id);
    }
  };

  const handleEliminar = async (id: string) => {
    if (!usuario) return;
    eliminarItem(id);
    try { await eliminarItemLista(usuario.id, id); } catch {}
  };

  const handleCantidad = async (id: string, nueva: number) => {
    if (!usuario || nueva < 1) return;
    
    // Optimistic update en la UI
    actualizarCantidad(id, nueva);
    
    try {
      // Guardar en Firestore para que no haya rebote
      await actualizarItemLista(usuario.id, id, { cantidad: nueva });
    } catch (err) {
      console.error('Error actualizando cantidad en firestore:', err);
      // Solo revertir si la petición falla de verdad
      const item = items.find((i) => i.id === id);
      if (item) actualizarCantidad(id, item.cantidad);
    }
  };

  const handleLimpiarComprados = () => {
    const comprados = items.filter((i) => i.completado);
    if (comprados.length === 0) return;
    Alert.alert('Limpiar lista', `¿Eliminar ${comprados.length} productos comprados?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpiar', style: 'destructive', onPress: () => comprados.forEach((i) => handleEliminar(i.id)) },
    ]);
  };

  const pendientes = items.filter((i) => !i.completado);
  const comprados = items.filter((i) => i.completado);
  const total = totalEstimado();

  // Filtrar pendientes por categoría seleccionada
  const pendientesFiltrados = categoriaFiltro
    ? pendientes.filter((i) => (i as any).categoria === categoriaFiltro)
    : pendientes;

  // Categorías presentes en los ítems pendientes
  const categoriasPresentes = CATEGORIAS_LISTA.filter((cat) =>
    pendientes.some((i) => (i as any).categoria === cat.id)
  );

  // Armar lista plana agrupada
  type FlatListItem = { type: 'header'; titulo: string; id: string } | { type: 'item'; item: ItemLista };
  const buildFlatListData = (): FlatListItem[] => {
    const data: FlatListItem[] = [];

    const groups: Record<string, ItemLista[]> = {};
    pendientesFiltrados.forEach((i) => {
      const catId = (i as any).categoria || 'sin_categoria';
      if (!groups[catId]) groups[catId] = [];
      groups[catId].push(i);
    });

    // Solo mostrar las categorías si hay items, 
    // y además respetar el filtro si está seleccionado
    CATEGORIAS_LISTA.forEach((cat) => {
      if (groups[cat.id]) {
        data.push({ type: 'header', titulo: cat.label, id: `header-${cat.id}` });
        groups[cat.id].forEach((item) => data.push({ type: 'item', item }));
      }
    });

    if (groups['sin_categoria']) {
      data.push({ type: 'header', titulo: 'Otros', id: 'header-otros' });
      groups['sin_categoria'].forEach((item) => data.push({ type: 'item', item }));
    }

    if (comprados.length > 0 && !categoriaFiltro) {
      data.push({ type: 'header', titulo: 'Ya comprados', id: 'header-comprados' });
      comprados.forEach((item) => data.push({ type: 'item', item }));
    }

    return data;
  };

  if (cargando) return <LoadingSpinner pantalla mensaje="Cargando lista..." />;

  return (
    <View style={s.contenedor}>
      <StatusBar barStyle={C.text === '#F9FAFB' ? 'light-content' : 'dark-content'} backgroundColor={C.surface} />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.titulo}>Lista de compras</Text>
          <Text style={s.subtitulo}>{pendientes.length} pendientes · {comprados.length} comprados</Text>
        </View>
        <View style={s.headerAcciones}>
          <TouchableOpacity style={s.btnListas} onPress={() => setModalListasVisible(true)}>
            <Text style={s.btnListasTexto}>☰</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('BuscadorProducto')}>
            <Text style={s.fabTexto}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtro de categorías */}
      {categoriasPresentes.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.categoriasContainer}
          style={s.categoriasScroll}
        >
          <TouchableOpacity
            style={[s.categoriaChip, categoriaFiltro === null && s.categoriaChipActivo]}
            onPress={() => setCategoriaFiltro(null)}
          >
            <Text style={[s.categoriaChipTexto, categoriaFiltro === null && s.categoriaChipTextoActivo]}>
              Todos
            </Text>
          </TouchableOpacity>
          {categoriasPresentes.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[s.categoriaChip, categoriaFiltro === cat.id && s.categoriaChipActivo]}
              onPress={() => setCategoriaFiltro(categoriaFiltro === cat.id ? null : cat.id)}
            >
              <Text style={s.categoriaChipEmoji}>{cat.emoji}</Text>
              <Text style={[s.categoriaChipTexto, categoriaFiltro === cat.id && s.categoriaChipTextoActivo]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {items.length === 0 ? (
        <View style={s.vacio}>
          <Text style={s.vacioEmoji}>🛒</Text>
          <Text style={s.vacioTitulo}>Lista vacía</Text>
          <Text style={s.vacioSub}>Agrega productos para saber dónde comprar más barato</Text>
          <TouchableOpacity style={s.vacioBtn} onPress={() => navigation.navigate('BuscadorProducto')}>
            <Text style={s.vacioBtnTexto}>Agregar producto</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={buildFlatListData()}
          keyExtractor={(it) => it.type === 'header' ? it.id : (it as any).item.id}
          renderItem={({ item: it }) => {
            if (it.type === 'header') {
              return (
                <View style={[s.seccionHeader, it.titulo !== 'Ya comprados' && { marginTop: 8 }]}>
                  <Text style={s.seccionLabel}>{it.titulo}</Text>
                  {it.titulo === 'Ya comprados' && (
                    <TouchableOpacity onPress={handleLimpiarComprados}>
                      <Text style={s.limpiarTexto}>Limpiar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }
            const item = (it as any).item;
            return (
              <ProductoItem
                item={item}
                onToggle={() => handleToggle(item.id)}
                onEliminar={() => handleEliminar(item.id)}
                onCambiarCantidad={(nueva) => handleCantidad(item.id, nueva)}
              />
            );
          }}
          contentContainerStyle={s.lista}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            pendientesFiltrados.length > 0 ? (
              <View style={s.footer}>
                <ComparadorSupermercados items={items} />
                {total > 0 && (
                  <TotalEstimado
                    total={total}
                    esEstudiante={usuario?.esEstudiante && usuario?.estudianteVerificado}
                  />
                )}
                <TouchableOpacity style={s.btnMapa} onPress={() => navigation.navigate('MapaSupermercados')}>
                  <Text style={s.btnMapaTexto}>Ver en el mapa</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      <MisListasModal visible={modalListasVisible} onClose={() => setModalListasVisible(false)} />
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: C.surface,
  },
  titulo: { fontSize: 24, fontWeight: '700', color: C.text },
  subtitulo: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  headerAcciones: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnListas: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnListasTexto: { fontSize: 18, color: C.text },
  fab: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabTexto: { color: '#fff', fontSize: 22, fontWeight: '300', lineHeight: 26 },

  // Filtro categorías
  categoriasScroll: { backgroundColor: C.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  categoriasContainer: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  categoriaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  categoriaChipActivo: { backgroundColor: C.primary, borderColor: C.primary },
  categoriaChipEmoji: { fontSize: 13 },
  categoriaChipTexto: { fontSize: 12, fontWeight: '500', color: C.textMuted },
  categoriaChipTextoActivo: { color: '#fff' },

  lista: { padding: 16, paddingBottom: 32 },
  seccionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingTop: 4,
  },
  seccionLabel: { fontSize: 12, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase' },
  limpiarTexto: { fontSize: 13, color: C.error, fontWeight: '600' },
  footer: { paddingTop: 8, paddingBottom: 24, gap: 10 },
  btnMapa: {
    backgroundColor: C.primary,
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnMapaTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  vacioEmoji: { fontSize: 56, marginBottom: 4 },
  vacioTitulo: { fontSize: 19, fontWeight: '700', color: C.text },
  vacioSub: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 12 },
  vacioBtn: { backgroundColor: C.primary, borderRadius: 100, paddingVertical: 12, paddingHorizontal: 24 },
  vacioBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Comparador
  comparador: {
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  comparadorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  comparadorTitulo: { fontSize: 15, fontWeight: '700', color: C.text },
  comparadorSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  comparadorMejor: { color: C.primary, fontWeight: '700' },
  chevron: { fontSize: 11, color: C.textMuted },
  comparadorBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
  },
  supRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  supRowSep: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  supRowMejor: { backgroundColor: C.primarySoft, marginHorizontal: -16, paddingHorizontal: 16, borderRadius: 0 },
  supRowIzq: { flex: 1, gap: 2 },
  badgeMejor: { alignSelf: 'flex-start', backgroundColor: C.primary + '25', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 2 },
  badgeMejorTexto: { fontSize: 10, fontWeight: '700', color: C.primary },
  supNombre: { fontSize: 15, fontWeight: '500', color: C.text },
  supNombreMejor: { fontWeight: '700', color: C.primary },
  supCobertura: { fontSize: 12, color: C.textMuted },
  supRowDer: { alignItems: 'flex-end', gap: 2 },
  supTotal: { fontSize: 17, fontWeight: '700', color: C.text },
  supTotalMejor: { color: C.primary, fontSize: 18 },
  supFaltantes: { fontSize: 11, color: C.warning },
  comparadorDisclaimer: { fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginTop: 10, textAlign: 'center' },

  // Modal Mis Listas
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  modalHandle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitulo: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 16 },
  guardarRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  guardarInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.text,
    fontSize: 14,
    backgroundColor: C.bg,
  },
  guardarBtn: {
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  guardarBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 13 },
  listaVaciaTexto: { color: C.textMuted, fontSize: 14, textAlign: 'center', marginTop: 20 },
  listaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  listaRowNombre: { fontSize: 15, fontWeight: '600', color: C.text },
  listaRowSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  listaRowDel: { padding: 8 },
  listaRowDelTexto: { fontSize: 16, color: C.error },
});
