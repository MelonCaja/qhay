import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
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

  return (
    <TouchableOpacity
      style={[
        s.base,
        s[variante],
        s[`t_${tamano}`],
        deshabilitadoFinal && s.disabled,
        estiloContenedor,
      ]}
      onPress={onPress}
      disabled={deshabilitadoFinal}
      activeOpacity={0.75}
    >
      {cargando ? (
        <ActivityIndicator color={variante === 'outline' || variante === 'secondary' ? C.primary : '#fff'} />
      ) : (
        <Text style={[s.text, s[`text_${variante}`], estiloTexto]}>{titulo}</Text>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  base: { borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: C.primary },
  secondary: { backgroundColor: C.primarySoft },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.primary },
  danger: { backgroundColor: C.error },
  t_sm: { paddingVertical: 8, paddingHorizontal: 16 },
  t_md: { paddingVertical: 14, paddingHorizontal: 24 },
  t_lg: { paddingVertical: 18, paddingHorizontal: 32 },
  disabled: { opacity: 0.45 },
  text: { fontWeight: '600', fontSize: 15 },
  text_primary: { color: '#fff' },
  text_secondary: { color: C.primary },
  text_outline: { color: C.primary },
  text_danger: { color: '#fff' },
});
