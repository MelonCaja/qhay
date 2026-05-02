import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Alert,
  TouchableOpacity, TextInput, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { Button } from '../../components/common/Button';
import { useDespensa } from '../../hooks/useDespensa';
import { UnidadMedida } from '../../types/ingrediente';

const UNIDADES: { valor: UnidadMedida; label: string }[] = [
  { valor: 'unidad', label: 'ud.' },
  { valor: 'kg', label: 'kg' },
  { valor: 'g', label: 'g' },
  { valor: 'L', label: 'L' },
  { valor: 'ml', label: 'ml' },
  { valor: 'taza', label: 'taza' },
  { valor: 'paquete', label: 'pqt.' },
  { valor: 'lata', label: 'lata' },
];

export function AgregarIngredienteScreen() {
  const C = useColors();
  const s = makeStyles(C);
  const navigation = useNavigation();
  const { agregar } = useDespensa();

  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [unidad, setUnidad] = useState<UnidadMedida>('unidad');
  const [vence, setVence] = useState(false);
  const [fechaDia, setFechaDia] = useState('');
  const [fechaMes, setFechaMes] = useState('');
  const [fechaAnio, setFechaAnio] = useState('');
  const [guardando, setGuardando] = useState(false);

  const parsearFecha = (): Date | undefined => {
    if (!vence || !fechaDia || !fechaMes || !fechaAnio) return undefined;
    const fecha = new Date(Number(fechaAnio), Number(fechaMes) - 1, Number(fechaDia));
    return isNaN(fecha.getTime()) ? undefined : fecha;
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) { Alert.alert('Falta el nombre', '¿Qué ingrediente quieres agregar?'); return; }
    const cantidadNum = Number(cantidad);
    if (!cantidad || isNaN(cantidadNum) || cantidadNum <= 0) { Alert.alert('Cantidad inválida', 'Ingresa una cantidad mayor a 0'); return; }
    setGuardando(true);
    try {
      await agregar({ nombre: nombre.trim(), cantidad: cantidadNum, unidad, fechaVencimiento: parsearFecha(), agregadoPor: 'manual' });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle={C.text === '#F9FAFB' ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Nombre */}
        <Text style={s.label}>¿Qué tienes?</Text>
        <TextInput
          style={s.input}
          placeholder="Arroz, Leche, Tomate..."
          value={nombre}
          onChangeText={setNombre}
          autoCapitalize="sentences"
          returnKeyType="next"
          placeholderTextColor={C.textMuted}
        />

        {/* Cantidad */}
        <Text style={s.label}>Cantidad</Text>
        <View style={s.cantidadFila}>
          <TouchableOpacity style={s.btnCantidad} onPress={() => setCantidad(String(Math.max(1, Number(cantidad) - 1)))}>
            <Text style={s.btnCantidadTexto}>−</Text>
          </TouchableOpacity>
          <TextInput
            style={s.inputCantidad}
            value={cantidad}
            onChangeText={setCantidad}
            keyboardType="decimal-pad"
            placeholderTextColor={C.textMuted}
          />
          <TouchableOpacity style={s.btnCantidad} onPress={() => setCantidad(String(Number(cantidad) + 1))}>
            <Text style={s.btnCantidadTexto}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Unidad */}
        <Text style={s.label}>Unidad</Text>
        <View style={s.unidades}>
          {UNIDADES.map((u) => (
            <TouchableOpacity
              key={u.valor}
              style={[s.chipUnidad, unidad === u.valor && s.chipUnidadActivo]}
              onPress={() => setUnidad(u.valor)}
            >
              <Text style={[s.chipLabel, unidad === u.valor && s.chipLabelActivo]}>{u.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Vencimiento */}
        <TouchableOpacity style={s.venceRow} onPress={() => setVence(!vence)}>
          <View style={[s.checkbox, vence && s.checkboxActivo]}>
            {vence && <Text style={s.checkboxCheck}>✓</Text>}
          </View>
          <View>
            <Text style={s.venceLabel}>Tiene fecha de vencimiento</Text>
            <Text style={s.venceSub}>Te avisaremos antes de que expire</Text>
          </View>
        </TouchableOpacity>

        {vence && (
          <View style={s.fechaFila}>
            {[
              { label: 'Día', value: fechaDia, setter: setFechaDia, ph: '15', max: 2 },
              { label: 'Mes', value: fechaMes, setter: setFechaMes, ph: '08', max: 2 },
              { label: 'Año', value: fechaAnio, setter: setFechaAnio, ph: '2026', max: 4, flex: 1.5 },
            ].map((f) => (
              <View key={f.label} style={[s.fechaInput, f.flex ? { flex: f.flex } : undefined]}>
                <Text style={s.fechaLabel}>{f.label}</Text>
                <TextInput
                  style={s.fechaCampo}
                  placeholder={f.ph}
                  value={f.value}
                  onChangeText={f.setter}
                  keyboardType="number-pad"
                  maxLength={f.max}
                  placeholderTextColor={C.textMuted}
                />
              </View>
            ))}
          </View>
        )}

        <Button titulo="Guardar ingrediente" onPress={handleGuardar} cargando={guardando} estiloContenedor={s.btnGuardar} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: C.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: 14,
    fontSize: 16,
    color: C.text,
    marginBottom: 20,
  },
  cantidadFila: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  btnCantidad: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCantidadTexto: { fontSize: 22, color: C.primary, fontWeight: '600', lineHeight: 26 },
  inputCantidad: { flex: 1, textAlign: 'center', fontSize: 28, fontWeight: '700', color: C.text, paddingVertical: 8 },
  unidades: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chipUnidad: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  chipUnidadActivo: { borderColor: C.primary, backgroundColor: C.primarySoft },
  chipLabel: { fontSize: 13, color: C.textMuted, fontWeight: '500' },
  chipLabelActivo: { color: C.primary, fontWeight: '700' },
  venceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxActivo: { backgroundColor: C.primary, borderColor: C.primary },
  checkboxCheck: { color: '#fff', fontWeight: '700', fontSize: 13 },
  venceLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  venceSub: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  fechaFila: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  fechaInput: { flex: 1 },
  fechaLabel: { fontSize: 11, color: C.textMuted, marginBottom: 4, fontWeight: '600', textTransform: 'uppercase' },
  fechaCampo: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: 12,
    fontSize: 16,
    color: C.text,
    textAlign: 'center',
  },
  btnGuardar: { marginTop: 8 },
});
