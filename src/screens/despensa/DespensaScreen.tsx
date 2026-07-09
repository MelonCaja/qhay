import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { useDespensaStore } from '../../store/despensaStore';
import { VencimientoAlert } from '../../components/despensa/VencimientoAlert';
import { diasParaVencer } from '../../utils/fechaHelper';

// ── Pasillos del supermercado ─────────────────────────────────────────────────
const PASILLOS = [
  { id: 'frutas_verduras',      label: 'Frutas y Verduras',               icono: 'food-apple'            },
  { id: 'lacteos',              label: 'Lácteos, Huevos y Congelados',    icono: 'snowflake'             },
  { id: 'quesos_fiambres',      label: 'Quesos y Fiambres',               icono: 'cheese'                },
  { id: 'despensa',             label: 'Despensa',                        icono: 'food-variant'          },
  { id: 'carnes_pescados',      label: 'Carnes y Pescados',               icono: 'food-steak'            },
  { id: 'panaderia',            label: 'Panadería y Pastelería',          icono: 'bread-slice'           },
  { id: 'bebidas',              label: 'Licores, Bebidas y Aguas',        icono: 'bottle-wine'           },
  { id: 'snacks',               label: 'Chocolates, Galletas y Snacks',   icono: 'cookie'                },
  { id: 'limpieza',             label: 'Limpieza',                        icono: 'broom'                 },
  { id: 'cuidado_personal',     label: 'Cuidado Personal y Bebé',         icono: 'spray-bottle'          },
  { id: 'mascotas',             label: 'Mascotas',                        icono: 'bone'                  },
  { id: 'hogar',                label: 'Hogar, Juguetería y Librería',    icono: 'home'                  },
  { id: 'farmacia',             label: 'Farmacia',                        icono: 'medical-bag'           },
] as const;

type PasilloId = typeof PASILLOS[number]['id'];

export function DespensaScreen() {
  const C = useColors();
  const s = makeStyles(C);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const ingredientes = useDespensaStore((state) => state.ingredientes);

  // Contar items por categoría
  const conteoXCategoria = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const ing of ingredientes) {
      if (ing.categoria) {
        mapa[ing.categoria] = (mapa[ing.categoria] ?? 0) + 1;
      }
    }
    return mapa;
  }, [ingredientes]);

  // Stats HUD
  const stats = useMemo(() => {
    let porVencer = 0;
    let vencidos = 0;
    for (const ing of ingredientes) {
      const dias = diasParaVencer(ing.fechaVencimiento);
      if (dias === null) continue;
      if (dias < 0) vencidos++;
      else if (dias <= 7) porVencer++;
    }
    return { total: ingredientes.length, porVencer, vencidos };
  }, [ingredientes]);

  const handlePresionar = (pasillo: { id: PasilloId; label: string }) => {
    navigation.navigate('PasilloCategoriaScreen', {
      pasilloId: pasillo.id,
      pasilloLabel: pasillo.label,
    });
  };

  const renderPasillo = ({ item }: { item: typeof PASILLOS[number] }) => {
    const count = conteoXCategoria[item.id] ?? 0;
    return (
      <TouchableOpacity
        style={s.tile}
        onPress={() => handlePresionar(item)}
        activeOpacity={0.7}
      >
        <View style={s.tileTop}>
          <View style={s.iconoWrap}>
            <MaterialCommunityIcons
              name={item.icono as any}
              size={24}
              color={C.primary}
            />
          </View>
          {count > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeTexto}>{count}</Text>
            </View>
          )}
        </View>
        <Text style={s.tileLabel} numberOfLines={2}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.contenedor}>
      <StatusBar
        barStyle={C.bg === '#0D0F12' ? 'light-content' : 'dark-content'}
        backgroundColor={C.surface}
      />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.titulo}>Despensa</Text>
        <View style={s.headerBtns}>
          <TouchableOpacity
            style={s.btnEscanear}
            onPress={() => navigation.navigate('ScanearBoleta')}
          >
            <Text style={s.btnEscanearTexto}>📄 Boleta</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.fab}
            onPress={() => navigation.navigate('AgregarIngrediente')}
          >
            <Text style={s.fabTexto}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={PASILLOS}
        keyExtractor={(item) => item.id}
        renderItem={renderPasillo}
        numColumns={2}
        columnWrapperStyle={s.columnas}
        contentContainerStyle={s.lista}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Alerta HUD de vencimientos */}
            <VencimientoAlert ingredientes={ingredientes} />

            {/* Stats bento */}
            <View style={s.statsFila}>
              <View style={s.statTile}>
                <Text style={s.statValor}>{stats.total}</Text>
                <Text style={s.statLabel}>ITEMS</Text>
              </View>
              <View style={[s.statTile, stats.porVencer > 0 && { borderColor: C.expiryWarning + '66' }]}>
                <Text style={[s.statValor, stats.porVencer > 0 && { color: C.expiryWarning }]}>
                  {stats.porVencer}
                </Text>
                <Text style={s.statLabel}>POR VENCER</Text>
              </View>
              <View style={[s.statTile, stats.vencidos > 0 && { borderColor: C.expiryCritical + '66' }]}>
                <Text style={[s.statValor, stats.vencidos > 0 && { color: C.expiryCritical }]}>
                  {stats.vencidos}
                </Text>
                <Text style={s.statLabel}>VENCIDOS</Text>
              </View>
            </View>

            <Text style={s.seccionTitulo}>Pasillos</Text>
          </View>
        }
      />
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
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnEscanear: {
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: C.primary,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  btnEscanearTexto: { color: C.primary, fontWeight: '600', fontSize: 13 },
  fab: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabTexto: { color: '#fff', fontSize: 22, fontWeight: '300', lineHeight: 26 },
  lista: { padding: 16, paddingBottom: 32 },
  columnas: { gap: 10 },

  // Stats bento
  statsFila: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statTile: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 2,
  },
  statValor: { fontSize: 22, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: C.textMuted },

  seccionTitulo: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 12 },

  // Tiles de pasillos (bento 2 col)
  tile: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 10,
    gap: 10,
    minHeight: 104,
  },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconoWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: { fontSize: 13, fontWeight: '600', color: C.text, lineHeight: 18 },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeTexto: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
