import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { suscribirAlerta, BotonAlerta } from '../../utils/alert';

interface EstadoAlerta {
  titulo: string;
  mensaje?: string;
  botones: BotonAlerta[];
}

/**
 * Host visual de mostrarAlerta() en web — móntalo una sola vez cerca de la
 * raíz de la app (ver App.tsx). No renderiza nada en nativo: ahí
 * mostrarAlerta() delega directo a Alert.alert de react-native.
 */
export function WebAlertHost() {
  const C = useColors();
  const s = makeStyles(C);
  const [alerta, setAlerta] = useState<EstadoAlerta | null>(null);

  useEffect(() => suscribirAlerta(setAlerta), []);

  if (!alerta) return null;

  const cerrar = (boton: BotonAlerta) => {
    setAlerta(null);
    boton.onPress?.();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => cerrar(alerta.botones[alerta.botones.length - 1])}>
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.titulo}>{alerta.titulo}</Text>
          {alerta.mensaje ? <Text style={s.mensaje}>{alerta.mensaje}</Text> : null}
          <View style={s.botones}>
            {alerta.botones.map((b, i) => (
              <TouchableOpacity
                key={i}
                style={[s.boton, b.style === 'destructive' && s.botonDestructivo]}
                onPress={() => cerrar(b)}
              >
                <Text style={[s.botonTexto, b.style === 'destructive' && s.botonTextoDestructivo]}>
                  {b.text ?? 'OK'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  titulo: { fontSize: 17, fontWeight: '800', color: C.text },
  mensaje: { fontSize: 14, color: C.textMuted, lineHeight: 20, marginTop: 2 },
  botones: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  boton: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10 },
  botonDestructivo: { backgroundColor: C.critical },
  botonTexto: { fontSize: 14, fontWeight: '700', color: C.primary },
  botonTextoDestructivo: { color: '#fff' },
});
