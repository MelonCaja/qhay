import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, StatusBar, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { RecetaCard } from '../../components/recetas/RecetaCard';
import { useDespensa } from '../../hooks/useDespensa';
import { useRecetas } from '../../hooks/useRecetas';
import { useAuthStore } from '../../store/authStore';
import { Receta } from '../../types/receta';
import { obtenerTagsFitness } from '../../utils/fitnessUtils';

type Tab = 'todas' | 'despensa' | 'faciles' | 'estudiantes' | 'fitness';

const TABS: { id: Tab; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'despensa', label: 'Mi despensa' },
  { id: 'faciles', label: 'Fáciles' },
  { id: 'estudiantes', label: 'Estudiantes' },
  { id: 'fitness', label: '💪 Fitness' },
];

export function RecetasScreen() {
  const C = useColors();
  const s = makeStyles(C);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { usuario } = useAuthStore();
  const { ingredientes } = useDespensa();
  const [tabActiva, setTabActiva] = useState<Tab>('despensa');
  const [recetasComparando, setRecetasComparando] = useState<Receta[]>([]);
  const [modalComparacion, setModalComparacion] = useState(false);

  // Limpiar comparación al cambiar de tab
  useEffect(() => {
    setRecetasComparando([]);
    setModalComparacion(false);
  }, [tabActiva]);

  const { recetas } = useRecetas(ingredientes, {
    tab: tabActiva,
    restricciones: usuario?.restriccionesAlimentarias ?? [],
    tiempoMax: tabActiva === 'todas' ? undefined : usuario?.tiempoCocina,
  });

  const toggleComparar = (receta: Receta) => {
    setRecetasComparando((prev) => {
      if (prev.some((r) => r.id === receta.id)) {
        return prev.filter((r) => r.id !== receta.id);
      }
      if (prev.length >= 2) return prev; // máximo 2
      const nuevas = [...prev, receta];
      if (nuevas.length === 2) setModalComparacion(true);
      return nuevas;
    });
  };

  const limpiarComparacion = () => {
    setRecetasComparando([]);
    setModalComparacion(false);
  };

  const esFitnessTab = tabActiva === 'fitness';

  return (
    <View style={s.contenedor}>
      <StatusBar barStyle={C.text === '#F9FAFB' ? 'light-content' : 'dark-content'} backgroundColor={C.surface} />
      <View style={s.header}>
        <Text style={s.titulo}>Recetas</Text>
        <Text style={s.subtitulo}>{recetas.length} disponibles</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabsScroll}
        contentContainerStyle={s.tabsContenido}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[s.tab, tabActiva === tab.id && s.tabActiva]}
            onPress={() => setTabActiva(tab.id)}
          >
            <Text style={[s.tabTexto, tabActiva === tab.id && s.tabTextoActivo]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Banner comparador (solo en fitness tab) */}
      {esFitnessTab && recetasComparando.length > 0 && (
        <View style={s.comparadorBanner}>
          <View style={{ flex: 1 }}>
            <Text style={s.comparadorTexto}>
              {recetasComparando.length === 1
                ? '1 receta seleccionada — mantén presionada otra para comparar'
                : `Comparando: ${recetasComparando[0].nombre.split(' ').slice(0, 2).join(' ')} vs ${recetasComparando[1].nombre.split(' ').slice(0, 2).join(' ')}`}
            </Text>
          </View>
          {recetasComparando.length === 2 && (
            <TouchableOpacity style={s.comparadorBtn} onPress={() => setModalComparacion(true)}>
              <Text style={s.comparadorBtnTexto}>Ver</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.comparadorLimpiar} onPress={limpiarComparacion}>
            <Text style={s.comparadorLimpiarTexto}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {esFitnessTab && recetasComparando.length === 0 && recetas.length > 0 && (
        <View style={s.comparadorHint}>
          <Text style={s.comparadorHintTexto}>
            💡 Mantén presionada una receta para comparar macros
          </Text>
        </View>
      )}

      {recetas.length === 0 ? (
        <View style={s.vacio}>
          <Text style={s.vacioEmoji}>🍽️</Text>
          <Text style={s.vacioTitulo}>Sin recetas</Text>
          <Text style={s.vacioSub}>
            {tabActiva === 'despensa'
              ? 'Agrega ingredientes a tu despensa para ver qué puedes cocinar'
              : tabActiva === 'fitness'
              ? 'No hay recetas fitness con estos filtros'
              : 'No hay recetas con estos filtros'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={recetas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecetaCard
              receta={item}
              onPress={() => navigation.navigate('DetalleReceta', { receta: item })}
              enComparacion={esFitnessTab && recetasComparando.some((r) => r.id === item.id)}
              onLongPress={esFitnessTab ? () => toggleComparar(item) : undefined}
            />
          )}
          contentContainerStyle={s.lista}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal comparador de macros */}
      <Modal visible={modalComparacion} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modalComparador}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitulo}>⚖️ Comparar macros</Text>
              <TouchableOpacity onPress={limpiarComparacion}>
                <Text style={s.modalCerrar}>✕</Text>
              </TouchableOpacity>
            </View>

            {recetasComparando.length === 2 && (
              <ComparadorGrid
                recetaA={recetasComparando[0]}
                recetaB={recetasComparando[1]}
                C={C}
                s={s}
                onElegir={(receta) => {
                  limpiarComparacion();
                  navigation.navigate('DetalleReceta', { receta });
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Componente interno para la grilla de comparación
function ComparadorGrid({
  recetaA, recetaB, C, s, onElegir,
}: {
  recetaA: Receta;
  recetaB: Receta;
  C: ColorPalette;
  s: ReturnType<typeof makeStyles>;
  onElegir: (receta: Receta) => void;
}) {
  const macrosA = recetaA.macros;
  const macrosB = recetaB.macros;
  const tagsA = obtenerTagsFitness(macrosA);
  const tagsB = obtenerTagsFitness(macrosB);

  const macroRows = [
    { label: 'Proteínas', emoji: '🥩', color: '#4CAF50', valA: macrosA?.proteinas, valB: macrosB?.proteinas },
    { label: 'Carbos', emoji: '🌾', color: '#2196F3', valA: macrosA?.carbohidratos, valB: macrosB?.carbohidratos },
    { label: 'Grasas', emoji: '🫒', color: '#FF9800', valA: macrosA?.grasas, valB: macrosB?.grasas },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Nombres */}
      <View style={s.compFila}>
        <View style={s.compCol}>
          <Text style={s.compNombre} numberOfLines={2}>{recetaA.nombre}</Text>
          {recetaA.calorias != null && (
            <Text style={s.compCal}>🔥 {recetaA.calorias} kcal</Text>
          )}
        </View>
        <View style={s.compDiv} />
        <View style={s.compCol}>
          <Text style={s.compNombre} numberOfLines={2}>{recetaB.nombre}</Text>
          {recetaB.calorias != null && (
            <Text style={s.compCal}>🔥 {recetaB.calorias} kcal</Text>
          )}
        </View>
      </View>

      <View style={s.compSep} />

      {/* Macros */}
      {macroRows.map((row) => {
        const maxVal = Math.max(row.valA ?? 0, row.valB ?? 0, 1);
        const pctA = ((row.valA ?? 0) / maxVal) * 100;
        const pctB = ((row.valB ?? 0) / maxVal) * 100;
        const ganadorA = (row.valA ?? 0) >= (row.valB ?? 0);
        return (
          <View key={row.label} style={s.compMacroFila}>
            <View style={s.compCol}>
              <Text style={[s.compMacroVal, ganadorA && { color: row.color }]}>
                {row.valA != null ? `${row.valA}g` : '—'}
              </Text>
              <View style={s.compBarraFondo}>
                <View style={[s.compBarraRelleno, { width: `${pctA}%` as `${number}%`, backgroundColor: row.color }]} />
              </View>
            </View>
            <View style={s.compMacroLabelCol}>
              <Text style={s.compMacroEmoji}>{row.emoji}</Text>
              <Text style={s.compMacroLabel}>{row.label}</Text>
            </View>
            <View style={s.compCol}>
              <Text style={[s.compMacroVal, !ganadorA && { color: row.color }]}>
                {row.valB != null ? `${row.valB}g` : '—'}
              </Text>
              <View style={s.compBarraFondo}>
                <View style={[s.compBarraRelleno, { width: `${pctB}%` as `${number}%`, backgroundColor: row.color }]} />
              </View>
            </View>
          </View>
        );
      })}

      <View style={s.compSep} />

      {/* Tags */}
      <View style={s.compFila}>
        <View style={s.compCol}>
          {tagsA.map((t) => (
            <View key={t.label} style={[s.compTag, { backgroundColor: t.bgColor }]}>
              <Text style={[s.compTagTexto, { color: t.color }]}>{t.label}</Text>
            </View>
          ))}
          {tagsA.length === 0 && <Text style={s.compSinTags}>Sin tags</Text>}
        </View>
        <View style={s.compDiv} />
        <View style={s.compCol}>
          {tagsB.map((t) => (
            <View key={t.label} style={[s.compTag, { backgroundColor: t.bgColor }]}>
              <Text style={[s.compTagTexto, { color: t.color }]}>{t.label}</Text>
            </View>
          ))}
          {tagsB.length === 0 && <Text style={s.compSinTags}>Sin tags</Text>}
        </View>
      </View>

      <View style={s.compSep} />

      {/* Botones elegir */}
      <View style={s.compFila}>
        <TouchableOpacity style={[s.compElegirBtn, { flex: 1 }]} onPress={() => onElegir(recetaA)}>
          <Text style={s.compElegirTexto}>Cocinar A →</Text>
        </TouchableOpacity>
        <View style={{ width: 10 }} />
        <TouchableOpacity style={[s.compElegirBtn, { flex: 1 }]} onPress={() => onElegir(recetaB)}>
          <Text style={s.compElegirTexto}>Cocinar B →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: C.surface,
  },
  titulo: { fontSize: 24, fontWeight: '700', color: C.text },
  subtitulo: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  tabsScroll: { backgroundColor: C.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  tabsContenido: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: {
    height: 34,
    minWidth: 86,
    paddingHorizontal: 16,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
  tabActiva: { backgroundColor: C.primary },
  tabTexto: { fontSize: 13, color: C.textMuted, fontWeight: '500' },
  tabTextoActivo: { color: '#fff', fontWeight: '600' },
  comparadorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F7FA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#B2EBF2',
  },
  comparadorTexto: { fontSize: 12, color: '#006064', fontWeight: '500', flex: 1 },
  comparadorBtn: { backgroundColor: '#0097A7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  comparadorBtnTexto: { color: '#fff', fontSize: 12, fontWeight: '700' },
  comparadorLimpiar: { padding: 4 },
  comparadorLimpiarTexto: { color: '#006064', fontSize: 16, fontWeight: '700' },
  comparadorHint: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: C.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  comparadorHintTexto: { fontSize: 12, color: C.textMuted, fontStyle: 'italic' },
  lista: { padding: 16 },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  vacioEmoji: { fontSize: 52, marginBottom: 4 },
  vacioTitulo: { fontSize: 19, fontWeight: '700', color: C.text },
  vacioSub: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
  // Modal comparador
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalComparador: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitulo: { fontSize: 18, fontWeight: '700', color: C.text },
  modalCerrar: { fontSize: 20, color: C.textMuted, paddingHorizontal: 4 },
  // Grilla comparación
  compFila: { flexDirection: 'row', gap: 8 },
  compCol: { flex: 1, gap: 6 },
  compDiv: { width: StyleSheet.hairlineWidth, backgroundColor: C.border },
  compSep: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginVertical: 14 },
  compNombre: { fontSize: 14, fontWeight: '700', color: C.text },
  compCal: { fontSize: 13, color: '#E65100', fontWeight: '600' },
  compMacroFila: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  compMacroLabelCol: { width: 56, alignItems: 'center', gap: 2 },
  compMacroEmoji: { fontSize: 15 },
  compMacroLabel: { fontSize: 9, color: C.textMuted, textAlign: 'center' },
  compMacroVal: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 4 },
  compBarraFondo: { height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  compBarraRelleno: { height: '100%', borderRadius: 3 },
  compTag: { borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8, alignSelf: 'flex-start', marginBottom: 4 },
  compTagTexto: { fontSize: 10, fontWeight: '700' },
  compSinTags: { fontSize: 12, color: C.textMuted, fontStyle: 'italic' },
  compElegirBtn: {
    backgroundColor: C.primarySoft,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  compElegirTexto: { color: C.primary, fontWeight: '700', fontSize: 14 },
});
