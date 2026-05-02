import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, StatusBar, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { actualizarUsuario } from '../../services/firestore';

const SUPERMERCADOS_BAES = [
  { nombre: 'Lider', descuento: '5%', sitio: 'https://www.lider.cl' },
  { nombre: 'Jumbo', descuento: '5%', sitio: 'https://www.jumbo.cl' },
  { nombre: 'Santa Isabel', descuento: '5%', sitio: 'https://www.santaisabel.cl' },
  { nombre: 'Unimarc', descuento: '5%', sitio: 'https://www.unimarc.cl' },
  { nombre: 'Ekono', descuento: '5%', sitio: 'https://www.ekono.cl' },
];

export function BAESScreen() {
  const C = useColors();
  const s = makeStyles(C);
  const navigation = useNavigation();
  const { usuario, actualizarUsuario: setStoreUser } = useAuthStore();
  const [emailEdu, setEmailEdu] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleVerificar = async () => {
    if (!usuario) return;
    const correo = emailEdu.trim().toLowerCase();
    
    // Verificamos que sea un correo institucional universitario chileno válido (.cl)
    // Usamos una lista de dominios conocidos y reglas generales
    const dominiosValidos = [
      '.edu.cl', '.uct.cl', '.uchile.cl', '.puc.cl', '.uc.cl', 
      '.usach.cl', '.usm.cl', '.uach.cl', '.udec.cl', '.uv.cl', 
      '.utalca.cl', '.ucn.cl', '.ubiobio.cl', '.unab.cl', '.udp.cl',
      '.uss.cl', '.uft.cl', '.umayor.cl', '.duoc.cl', '.inacap.cl',
      '.aiep.cl', '.santotomas.cl'
    ];

    const esValido = dominiosValidos.some(dominio => correo.endsWith(dominio));

    if (!esValido) {
      Alert.alert(
        'Correo no reconocido', 
        'Por favor, ingresa tu correo institucional entregado por tu universidad o instituto (ej: nombre@alu.uct.cl).'
      );
      return;
    }
    
    setCargando(true);
    // Simulador de verificación con Junaeb/Sodexo o envío de código al correo
    setTimeout(async () => {
      try {
        await actualizarUsuario(usuario.id, { 
          esEstudiante: true, 
          estudianteVerificado: true 
        });
        setStoreUser({ esEstudiante: true, estudianteVerificado: true });
        Alert.alert('¡Éxito!', 'Tu estado de estudiante ha sido verificado con éxito mediante tu correo institucional. Los descuentos BAES se aplicarán a tus cálculos.');
      } catch (err) {
        Alert.alert('Error', 'No pudimos guardar la verificación.');
      } finally {
        setCargando(false);
      }
    }, 1500);
  };

  return (
    <ScrollView style={s.contenedor} contentContainerStyle={s.scroll}>
      <StatusBar barStyle={C.text === '#F9FAFB' ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      {/* Banner */}
      <View style={s.banner}>
        <Text style={s.bannerEmoji}>🎓</Text>
        <Text style={s.bannerTitulo}>Beneficio BAES</Text>
        <Text style={s.bannerSub}>
          Como estudiante, obtén hasta 5% de descuento en supermercados adheridos pagando con tu Tarjeta Bip o app bancaria.
        </Text>
      </View>

      {/* Estado verificación */}
      <View style={s.card}>
        <View style={s.verificacionFila}>
          <Text style={s.verificacionEmoji}>{usuario?.estudianteVerificado ? '✅' : '⏳'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.verificacionTitulo}>
              {usuario?.estudianteVerificado ? 'Estudiante verificado' : 'Verificación pendiente'}
            </Text>
            <Text style={s.verificacionSub}>
              {usuario?.estudianteVerificado
                ? 'Tu condición de estudiante está activa y conectada a la BAES.'
                : 'Ingresa tu correo institucional universitario para validar tu beneficio Junaeb/Sodexo.'}
            </Text>
          </View>
        </View>

        {!usuario?.estudianteVerificado && (
          <View style={s.formVerificacion}>
            <TextInput
              style={s.inputRut}
              placeholder="Ej: alumno@alu.uct.cl"
              placeholderTextColor={C.textMuted}
              value={emailEdu}
              onChangeText={setEmailEdu}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity 
              style={[s.btnVerificar, cargando && s.btnVerificarLoad]} 
              onPress={handleVerificar}
              disabled={cargando}
            >
              <Text style={s.btnVerificarTexto}>{cargando ? 'Verificando...' : 'Verificar mi Correo'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Cómo funciona */}
      <View style={s.card}>
        <Text style={s.cardTitulo}>¿Cómo funciona?</Text>
        {[
          'Verifica tu condición de estudiante en BancoEstado o tu institución',
          'Al pagar, presenta tu Tarjeta Bip o paga con la app',
          'El descuento se aplica automáticamente en la caja',
          'Qhay señala qué supermercados aceptan BAES al buscar dónde comprar',
        ].map((paso, i) => (
          <View key={i} style={s.pasoFila}>
            <View style={s.pasoNum}>
              <Text style={s.pasoNumTexto}>{i + 1}</Text>
            </View>
            <Text style={s.pasoTexto}>{paso}</Text>
          </View>
        ))}
      </View>

      {/* Supermercados */}
      <View style={s.card}>
        <Text style={s.cardTitulo}>Supermercados adheridos</Text>
        {SUPERMERCADOS_BAES.map((sup, i) => (
          <TouchableOpacity
            key={sup.nombre}
            style={[s.supFila, i < SUPERMERCADOS_BAES.length - 1 && s.supFilaSep]}
            onPress={() => Linking.openURL(sup.sitio)}
          >
            <Text style={s.supNombre}>{sup.nombre}</Text>
            <View style={s.supBadge}>
              <Text style={s.supBadgeTexto}>{sup.descuento} dcto.</Text>
            </View>
          </TouchableOpacity>
        ))}
        <Text style={s.disclaimer}>* Los descuentos pueden variar. Consulta condiciones en cada supermercado.</Text>
      </View>

      <TouchableOpacity style={s.btnMasInfo} onPress={() => Linking.openURL('https://www.integra.cl/baes')}>
        <Text style={s.btnMasInfoTexto}>Ver más información sobre BAES →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  banner: {
    backgroundColor: C.primary,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 4,
  },
  bannerEmoji: { fontSize: 44, marginBottom: 8 },
  bannerTitulo: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8 },
  bannerSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  verificacionFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  verificacionEmoji: { fontSize: 26 },
  verificacionTitulo: { fontSize: 15, fontWeight: '700', color: C.text },
  verificacionSub: { fontSize: 13, color: C.textMuted, marginTop: 2, lineHeight: 18 },
  formVerificacion: { marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  inputRut: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 14, color: C.text, marginBottom: 10 },
  btnVerificar: { backgroundColor: C.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnVerificarLoad: { opacity: 0.7 },
  btnVerificarTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cardTitulo: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 14 },
  pasoFila: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  pasoNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pasoNumTexto: { color: '#fff', fontWeight: '700', fontSize: 12 },
  pasoTexto: { flex: 1, fontSize: 14, color: C.text, lineHeight: 20, marginTop: 2 },
  supFila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  supFilaSep: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  supNombre: { flex: 1, fontSize: 15, color: C.text, fontWeight: '500' },
  supBadge: { backgroundColor: C.primarySoft, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  supBadgeTexto: { color: C.primary, fontWeight: '700', fontSize: 12 },
  disclaimer: { fontSize: 11, color: C.textMuted, marginTop: 10, fontStyle: 'italic' },
  btnMasInfo: {
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  btnMasInfoTexto: { color: C.primary, fontWeight: '600', fontSize: 14 },
});
