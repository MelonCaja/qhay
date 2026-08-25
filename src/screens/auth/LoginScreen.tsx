import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { mostrarAlerta } from '../../utils/alert';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { OlvidePasswordModal } from '../../components/auth/OlvidePasswordModal';
// services/auth ya llama WebBrowser.maybeCompleteAuthSession() a nivel de
// módulo — no repetirlo aquí (se importa igual, transitivamente).
import { iniciarSesion, loginConGoogle, reenviarVerificacion } from '../../services/auth';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'> };

export function LoginScreen({ navigation }: Props) {
  const C = useColors();
  const s = makeStyles(C);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [modalPassword, setModalPassword] = useState(false);
  const [errores, setErrores] = useState<{ email?: string; password?: string }>({});

  // OAuth vía navegador contra Supabase (solo Web Client ID, configurado en
  // el dashboard): funciona en Expo Go/Dev Client sin client IDs nativos.
  const handleGoogleLogin = async () => {
    setCargando(true);
    try {
      await loginConGoogle();
      // null = usuario canceló el navegador → sin alerta, sin sesión.
      // Con sesión, AppNavigator navega solo al poblarse el usuario.
    } catch (error) {
      console.error('[login] Error Google:', error);
      mostrarAlerta('Error', 'No pudimos iniciar sesión con Google. Inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  const validar = () => {
    const e: typeof errores = {};
    if (!email.trim()) e.email = 'Correo obligatorio';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Correo inválido';
    if (!password) e.password = 'Contraseña obligatoria';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    try {
      if (!validar()) return;
      setCargando(true);
      await iniciarSesion(email.trim(), password);
      // La navegación al Home/Onboarding la resuelve AppNavigator al
      // poblarse el usuario (useAuth incluye fallback si Firestore falla).
    } catch (error: any) {
      console.error('[login] Error email/pass:', error);
      const code: string | undefined = error?.code;
      if (code === 'email_not_confirmed') {
        mostrarAlerta(
          'Correo sin verificar',
          'Debes confirmar tu correo antes de entrar. Revisa tu bandeja de entrada (y spam).',
          [
            { text: 'Reenviar correo', onPress: () => reenviarVerificacion(email.trim()).catch(() => {}) },
            { text: 'OK', style: 'default' },
          ]
        );
      } else {
        const mensaje = code === 'invalid_credentials'
          ? 'No existe una cuenta con ese correo o la contraseña es incorrecta.'
          : `Error al iniciar sesión${code ? ` (${code})` : ''}.`;
        mostrarAlerta('Error', mensaje);
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle={C.bg === '#0D0F12' ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <View style={s.logoBloque}>
            <Text style={s.logo}>Qhay</Text>
          </View>
          <Text style={s.slogan}>¿Qué hay para cocinar hoy?</Text>
        </View>

        <View style={s.form}>
          <Text style={s.titulo}>Iniciar sesión</Text>
          <Input
            label="Correo"
            placeholder="tu@correo.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errores.email}
          />
          <Input
            label="Contraseña"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!mostrar}
            autoComplete="password"
            error={errores.password}
            iconoDerecho={<Text style={{ fontSize: 16 }}>{mostrar ? '🙈' : '👁️'}</Text>}
            onPressDerecho={() => setMostrar(!mostrar)}
          />
          <TouchableOpacity onPress={() => setModalPassword(true)} hitSlop={{ top: 8, bottom: 8 }}>
            <Text style={s.olvidePassword}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
          <Button titulo="Iniciar sesión" onPress={handleLogin} cargando={cargando} estiloContenedor={s.btn} />
          
          <View style={s.separador}>
            <View style={s.linea} />
            <Text style={s.separadorTexto}>O continúa con</Text>
            <View style={s.linea} />
          </View>

          <TouchableOpacity
            style={s.btnGoogle}
            onPress={handleGoogleLogin}
            disabled={cargando}
          >
            <Text style={s.btnGoogleEmoji}>G</Text>
            <Text style={s.btnGoogleTexto}>Continuar con Google</Text>
          </TouchableOpacity>

          <Button
            titulo="¿No tienes cuenta? Regístrate"
            onPress={() => navigation.navigate('Register')}
            variante="outline"
            estiloContenedor={s.btnRegistro}
          />
        </View>
      </ScrollView>

      <OlvidePasswordModal
        visible={modalPassword}
        onCerrar={() => setModalPassword(false)}
        emailInicial={email.trim()}
      />
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, padding: 20, justifyContent: 'center' },
  header: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  logoBloque: {
    backgroundColor: C.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.borderBright,
    paddingVertical: 18,
    paddingHorizontal: 34,
  },
  logo: { fontSize: 40, fontWeight: '800', color: C.primary, letterSpacing: -1.5 },
  slogan: { fontSize: 14, color: C.textMuted, textAlign: 'center' },
  form: {
    backgroundColor: C.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    padding: 22,
  },
  titulo: { fontSize: 19, fontWeight: '800', color: C.text, marginBottom: 18, letterSpacing: -0.3 },
  olvidePassword: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: -4,
  },
  btn: { marginTop: 10 },
  btnRegistro: { marginTop: 14, borderWidth: 0 },
  separador: { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  linea: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.border },
  separadorTexto: { color: C.textMuted, fontSize: 12, paddingHorizontal: 12, letterSpacing: 0.3 },
  btnGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
    borderRadius: 14,
  },
  btnGoogleEmoji: { fontSize: 17, marginRight: 10, fontWeight: '800', color: '#DB4437' },
  btnGoogleTexto: { fontSize: 15, fontWeight: '600', color: C.text },
});
