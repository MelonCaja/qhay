import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Receta } from '../../types/receta';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { obtenerTagsFitness, getRecetaVisual } from '../../utils/fitnessUtils';

interface RecetaCardProps {
  receta: Receta;
  onPress: () => void;
  horizontal?: boolean;
  enComparacion?: boolean;
  onLongPress?: () => void;
}

export function RecetaCard({ receta, onPress, horizontal = false, enComparacion, onLongPress }: RecetaCardProps) {
  const C = useColors();
  const s = makeStyles(C);
  const coincidencia = receta.porcentajeCoincidencia ?? 0;
  const tagsFitness = obtenerTagsFitness(receta.macros);
  const visual = getRecetaVisual(receta);
  const [imgError, setImgError] = useState(false);

  // Prioridad: imageUrl explícita > foto > imagen de referencia por categoría (TheMealDB)
  const imageSource = receta.imageUrl || receta.foto || visual.defaultImageUrl;

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
      style={[s.card, horizontal && s.cardH, enComparacion && s.cardSeleccionada]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.8}
    >
      {enComparacion && (
        <View style={s.comparacionOverlay}>
          <Text style={s.comparacionCheck}>✓</Text>
        </View>
      )}

      {/* Contenedor de imagen con dimensiones explícitas */}
      <View style={[s.foto, horizontal && s.fotoH, { backgroundColor: visual.bgColor }]}>
        {imageSource && !imgError ? (
          <Image
            source={imageSource}
            style={s.fotoImagen}
            contentFit="cover"
            transition={200}
            onLoad={() => console.log('[RecetaCard:load]', receta.nombre)}
            onError={() => {
              console.error('[RecetaCard:error]', receta.nombre, imageSource);
              setImgError(true);
            }}
          />
        ) : (
          <Text style={s.emoji}>{visual.emoji}</Text>
        )}
        {receta.esFitness && (
          <View style={s.badgeFitnessHero}>
            <Text style={s.badgeFitnessHeroTexto}>💪</Text>
          </View>
        )}
      </View>

      <View style={[s.info, horizontal && s.infoH]}>
        <Text style={s.nombre} numberOfLines={2}>{receta.nombre}</Text>

        <View style={s.fila}>
          <Text style={s.meta}>⏱ {receta.tiempoPreparacion} min</Text>
          <Text style={[s.dificultad, { color: colorDificultad }]}>
            {receta.dificultad}
          </Text>
          {receta.calorias != null && (
            <Text style={s.calorias}>🔥 {receta.calorias} kcal</Text>
          )}
        </View>

        {!horizontal && tagsFitness.length > 0 && (
          <View style={s.tagsFila}>
            {tagsFitness.map((tag) => (
              <View key={tag.label} style={[s.tag, { backgroundColor: tag.bgColor }]}>
                <Text style={[s.tagTexto, { color: tag.color }]}>{tag.label}</Text>
              </View>
            ))}
          </View>
        )}

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
  cardSeleccionada: {
    borderWidth: 2.5,
    borderColor: '#0097A7',
    shadowColor: '#0097A7',
    shadowOpacity: 0.25,
    elevation: 6,
  },
  comparacionOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0097A7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparacionCheck: { color: '#fff', fontSize: 14, fontWeight: '700' },
  // Dimensiones explícitas — expo-image necesita width/height en el estilo, no en el padre
  foto: {
    height: 130,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fotoH: { height: 100 },
  // La imagen ocupa todo el contenedor de forma explícita
  fotoImagen: {
    width: '100%',
    height: '100%',
  },
  emoji: { fontSize: 44 },
  badgeFitnessHero: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeFitnessHeroTexto: { fontSize: 13 },
  info: { padding: 12 },
  infoH: { padding: 10 },
  nombre: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  meta: { fontSize: 12, color: C.textMuted },
  dificultad: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  calorias: { fontSize: 11, color: C.textMuted },
  tagsFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tag: { borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8 },
  tagTexto: { fontSize: 10, fontWeight: '700' },
  barraFila: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  barraFondo: { flex: 1, height: 3, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  barraRelleno: { height: '100%', borderRadius: 2 },
  barraTexto: { fontSize: 11, fontWeight: '600', minWidth: 28 },
});
