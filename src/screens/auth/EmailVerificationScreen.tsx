import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, StatusBar, ActivityIndicator,
} from 'react-native';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';

export function EmailVerificationScreen() {
  const C = useColors();
  const s = makeStyles(C);
  const { usuario, logout, reenviarVerificacion, recargarVerificacion } = useAuth();
  const [verificando, setVerificando] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  const handleYaVerifique = async () => {
    setVerificando(true);
    try {
      const ok = await recargarVerificacion();
      if (!ok) {
        Alert.alert(
          'Aún sin verificar',
          'Haz clic en el enlace del correo que te enviamos y vuelve a intentarlo.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setVerificando(false);
    }
  };

  const handleReenviar = async () => {
    setReenviando(true);
    try {
      await reenviarVerificacion();
      Alert.alert('Correo enviado', 'Revisa tu bandeja de entrada y la carpeta de spam.');
    } catch {
      Alert.alert('Error', 'No se pudo enviar el correo. Intenta más tarde.');
    } finally {
      setReenviando(false);
    }
  };

  return (
    <View style={s.contenedor}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={s.icono}>
        <Text style={s.iconoEmoji}>📧</Text>
      </View>

      <Text style={s.titulo}>Verifica tu correo</Text>
      <Text style={s.descripcion}>
        Enviamos un enlace de verificación a:
      </Text>
      <Text style={s.email}>{usuario?.email}</Text>
      <Text style={s.instruccion}>
        Abre ese correo, haz clic en el enlace y luego vuelve aquí.
        Revisa también tu carpeta de spam.
      </Text>

      <View style={s.acciones}>
        <TouchableOpacity
          style={[s.btnPrimario, verificando && s.btnDeshabilitado]}
          onPress={handleYaVerifique}
          disabled={verificando}
        >
          {verificando
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnPrimarioTexto}>Ya verifiqué mi correo</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.btnSecundario, reenviando && s.btnDeshabilitado]}
          onPress={handleReenviar}
          disabled={reenviando}
        >
          <Text style={s.btnSecundarioTexto}>
            {reenviando ? 'Enviando…' : 'Reenviar correo de verificación'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={logout} style={s.btnSalir}>
          <Text style={s.btnSalirTexto}>Usar otra cuenta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  icono: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconoEmoji: { fontSize: 40 },
  titulo: { fontSize: 26, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 12 },
  descripcion: { fontSize: 15, color: C.textMuted, textAlign: 'center' },
  email: {
    fontSize: 15,
    fontWeight: '700',
    color: C.primary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  instruccion: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 36,
  },
  acciones: { width: '100%', gap: 12 },
  btnPrimario: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  btnPrimarioTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnSecundario: {
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
  },
  btnSecundarioTexto: { color: C.text, fontWeight: '600', fontSize: 15 },
  btnDeshabilitado: { opacity: 0.6 },
  btnSalir: { paddingVertical: 8, alignItems: 'center' },
  btnSalirTexto: { color: C.textMuted, fontSize: 14 },
});
