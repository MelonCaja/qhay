import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, StatusBar, Alert, Pressable,
} from 'react-native';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { ESPACIO_TAB_BAR } from '../../constants/layout';
import {
  createShoppingList, getShoppingLists, addItemToList,
  toggleItemCheck, removeItemFromList, clearCheckedItems,
} from '../../services/shoppingService';
import type { ShoppingList, ShoppingItem } from '../../types/firestore';

const NOMBRE_LISTA_DEFAULT = 'Lista del súper';

// `embebida`: se renderiza dentro de ListasScreen (sin StatusBar ni header propios)
export function ListaUniversalScreen({ embebida = false }: { embebida?: boolean }) {
  const C = useColors();
  const s = makeStyles(C);
  const { usuario } = useAuthStore();
  const [lista, setLista] = useState<ShoppingList | null>(null);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(true);

  // Carga (o crea) la lista universal del usuario
  const cargar = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    try {
      const listas = await getShoppingLists(usuario.id);
      setLista(listas[0] ?? (await createShoppingList(usuario.id, NOMBRE_LISTA_DEFAULT)));
    } catch (error) {
      console.error('[listaUniversal] Error cargando:', error);
    } finally {
      setCargando(false);
    }
  }, [usuario]);

  useEffect(() => { cargar(); }, [cargar]);

  const stats = useMemo(() => {
    const items = lista?.items ?? [];
    const listos = items.filter((i) => i.checked).length;
    return { total: items.length, listos, pendientes: items.length - listos };
  }, [lista]);

  // ── Acciones (optimistas: UI primero, Firestore después) ──────────────────
  const agregar = async () => {
    const nombre = texto.trim();
    if (!nombre || !lista) return;
    setTexto('');
    try {
      const item = await addItemToList(lista, nombre);
      setLista({ ...lista, items: [...lista.items, item] });
    } catch {
      Alert.alert('Error', 'No se pudo agregar el producto.');
    }
  };

  const toggle = async (item: ShoppingItem) => {
    if (!lista) return;
    const items = lista.items.map((i) => i.id === item.id ? { ...i, checked: !i.checked } : i);
    setLista({ ...lista, items });
    toggleItemCheck(lista, item.id).catch(() => cargar());
  };

  const eliminar = async (item: ShoppingItem) => {
    if (!lista) return;
    setLista({ ...lista, items: lista.items.filter((i) => i.id !== item.id) });
    removeItemFromList(lista, item.id).catch(() => cargar());
  };

  const limpiarComprados = async () => {
    if (!lista || stats.listos === 0) return;
    setLista({ ...lista, items: lista.items.filter((i) => !i.checked) });
    clearCheckedItems(lista).catch(() => cargar());
  };

  // ── Render item (bloque bento) ─────────────────────────────────────────────
  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <Pressable
      style={({ pressed }) => [
        s.item,
        item.checked && s.itemChecked,
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
      ]}
      onPress={() => toggle(item)}
      onLongPress={() =>
        Alert.alert('Eliminar', `¿Quitar "${item.productName}" de la lista?`, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: () => eliminar(item) },
        ])
      }
    >
      <View style={[s.check, item.checked && s.checkOn]}>
        {item.checked && <Text style={s.checkMark}>✓</Text>}
      </View>
      <View style={s.itemInfo}>
        <Text style={[s.itemNombre, item.checked && s.itemNombreChecked]} numberOfLines={1}>
          {item.productName}
        </Text>
        <Text style={s.itemMeta}>
          {item.quantity > 1 ? `×${item.quantity} · ` : ''}genérico — cualquier marca
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={s.contenedor}>
      {!embebida && (
        <StatusBar barStyle={C.bg === '#0D0F12' ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      )}

      <View style={[s.header, embebida && s.headerEmbebido]}>
        {!embebida && <Text style={s.titulo}>Lista del Súper</Text>}
        <Text style={s.subtitulo}>Sin cadenas: compra donde te convenga</Text>
      </View>

      {/* Input rápido: texto → enter, sin configuración de tienda */}
      <View style={s.inputFila}>
        <TextInput
          style={s.input}
          placeholder="Escribe y agrega: pan, leche, tomates…"
          placeholderTextColor={C.textMuted}
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={agregar}
          returnKeyType="done"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[s.btnAgregar, !texto.trim() && s.btnAgregarOff]}
          onPress={agregar}
          disabled={!texto.trim()}
        >
          <Text style={s.btnAgregarTexto}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={lista?.items ?? []}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={s.listaScroll}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          stats.total > 0 ? (
            <View style={s.statsFila}>
              <View style={s.statTile}>
                <Text style={s.statValor}>{stats.pendientes}</Text>
                <Text style={s.statLabel}>POR COMPRAR</Text>
              </View>
              <View style={[s.statTile, stats.listos > 0 && s.statTileFluor]}>
                <Text style={[s.statValor, stats.listos > 0 && { color: C.primary }]}>
                  {stats.listos}
                </Text>
                <Text style={s.statLabel}>EN EL CARRO</Text>
              </View>
              {stats.listos > 0 && (
                <TouchableOpacity style={s.btnLimpiar} onPress={limpiarComprados}>
                  <Text style={s.btnLimpiarTexto}>Vaciar{'\n'}comprados</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          !cargando ? (
            <View style={s.vacio}>
              <Text style={s.vacioEmoji}>🛒</Text>
              <Text style={s.vacioTitulo}>Lista vacía</Text>
              <Text style={s.vacioSub}>
                Anota lo que necesitas sin pensar en marcas ni supermercados.
                Toca un ítem para marcarlo comprado.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14 },
  headerEmbebido: { paddingTop: 12, paddingBottom: 10, alignItems: 'center' },
  titulo: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  subtitulo: { fontSize: 13, color: C.textMuted, marginTop: 3 },

  // Input rápido
  inputFila: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 14 },
  input: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: C.text,
  },
  btnAgregar: {
    width: 48,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAgregarOff: { opacity: 0.35 },
  btnAgregarTexto: { fontSize: 26, fontWeight: '400', color: C.onPrimary, lineHeight: 30 },

  listaScroll: { paddingHorizontal: 16, paddingBottom: ESPACIO_TAB_BAR, gap: 8 },

  // Stats bento
  statsFila: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statTile: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  statTileFluor: { borderColor: C.borderBright },
  statValor: { fontSize: 20, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, color: C.textMuted },
  btnLimpiar: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface2,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  btnLimpiarTexto: { fontSize: 10, fontWeight: '700', color: C.textMuted, textAlign: 'center' },

  // Ítem bento
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 12,
  },
  itemChecked: { opacity: 0.38 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: C.primary, borderColor: C.primary },
  checkMark: { color: C.onPrimary, fontSize: 13, fontWeight: '800' },
  itemInfo: { flex: 1 },
  itemNombre: { fontSize: 15, fontWeight: '600', color: C.text },
  itemNombreChecked: { textDecorationLine: 'line-through' },
  itemMeta: { fontSize: 11, color: C.textMuted, marginTop: 2 },

  // Vacío
  vacio: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 40, gap: 8 },
  vacioEmoji: { fontSize: 48 },
  vacioTitulo: { fontSize: 18, fontWeight: '800', color: C.text },
  vacioSub: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19 },
});
