import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { recuperarPassword } from '../../services/auth';

interface OlvidePasswordModalProps {
  visible: boolean;
  onCerrar: () => void;
  /** Prellena el correo escrito en el Login, si lo hay */
  emailInicial?: string;
}

/** Bottom sheet de "¿Olvidaste tu contraseña?": pide el correo y dispara
 *  supabase.auth.resetPasswordForEmail. */
export function OlvidePasswordModal({ visible, onCerrar, emailInicial = '' }: OlvidePasswordModalProps) {
  const C = useColors();
  const s = makeStyles(C);
  const [email, setEmail] = useState(emailInicial);
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // El modal vive montado junto al Login: sincronizar el correo al abrirse
  useEffect(() => {
    if (visible) setEmail(emailInicial);
  }, [visible, emailInicial]);

  const cerrar = () => {
    // Resetear para la próxima apertura sin parpadeo mientras anima el cierre
    onCerrar();
    setTimeout(() => { setEnviado(false); setError(undefined); }, 300);
  };

  const enviar = async () => {
    const correo = email.trim();
    if (!/\S+@\S+\.\S+/.test(correo)) {
      setError('Ingresa un correo válido');
      return;
    }
    setError(undefined);
    setCargando(true);
    try {
      await recuperarPassword(correo);
      setEnviado(true);
    } catch (e: any) {
      console.error('[auth] Error resetPasswordForEmail:', e);
      setError(
        e?.code === 'over_email_send_rate_limit'
          ? 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
          : 'No pudimos enviar el correo. Revisa tu conexión e inténtalo de nuevo.'
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={cerrar}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={cerrar} />
        <View style={s.sheet}>
          <View style={s.handle} />
          {enviado ? (
            <>
              <Text style={s.emoji}>📬</Text>
              <Text style={s.titulo}>Revisa tu correo</Text>
              <Text style={s.subtitulo}>
                Te hemos enviado un correo para restablecer tu contraseña.
                Si no lo ves, revisa la carpeta de spam.
              </Text>
              <Button titulo="Entendido" onPress={cerrar} estiloContenedor={s.btn} />
            </>
          ) : (
            <>
              <Text style={s.titulo}>¿Olvidaste tu contraseña?</Text>
              <Text style={s.subtitulo}>
                Ingresa tu correo y te enviaremos un enlace para restablecerla.
              </Text>
              <Input
                label="Correo"
                placeholder="tu@correo.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
                error={error}
              />
              <Button
                titulo="Enviar enlace"
                onPress={enviar}
                cargando={cargando}
                estiloContenedor={s.btn}
              />
              <Button
                titulo="Cancelar"
                onPress={cerrar}
                variante="outline"
                estiloContenedor={s.btnCancelar}
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 22,
    paddingBottom: 34,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.border, alignSelf: 'center', marginBottom: 18,
  },
  emoji: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  titulo: { fontSize: 19, fontWeight: '800', color: C.text, letterSpacing: -0.3, textAlign: 'center' },
  subtitulo: { fontSize: 14, color: C.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 20, lineHeight: 20 },
  btn: { marginTop: 4 },
  btnCancelar: { marginTop: 10, borderWidth: 0 },
});
