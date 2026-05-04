import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Alert, StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { registrarUsuario } from '../../services/auth';

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

  const validar = () => {
    const e: Record<string, string> = {};
    if (!nombre.trim()) e.nombre = 'Nombre obligatorio';
    if (!email.trim()) e.email = 'Correo obligatorio';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Correo inválido';
    if (!password) e.password = 'Contraseña obligatoria';
    else if (password.length < 6) e.password = 'Mínimo 6 caracteres';
    if (password !== confirmar) e.confirmar = 'Las contraseñas no coinciden';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleRegistro = async () => {
    if (!validar()) return;
    setCargando(true);
    try {
      await registrarUsuario(email.trim(), password, nombre.trim());
      Alert.alert(
        '¡Cuenta creada! 📧',
        `Te enviamos un correo de verificación a ${email.trim()}. Revisa tu bandeja de entrada (y spam) antes de continuar.`,
        [{ text: 'Entendido', style: 'default' }]
      );
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      Alert.alert('Error', code === 'auth/email-already-in-use'
        ? 'Ya existe una cuenta con ese correo'
        : 'Error al crear la cuenta');
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle={C.text === '#F9FAFB' ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
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
          <Button titulo="Crear cuenta" onPress={handleRegistro} cargando={cargando} estiloContenedor={s.btn} />
          <Button titulo="¿Ya tienes cuenta? Inicia sesión" onPress={() => navigation.goBack()} variante="outline" estiloContenedor={s.btn} />
        </View>
      </ScrollView>
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
});
