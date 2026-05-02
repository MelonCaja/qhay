import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, StatusBar,
} from 'react-native';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { actualizarUsuario } from '../../services/firestore';

const RESTRICCIONES = [
  { id: 'vegetariano', label: 'Vegetariano', desc: 'Sin carne ni pescado' },
  { id: 'vegano', label: 'Vegano', desc: 'Sin productos animales' },
  { id: 'sin-gluten', label: 'Sin gluten', desc: 'Celiaquía o intolerancia' },
  { id: 'sin-lactosa', label: 'Sin lactosa', desc: 'Intolerancia a la lactosa' },
];

const TIEMPOS = [
  { valor: 20, label: 'Menos de 20 min', desc: 'Quiero cocinar rápido' },
  { valor: 45, label: '20 — 45 min', desc: 'Tengo tiempo normal' },
  { valor: 90, label: 'Más de 45 min', desc: 'Me gusta cocinar con calma' },
];

export function OnboardingScreen() {
  const C = useColors();
  const s = makeStyles(C);
  const [paso, setPaso] = useState(0);
  const [esEstudiante, setEsEstudiante] = useState(false);
  const [restricciones, setRestricciones] = useState<string[]>([]);
  const [tiempoCocina, setTiempoCocina] = useState(45);
  const [guardando, setGuardando] = useState(false);
  const { usuario, actualizarUsuario: actualizarStore } = useAuthStore();

  const toggle = (id: string) =>
    setRestricciones((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);

  const finalizar = async () => {
    if (!usuario) return;
    setGuardando(true);
    try {
      const datos = { esEstudiante, restriccionesAlimentarias: restricciones, tiempoCocina, onboardingCompletado: true };
      await actualizarUsuario(usuario.id, datos);
      actualizarStore(datos);
    } catch {
      Alert.alert('Error', 'No se pudo guardar tu perfil.');
    } finally {
      setGuardando(false);
    }
  };

  const pasos = [
    <View key="0" style={s.paso}>
      <Text style={s.pasoEmoji}>👋</Text>
      <Text style={s.pasoTitulo}>¡Bienvenido a Qhay!</Text>
      <Text style={s.pasoSubtitulo}>Vamos a configurar tu perfil para que la app se adapte a tu estilo de vida y te muestre lo que realmente puedes cocinar.</Text>
      
      <View style={{ backgroundColor: C.surface, padding: 20, borderRadius: 16, marginTop: 20 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 8 }}>¿Qué haremos?</Text>
        <Text style={{ fontSize: 14, color: C.textMuted, marginBottom: 4 }}>1. Definir si tienes beca BAES.</Text>
        <Text style={{ fontSize: 14, color: C.textMuted, marginBottom: 4 }}>2. Configurar tus alergias y dieta.</Text>
        <Text style={{ fontSize: 14, color: C.textMuted }}>3. Saber cuánto tiempo tienes para cocinar.</Text>
      </View>
    </View>,

    <View key="1" style={s.paso}>
      <Text style={s.pasoEmoji}>🎓</Text>
      <Text style={s.pasoTitulo}>¿Eres estudiante universitario?</Text>
      <Text style={s.pasoSubtitulo}>Activa los cálculos de la BAES, el buscador de locales adheridos y recetas económicas especiales</Text>
      <View style={s.opcionesGrandes}>
        <TouchableOpacity
          style={[s.opcionGrande, esEstudiante === true && s.opcionActiva]}
          onPress={() => setEsEstudiante(true)}
        >
          <Text style={[s.opcionLabel, esEstudiante === true && s.opcionLabelActiva]}>Sí, soy estudiante</Text>
          <Text style={[s.opcionDesc, esEstudiante === true && { color: '#fff', opacity: 0.8 }]}>Activa descuentos y beneficios</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[s.opcionGrande, esEstudiante === false && s.opcionActiva]}
          onPress={() => setEsEstudiante(false)}
        >
          <Text style={[s.opcionLabel, esEstudiante === false && s.opcionLabelActiva]}>No soy estudiante</Text>
          <Text style={[s.opcionDesc, esEstudiante === false && { color: '#fff', opacity: 0.8 }]}>Continuar como usuario general</Text>
        </TouchableOpacity>
      </View>
    </View>,

    <View key="2" style={s.paso}>
      <Text style={s.pasoEmoji}>🍽️</Text>
      <Text style={s.pasoTitulo}>¿Restricciones alimentarias?</Text>
      <Text style={s.pasoSubtitulo}>Selecciona las que apliquen (opcional)</Text>
      {RESTRICCIONES.map((r) => (
        <TouchableOpacity key={r.id} style={[s.opcionFila, restricciones.includes(r.id) && s.opcionActiva]} onPress={() => toggle(r.id)}>
          <View style={s.opcionFilaInfo}>
            <Text style={[s.opcionLabel, restricciones.includes(r.id) && s.opcionLabelActiva]}>{r.label}</Text>
            <Text style={s.opcionDesc}>{r.desc}</Text>
          </View>
          {restricciones.includes(r.id) && <Text style={{ color: C.primary, fontWeight: '700' }}>✓</Text>}
        </TouchableOpacity>
      ))}
    </View>,

    <View key="3" style={s.paso}>
      <Text style={s.pasoEmoji}>⏰</Text>
      <Text style={s.pasoTitulo}>¿Cuánto tiempo tienes para cocinar?</Text>
      <Text style={s.pasoSubtitulo}>Filtramos recetas según tu disponibilidad</Text>
      {TIEMPOS.map((t) => (
        <TouchableOpacity key={t.valor} style={[s.opcionFila, tiempoCocina === t.valor && s.opcionActiva]} onPress={() => setTiempoCocina(t.valor)}>
          <View style={s.opcionFilaInfo}>
            <Text style={[s.opcionLabel, tiempoCocina === t.valor && s.opcionLabelActiva]}>{t.label}</Text>
            <Text style={s.opcionDesc}>{t.desc}</Text>
          </View>
          {tiempoCocina === t.valor && <Text style={{ color: C.primary, fontWeight: '700' }}>✓</Text>}
        </TouchableOpacity>
      ))}
    </View>,
  ];

  return (
    <View style={s.contenedor}>
      <StatusBar barStyle={C.text === '#F9FAFB' ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <View style={s.indicadores}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[s.punto, i <= paso && s.puntoActivo, i === paso && s.puntoCurrent]} />
        ))}
      </View>
      <ScrollView contentContainerStyle={s.scroll}>{pasos[paso]}</ScrollView>
      <View style={s.botones}>
        {paso > 0 && (
          <Button titulo="Atrás" onPress={() => setPaso(paso - 1)} variante="outline" estiloContenedor={s.btnAtras} />
        )}
        {paso < 2 ? (
          <Button titulo="Continuar" onPress={() => setPaso(paso + 1)} estiloContenedor={s.btnContinuar} />
        ) : (
          <Button titulo="Empecemos" onPress={finalizar} cargando={guardando} estiloContenedor={s.btnContinuar} />
        )}
      </View>
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.bg },
  indicadores: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 56, paddingBottom: 24 },
  punto: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
  puntoActivo: { backgroundColor: C.primary + '60' },
  puntoCurrent: { width: 20, backgroundColor: C.primary },
  scroll: { flexGrow: 1, padding: 24 },
  paso: { flex: 1 },
  pasoEmoji: { fontSize: 48, textAlign: 'center', marginBottom: 16 },
  pasoTitulo: { fontSize: 24, fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: 8 },
  pasoSubtitulo: { fontSize: 14, color: C.textMuted, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  opcionesGrandes: { gap: 12 },
  opcionGrande: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
    marginBottom: 12,
  },
  opcionFila: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  opcionActiva: { borderColor: C.primary, backgroundColor: C.primary },
  opcionFilaInfo: { flex: 1 },
  opcionLabel: { fontSize: 15, fontWeight: '600', color: C.text },
  opcionLabelActiva: { color: '#fff' },
  opcionDesc: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  botones: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    backgroundColor: C.surface,
  },
  btnAtras: { flex: 1 },
  btnContinuar: { flex: 2 },
});
