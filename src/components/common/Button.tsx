import React, { useRef } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { useColors, ColorPalette } from '../../context/ThemeContext';

interface ButtonProps {
  titulo: string;
  onPress: () => void;
  variante?: 'primary' | 'secondary' | 'outline' | 'danger';
  cargando?: boolean;
  deshabilitado?: boolean;
  estiloContenedor?: ViewStyle;
  estiloTexto?: TextStyle;
  tamano?: 'sm' | 'md' | 'lg';
}

/**
 * Botón con micro-interacción (escala + opacidad al presionar).
 * primary: flúor sólido con texto oscuro de alto contraste.
 * secondary: bloque oscuro con borde brillante.
 */
export function Button({
  titulo,
  onPress,
  variante = 'primary',
  cargando = false,
  deshabilitado = false,
  estiloContenedor,
  estiloTexto,
  tamano = 'md',
}: ButtonProps) {
  const C = useColors();
  const deshabilitadoFinal = deshabilitado || cargando;
  const s = makeStyles(C);
  const escala = useRef(new Animated.Value(1)).current;

  const animar = (to: number) =>
    Animated.spring(escala, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 4 }).start();

  const spinnerColor =
    variante === 'primary' ? C.onPrimary
    : variante === 'danger' ? '#fff'
    : C.primary;

  return (
    <Animated.View style={[{ transform: [{ scale: escala }] }, estiloContenedor]}>
      <Pressable
        style={({ pressed }) => [
          s.base,
          s[variante],
          s[`t_${tamano}`],
          pressed && s.pressed,
          deshabilitadoFinal && s.disabled,
        ]}
        onPress={onPress}
        onPressIn={() => animar(0.97)}
        onPressOut={() => animar(1)}
        disabled={deshabilitadoFinal}
      >
        {cargando ? (
          <ActivityIndicator color={spinnerColor} />
        ) : (
          <Text style={[s.text, s[`text_${variante}`], estiloTexto]}>{titulo}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  base: { borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },
  primary: { backgroundColor: C.primary },
  secondary: {
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.borderBright,
  },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.primary },
  danger: { backgroundColor: C.critical },
  t_sm: { paddingVertical: 8, paddingHorizontal: 16 },
  t_md: { paddingVertical: 14, paddingHorizontal: 24 },
  t_lg: { paddingVertical: 18, paddingHorizontal: 32 },
  disabled: { opacity: 0.45 },
  text: { fontWeight: '700', fontSize: 15 },
  text_primary: { color: C.onPrimary },
  text_secondary: { color: C.primary },
  text_outline: { color: C.primary },
  text_danger: { color: '#fff' },
});
