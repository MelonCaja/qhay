import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { iniciarSesion, loginConGoogle } from '../../services/auth';

WebBrowser.maybeCompleteAuthSession();

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'> };

export function LoginScreen({ navigation }: Props) {
  const C = useColors();
  const s = makeStyles(C);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errores, setErrores] = useState<{ email?: string; password?: string }>({});

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '977133613009-q39ksiure7sfropd4lk1etm2at431885.apps.googleusercontent.com', // Reemplazar con el tuyo de Firebase
    iosClientId: '977133613009-q39ksiure7sfropd4lk1etm2at431885.apps.googleusercontent.com', // Reemplazar con el tuyo
    androidClientId: '977133613009-q39ksiure7sfropd4lk1etm2at431885.apps.googleusercontent.com', // Reemplazar con el tuyo
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    }
  }, [response]);

  const handleGoogleLogin = async (idToken: string) => {
    setCargando(true);
    try {
      await loginConGoogle(idToken);
    } catch (error) {
      console.error('[login] Error Google:', error);
      Alert.alert('Error', 'No pudimos iniciar sesión con Google.');
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
    // ⚠️ TODO(debug): try/catch global + alertas de auditoría — limpiar tras verificar
    try {
      if (!validar()) return;

      Alert.alert('DEBUG', 'Intentando loguear...');
      setCargando(true);

      const user = await iniciarSesion(email.trim(), password);
      Alert.alert('DEBUG', `Firebase Auth OK: uid ${user.uid} — esperando perfil/navegación`);
    } catch (error: any) {
      const code: string | undefined = error?.code;
      // Usuario inexistente en Firebase Auth: avisar, no colgarse
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        Alert.alert(
          'ERROR ENCONTRADO',
          `${code}: No existe una cuenta con ese correo o la contraseña es incorrecta.`
        );
      } else {
        Alert.alert('ERROR ENCONTRADO', `${code ?? 'sin-code'}: ${String(error?.message ?? error)}`);
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle={C.text === '#F9FAFB' ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.logo}>Qhay</Text>
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
          <Button titulo="Iniciar sesión" onPress={handleLogin} cargando={cargando} estiloContenedor={s.btn} />
          
          <View style={s.separador}>
            <View style={s.linea} />
            <Text style={s.separadorTexto}>O continúa con</Text>
            <View style={s.linea} />
          </View>

          <TouchableOpacity 
            style={s.btnGoogle} 
            onPress={() => promptAsync()} 
            disabled={!request || cargando}
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
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', paddingVertical: 48 },
  logo: { fontSize: 42, fontWeight: '800', color: C.primary, letterSpacing: -1 },
  slogan: { fontSize: 15, color: C.textMuted, marginTop: 6, textAlign: 'center' },
  form: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  titulo: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 20 },
  btn: { marginTop: 10 },
  btnRegistro: { marginTop: 16, borderWidth: 0 },
  separador: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  linea: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.border },
  separadorTexto: { color: C.textMuted, fontSize: 13, paddingHorizontal: 12 },
  btnGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnGoogleEmoji: { fontSize: 18, marginRight: 10, fontWeight: '800', color: '#DB4437' },
  btnGoogleTexto: { fontSize: 15, fontWeight: '600', color: C.text },
});
