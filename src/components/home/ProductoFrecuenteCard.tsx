import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ingrediente } from '../../types/ingrediente';
import { useColors, ColorPalette } from '../../context/ThemeContext';

// Mapa visual por categoría — mismo esquema que IngredienteCard
const VISUAL: Record<string, { emoji: string; bg: string }> = {
  frutas_verduras:  { emoji: '🥦', bg: '#E8F5E9' },
  lacteos:          { emoji: '🥛', bg: '#E3F2FD' },
  quesos_fiambres:  { emoji: '🧀', bg: '#FFF8E1' },
  despensa:         { emoji: '🫙', bg: '#F3E5F5' },
  carnes_pescados:  { emoji: '🥩', bg: '#FFEBEE' },
  panaderia:        { emoji: '🍞', bg: '#FFF3E0' },
  bebidas:          { emoji: '🧃', bg: '#E0F7FA' },
  snacks:           { emoji: '🍪', bg: '#FBE9E7' },
  limpieza:         { emoji: '🧹', bg: '#E8EAF6' },
  cuidado_personal: { emoji: '🧴', bg: '#FCE4EC' },
  mascotas:         { emoji: '🐾', bg: '#F9FBE7' },
  hogar:            { emoji: '🏠', bg: '#ECEFF1' },
  farmacia:         { emoji: '💊', bg: '#E8F5E9' },
};
const DEFAULT_VISUAL = { emoji: '🛒', bg: '#F5F5F5' };

interface Props {
  ingrediente: Ingrediente;
  onAgregar: (ingrediente: Ingrediente) => void;
  onBuscar: (nombre: string) => void;
}

export function ProductoFrecuenteCard({ ingrediente, onAgregar, onBuscar }: Props) {
  const C = useColors();
  const s = makeStyles(C);
  const visual = ingrediente.categoria
    ? (VISUAL[ingrediente.categoria] ?? DEFAULT_VISUAL)
    : DEFAULT_VISUAL;

  const [imgError, setImgError] = useState(false);
  const imagenSrc = ingrediente.imageUrl || ingrediente.foto;

  return (
    <TouchableOpacity
      style={s.card}
      onPress={() => onBuscar(ingrediente.nombre)}
      activeOpacity={0.75}
    >
      {/* Imagen / emoji */}
      <View style={[s.imgBox, { backgroundColor: visual.bg }]}>
        {imagenSrc && !imgError ? (
          <Image
            source={imagenSrc}
            style={s.img}
            contentFit="contain"
            transition={150}
            onError={() => setImgError(true)}
          />
        ) : (
          <Text style={s.emoji}>{visual.emoji}</Text>
        )}

        {/* Badge de frecuencia */}
        {(ingrediente.frecuenciaUso ?? 0) > 1 && (
          <View style={s.badge}>
            <Text style={s.badgeTexto}>×{ingrediente.frecuenciaUso}</Text>
          </View>
        )}
      </View>

      {/* Nombre */}
      <Text style={s.nombre} numberOfLines={2}>{ingrediente.nombre}</Text>

      {/* Botón rápido + */}
      <TouchableOpacity
        style={s.btnAgregar}
        onPress={() => onAgregar(ingrediente)}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <Text style={s.btnAgregarTexto}>+</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  card: {
    width: 110,
    marginRight: 10,
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 10,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  imgBox: {
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 7,
    position: 'relative',
  },
  img: { width: '100%', height: '100%' },
  emoji: { fontSize: 28 },
  badge: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: C.primary,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeTexto: { color: '#fff', fontSize: 9, fontWeight: '800' },
  nombre: {
    fontSize: 12,
    fontWeight: '600',
    color: C.text,
    textAlign: 'center',
    lineHeight: 16,
    minHeight: 32,
  },
  btnAgregar: {
    marginTop: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAgregarTexto: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '300',
    lineHeight: 24,
  },
});
