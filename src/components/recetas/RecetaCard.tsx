import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Receta } from '../../types/receta';
import { useColors, ColorPalette } from '../../context/ThemeContext';

interface RecetaCardProps {
  receta: Receta;
  onPress: () => void;
  horizontal?: boolean;
}

export function RecetaCard({ receta, onPress, horizontal = false }: RecetaCardProps) {
  const C = useColors();
  const s = makeStyles(C);
  const coincidencia = receta.porcentajeCoincidencia ?? 0;

  const colorCoincidencia =
    coincidencia >= 80 ? C.success :
    coincidencia >= 40 ? C.warning :
    C.textMuted;

  const colorDificultad =
    receta.dificultad === 'facil' ? C.success :
    receta.dificultad === 'media' ? C.warning :
    C.error;

  return (
    <TouchableOpacity
      style={[s.card, horizontal && s.cardH]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[s.foto, horizontal && s.fotoH]}>
        <Text style={s.emoji}>🍽️</Text>
      </View>
      <View style={[s.info, horizontal && s.infoH]}>
        <Text style={s.nombre} numberOfLines={2}>{receta.nombre}</Text>
        <View style={s.fila}>
          <Text style={s.meta}>⏱ {receta.tiempoPreparacion} min</Text>
          <Text style={[s.dificultad, { color: colorDificultad }]}>
            {receta.dificultad}
          </Text>
        </View>
        {coincidencia > 0 && (
          <View style={s.barraFila}>
            <View style={s.barraFondo}>
              <View style={[s.barraRelleno, { width: `${coincidencia}%` as `${number}%`, backgroundColor: colorCoincidencia }]} />
            </View>
            <Text style={[s.barraTexto, { color: colorCoincidencia }]}>{coincidencia}%</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardH: { width: 190, marginBottom: 0, marginRight: 12 },
  foto: { height: 130, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  fotoH: { height: 100 },
  emoji: { fontSize: 44 },
  info: { padding: 12 },
  infoH: { padding: 10 },
  nombre: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meta: { fontSize: 12, color: C.textMuted },
  dificultad: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  barraFila: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  barraFondo: { flex: 1, height: 3, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  barraRelleno: { height: '100%', borderRadius: 2 },
  barraTexto: { fontSize: 11, fontWeight: '600', minWidth: 28 },
});
