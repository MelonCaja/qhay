import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useColors, ColorPalette } from '../../context/ThemeContext';

interface LoadingSpinnerProps {
  mensaje?: string;
  tamano?: 'small' | 'large';
  pantalla?: boolean;
}

export function LoadingSpinner({ mensaje, tamano = 'large', pantalla = false }: LoadingSpinnerProps) {
  const C = useColors();
  const s = makeStyles(C);
  return (
    <View style={[s.contenedor, pantalla && s.pantalla]}>
      <ActivityIndicator size={tamano} color={C.primary} />
      {mensaje && <Text style={s.mensaje}>{mensaje}</Text>}
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  pantalla: { flex: 1, backgroundColor: C.bg },
  mensaje: { marginTop: 12, color: C.textMuted, fontSize: 14 },
});
