import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { useColors, ColorPalette } from '../../context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  estilo?: ViewStyle;
  onPress?: () => void;
  elevado?: boolean;
}

export function Card({ children, estilo, onPress, elevado = false }: CardProps) {
  const C = useColors();
  const s = makeStyles(C);

  const contenido = (
    <View style={[s.card, elevado && s.elevado, estilo]}>{children}</View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {contenido}
      </TouchableOpacity>
    );
  }

  return contenido;
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
  },
  elevado: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
});
