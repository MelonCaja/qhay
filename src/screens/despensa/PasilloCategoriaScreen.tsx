import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { useDespensa } from '../../hooks/useDespensa';
import { IngredienteCard } from '../../components/despensa/IngredienteCard';

type Props = NativeStackScreenProps<RootStackParamList, 'PasilloCategoriaScreen'>;

export function PasilloCategoriaScreen({ route }: Props) {
  const { pasilloId } = route.params;
  const C = useColors();
  const s = makeStyles(C);
  const { ingredientes, eliminar } = useDespensa();

  const filtrados = useMemo(
    () => ingredientes.filter((i) => i.categoria === pasilloId),
    [ingredientes, pasilloId],
  );

  return (
    <View style={s.contenedor}>
      <StatusBar
        barStyle={C.text === '#F9FAFB' ? 'light-content' : 'dark-content'}
        backgroundColor={C.surface}
      />
      <FlatList
        data={filtrados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.lista}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <IngredienteCard
            ingrediente={item}
            onEliminar={() => eliminar(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={s.vacio}>
            <Text style={s.vacioPrincipal}>Sin productos</Text>
            <Text style={s.vacioSub}>
              Agrega ingredientes con el botón + o escaneando una boleta.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.bg },
  lista: { padding: 16, flexGrow: 1 },
  vacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  vacioPrincipal: {
    fontSize: 17,
    fontWeight: '600',
    color: C.textMuted,
    marginBottom: 8,
  },
  vacioSub: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
