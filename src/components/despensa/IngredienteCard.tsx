import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ingrediente } from '../../types/ingrediente';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { estadoVencimiento, textoVencimiento } from '../../utils/fechaHelper';

// ── Mapa visual por categoría (fallback cuando no hay imageUrl) ────────────────
const CATEGORIA_VISUAL: Record<string, { emoji: string; bgColor: string }> = {
  frutas_verduras:  { emoji: '🥦', bgColor: '#E8F5E9' },
  lacteos:          { emoji: '🥛', bgColor: '#E3F2FD' },
  quesos_fiambres:  { emoji: '🧀', bgColor: '#FFF8E1' },
  despensa:         { emoji: '🫙', bgColor: '#F3E5F5' },
  carnes_pescados:  { emoji: '🥩', bgColor: '#FFEBEE' },
  panaderia:        { emoji: '🍞', bgColor: '#FFF3E0' },
  bebidas:          { emoji: '🧃', bgColor: '#E0F7FA' },
  snacks:           { emoji: '🍪', bgColor: '#FBE9E7' },
  limpieza:         { emoji: '🧹', bgColor: '#E8EAF6' },
  cuidado_personal: { emoji: '🧴', bgColor: '#FCE4EC' },
  mascotas:         { emoji: '🐾', bgColor: '#F9FBE7' },
  hogar:            { emoji: '🏠', bgColor: '#ECEFF1' },
  farmacia:         { emoji: '💊', bgColor: '#E8F5E9' },
};
const VISUAL_DEFAULT = { emoji: '🛒', bgColor: '#F5F5F5' };

function getVisual(ingrediente: Ingrediente) {
  return ingrediente.categoria
    ? (CATEGORIA_VISUAL[ingrediente.categoria] ?? VISUAL_DEFAULT)
    : VISUAL_DEFAULT;
}

interface IngredienteCardProps {
  ingrediente: Ingrediente;
  onEliminar: () => void;
}

export function IngredienteCard({ ingrediente, onEliminar }: IngredienteCardProps) {
  const C = useColors();
  const s = makeStyles(C);
  const estado = estadoVencimiento(ingrediente.fechaVencimiento);
  const [imgError, setImgError] = useState(false);

  const colorVencimiento =
    estado === 'ok'      ? C.expiryOk :
    estado === 'proximo' ? C.expiryWarning :
    C.expiryCritical;

  const imagenSrc = ingrediente.imageUrl || ingrediente.foto;
  const visual    = getVisual(ingrediente);

  return (
    <View style={s.card}>
      {/* Indicador de vencimiento — línea fina en el borde izquierdo */}
      <View style={[s.indicador, { backgroundColor: colorVencimiento }]} />

      {/* Thumbnail del producto */}
      <View style={[s.thumb, { backgroundColor: visual.bgColor }]}>
        {imagenSrc && !imgError ? (
          <Image
            source={imagenSrc}
            style={s.thumbImg}
            contentFit="contain"
            transition={150}
            onError={() => setImgError(true)}
          />
        ) : (
          <Text style={s.thumbEmoji}>{visual.emoji}</Text>
        )}
      </View>

      {/* Información del ingrediente */}
      <View style={s.info}>
        <Text style={s.nombre} numberOfLines={1}>{ingrediente.nombre}</Text>

        <Text style={s.meta}>
          {[ingrediente.marca, `${ingrediente.cantidad} ${ingrediente.unidad}`]
            .filter(Boolean)
            .join(' · ')}
        </Text>

        {ingrediente.fechaVencimiento && (
          <Text style={[s.vencimiento, { color: colorVencimiento }]}>
            {textoVencimiento(ingrediente.fechaVencimiento)}
          </Text>
        )}

        {ingrediente.supermercado && (
          <Text style={s.supermercado}>{ingrediente.supermercado}</Text>
        )}
      </View>

      {/* Botón eliminar */}
      <TouchableOpacity
        style={s.botonEliminar}
        onPress={onEliminar}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={s.textoEliminar}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  // Franja de vencimiento — 3px, izquierda
  indicador: {
    width: 3,
    alignSelf: 'stretch',
  },
  // Thumbnail 54×54
  thumb: {
    width: 54,
    height: 54,
    margin: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbEmoji: {
    fontSize: 26,
  },
  // Info
  info: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 4,
  },
  nombre: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    color: C.textMuted,
  },
  vencimiento: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
  },
  supermercado: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 1,
  },
  // Eliminar
  botonEliminar: {
    padding: 16,
  },
  textoEliminar: {
    color: C.textMuted,
    fontSize: 15,
  },
});
