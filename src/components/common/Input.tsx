import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { useColors, ColorPalette } from '../../context/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icono?: React.ReactNode;
  iconoDerecho?: React.ReactNode;
  onPressDerecho?: () => void;
  estiloContenedor?: ViewStyle;
}

export function Input({
  label,
  error,
  icono,
  iconoDerecho,
  onPressDerecho,
  estiloContenedor,
  ...props
}: InputProps) {
  const C = useColors();
  const s = makeStyles(C);
  const [enfocado, setEnfocado] = useState(false);

  return (
    <View style={[s.contenedor, estiloContenedor]}>
      {label && <Text style={s.label}>{label}</Text>}
      <View style={[s.inputContenedor, enfocado && s.enfocado, !!error && s.conError]}>
        {icono && <View style={s.iconoIzq}>{icono}</View>}
        <TextInput
          style={[s.input, icono ? s.inputConIcono : undefined]}
          placeholderTextColor={C.textMuted}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          {...props}
        />
        {iconoDerecho && (
          <TouchableOpacity style={s.iconoDer} onPress={onPressDerecho}>
            {iconoDerecho}
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputContenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.surface,
  },
  enfocado: { borderColor: C.primary },
  conError: { borderColor: C.error },
  input: { flex: 1, paddingVertical: 13, paddingHorizontal: 14, fontSize: 16, color: C.text },
  inputConIcono: { paddingLeft: 4 },
  iconoIzq: { paddingLeft: 12 },
  iconoDer: { paddingRight: 12 },
  error: { color: C.error, fontSize: 12, marginTop: 4 },
});
