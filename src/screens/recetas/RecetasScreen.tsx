import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { RecetaCard } from '../../components/recetas/RecetaCard';
import { useDespensa } from '../../hooks/useDespensa';
import { useRecetas } from '../../hooks/useRecetas';
import { useAuthStore } from '../../store/authStore';

type Tab = 'todas' | 'despensa' | 'faciles' | 'estudiantes';

const TABS: { id: Tab; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'despensa', label: 'Mi despensa' },
  { id: 'faciles', label: 'Fáciles' },
  { id: 'estudiantes', label: 'Estudiantes' },
];

export function RecetasScreen() {
  const C = useColors();
  const s = makeStyles(C);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { usuario } = useAuthStore();
  const { ingredientes } = useDespensa();
  const [tabActiva, setTabActiva] = useState<Tab>('despensa');

  const { recetas } = useRecetas(ingredientes, {
    tab: tabActiva,
    restricciones: usuario?.restriccionesAlimentarias ?? [],
    // Si la pestaña seleccionada es "Todas", ignoramos el filtro de tiempo del usuario
    tiempoMax: tabActiva === 'todas' ? undefined : usuario?.tiempoCocina,
  });

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

      {recetas.length === 0 ? (
        <View style={s.vacio}>
          <Text style={s.vacioEmoji}>🍽️</Text>
          <Text style={s.vacioTitulo}>Sin recetas</Text>
          <Text style={s.vacioSub}>
            {tabActiva === 'despensa'
              ? 'Agrega ingredientes a tu despensa para ver qué puedes cocinar'
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
            />
          )}
          contentContainerStyle={s.lista}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
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
  lista: { padding: 16 },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  vacioEmoji: { fontSize: 52, marginBottom: 4 },
  vacioTitulo: { fontSize: 19, fontWeight: '700', color: C.text },
  vacioSub: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
});
