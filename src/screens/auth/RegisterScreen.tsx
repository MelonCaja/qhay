import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, StatusBar, TouchableOpacity,
} from 'react-native';
import { mostrarAlerta } from '../../utils/alert';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { registrarUsuario } from '../../services/auth';
import { TerminosModal } from '../../components/legal/TerminosModal';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'> };

export function RegisterScreen({ navigation }: Props) {
  const C = useColors();
  const s = makeStyles(C);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [modalTerminos, setModalTerminos] = useState(false);

  const validar = () => {
    const e: Record<string, string> = {};
    if (!nombre.trim()) e.nombre = 'Nombre obligatorio';
    if (!email.trim()) e.email = 'Correo obligatorio';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Correo inválido';
    if (!password) e.password = 'Contraseña obligatoria';
    else if (password.length < 6) e.password = 'Mínimo 6 caracteres';
    if (password !== confirmar) e.confirmar = 'Las contraseñas no coinciden';
    if (!aceptaTerminos) e.terminos = 'Debes aceptar los Términos y Condiciones';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleRegistro = async () => {
    if (!validar()) return;
    setCargando(true);
    try {
      const { requiereConfirmacion } = await registrarUsuario(email.trim(), password, nombre.trim());
      if (requiereConfirmacion) {
        // Supabase no emite sesión hasta confirmar el correo → volver al Login
        mostrarAlerta(
          '¡Cuenta creada! 📧',
          `Te enviamos un correo de verificación a ${email.trim()}. Confírmalo y luego inicia sesión.`,
          [{ text: 'Entendido', onPress: () => navigation.goBack() }]
        );
      }
      // Con confirmación desactivada ya hay sesión: AppNavigator navega solo.
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      const mensaje =
        code === 'user_already_exists' || code === 'email_exists'
          ? 'Ya existe una cuenta con ese correo'
          : code === 'weak_password'
            ? 'La contraseña es demasiado débil (mínimo 6 caracteres)'
            : 'Error al crear la cuenta';
      mostrarAlerta('Error', mensaje);
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle={C.bg === '#0D0F12' ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.titulo}>Crear cuenta</Text>
          <Text style={s.subtitulo}>Empieza a cocinar con lo que tienes</Text>
        </View>
        <View style={s.form}>
          <Input label="Nombre" placeholder="¿Cómo te llamamos?" value={nombre} onChangeText={setNombre} autoCapitalize="words" error={errores.nombre} />
          <Input label="Correo" placeholder="tu@correo.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={errores.email} />
          <Input label="Contraseña" placeholder="Mínimo 6 caracteres" value={password} onChangeText={setPassword} secureTextEntry error={errores.password} />
          <Input label="Confirmar" placeholder="Repite tu contraseña" value={confirmar} onChangeText={setConfirmar} secureTextEntry error={errores.confirmar} />

          {/* Aceptación obligatoria de Términos y Condiciones */}
          <TouchableOpacity
            style={s.terminosFila}
            onPress={() => setAceptaTerminos(!aceptaTerminos)}
            activeOpacity={0.7}
          >
            <View style={[s.checkbox, aceptaTerminos && s.checkboxOn]}>
              {aceptaTerminos && <Text style={s.checkboxMark}>✓</Text>}
            </View>
            <Text style={s.terminosTexto}>
              Acepto los{' '}
              <Text style={s.terminosLink} onPress={() => setModalTerminos(true)}>
                Términos y Condiciones
              </Text>
              , incluido el tratamiento de mis boletas (Ley 19.628)
            </Text>
          </TouchableOpacity>
          {errores.terminos && <Text style={s.terminosError}>{errores.terminos}</Text>}

          <Button titulo="Crear cuenta" onPress={handleRegistro} cargando={cargando} estiloContenedor={s.btn} />
          <Button titulo="¿Ya tienes cuenta? Inicia sesión" onPress={() => navigation.goBack()} variante="outline" estiloContenedor={s.btn} />
        </View>
      </ScrollView>

      <TerminosModal
        visible={modalTerminos}
        onCerrar={() => setModalTerminos(false)}
        onAceptar={() => setAceptaTerminos(true)}
      />
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { paddingVertical: 32, alignItems: 'center' },
  titulo: { fontSize: 28, fontWeight: '800', color: C.text },
  subtitulo: { fontSize: 14, color: C.textMuted, marginTop: 6 },
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
  btn: { marginTop: 10 },
  terminosFila: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 14 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxOn: { backgroundColor: C.primary, borderColor: C.primary },
  checkboxMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  terminosTexto: { flex: 1, fontSize: 12, color: C.textMuted, lineHeight: 18 },
  terminosLink: { color: C.primary, fontWeight: '700', textDecorationLine: 'underline' },
  terminosError: { fontSize: 12, color: C.error, marginTop: 6 },
});
