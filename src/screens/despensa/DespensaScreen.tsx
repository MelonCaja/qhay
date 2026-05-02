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
        style={s.fila}
        onPress={() => handlePresionar(item)}
        activeOpacity={0.7}
      >
        <View style={s.iconoWrap}>
          <MaterialCommunityIcons
            name={item.icono as any}
            size={26}
            color={C.primary}
          />
        </View>
        <Text style={s.label}>{item.label}</Text>
        {count > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeTexto}>{count}</Text>
          </View>
        )}
        <MaterialCommunityIcons name="chevron-right" size={22} color={C.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.contenedor}>
      <StatusBar
        barStyle={C.text === '#F9FAFB' ? 'light-content' : 'dark-content'}
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

      {/* Lista de pasillos */}
      <FlatList
        data={PASILLOS}
        keyExtractor={(item) => item.id}
        renderItem={renderPasillo}
        contentContainerStyle={s.lista}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={s.separador} />}
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
  lista: { paddingVertical: 8 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: C.surface,
  },
  iconoWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: C.text,
  },
  separador: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginLeft: 78,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: 6,
  },
  badgeTexto: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
