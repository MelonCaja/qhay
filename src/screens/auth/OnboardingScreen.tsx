import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, StatusBar,
} from 'react-native';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import { completarOnboarding } from '../../services/profileService';
import type { Utensilio } from '../../types/firestore';

const GUSTOS = [
  { id: 'chileno', label: 'Chileno', emoji: '🇨🇱' },
  { id: 'italiano', label: 'Italiano', emoji: '🍝' },
  { id: 'asiatico', label: 'Asiático', emoji: '🍜' },
  { id: 'mexicano', label: 'Mexicano', emoji: '🌮' },
  { id: 'fitness', label: 'Fitness', emoji: '💪' },
  { id: 'dulce', label: 'Dulce', emoji: '🍰' },
  { id: 'picante', label: 'Picante', emoji: '🌶️' },
  { id: 'economico', label: 'Económico', emoji: '💸' },
];

const PRESUPUESTOS = [
  { valor: 15000, label: '< $15.000', desc: 'Modo supervivencia' },
  { valor: 30000, label: '$15.000 — $30.000', desc: 'Ajustado pero digno' },
  { valor: 50000, label: '$30.000 — $50.000', desc: 'Cómodo' },
  { valor: 80000, label: '$50.000 +', desc: 'Sin restricciones' },
];

const UTENSILIOS: { id: Utensilio; label: string; emoji: string }[] = [
  { id: 'olla', label: 'Olla', emoji: '🍲' },
  { id: 'sarten', label: 'Sartén', emoji: '🍳' },
  { id: 'horno', label: 'Horno', emoji: '🔥' },
  { id: 'microondas', label: 'Microondas', emoji: '📡' },
  { id: 'licuadora', label: 'Licuadora', emoji: '🥤' },
  { id: 'hervidor', label: 'Hervidor', emoji: '☕' },
  { id: 'airfryer', label: 'Airfryer', emoji: '🌪️' },
  { id: 'tostadora', label: 'Tostadora', emoji: '🍞' },
];

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

const TOTAL_PASOS = 7;

export function OnboardingScreen() {
  const C = useColors();
  const s = makeStyles(C);
  const [paso, setPaso] = useState(0);
  const [esEstudiante, setEsEstudiante] = useState(false);
  const [gustos, setGustos] = useState<string[]>([]);
  const [presupuestoSemanal, setPresupuesto] = useState<number | undefined>();
  const [utensilios, setUtensilios] = useState<Utensilio[]>([]);
  const [restricciones, setRestricciones] = useState<string[]>([]);
  const [tiempoCocina, setTiempoCocina] = useState(45);
  const [guardando, setGuardando] = useState(false);
  // actualizarUsuario del hook persiste store + caché AsyncStorage juntos:
  // clave para que el navigator no rebote de vuelta al onboarding (bug loop).
  const { usuario, actualizarUsuario: actualizarStore } = useAuth();

  const toggleEn = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>) => (id: T) =>
    setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleGusto = toggleEn(setGustos);
  const toggleUtensilio = toggleEn(setUtensilios);
  const toggleRestriccion = toggleEn(setRestricciones);

  const finalizar = async () => {
    if (!usuario) return;
    setGuardando(true);
    try {
      const datos = {
        esEstudiante,
        gustos,
        presupuestoSemanal,
        utensilios,
        restriccionesAlimentarias: restricciones,
        tiempoCocina,
      };
      await completarOnboarding(usuario.id, datos);
      actualizarStore({ ...datos, onboardingCompletado: true });
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
      <Text style={s.pasoSubtitulo}>Configuremos tu perfil para que la app se adapte a tu estilo de vida y te muestre lo que realmente puedes cocinar.</Text>
      <View style={s.bentoIntro}>
        <View style={[s.introTile, s.introTileWide]}>
          <Text style={s.introTileEmoji}>🎓</Text>
          <Text style={s.introTileText}>BAES y beneficios estudiantiles</Text>
        </View>
        <View style={s.introTile}>
          <Text style={s.introTileEmoji}>😋</Text>
          <Text style={s.introTileText}>Tus gustos</Text>
        </View>
        <View style={s.introTile}>
          <Text style={s.introTileEmoji}>💰</Text>
          <Text style={s.introTileText}>Presupuesto</Text>
        </View>
        <View style={s.introTile}>
          <Text style={s.introTileEmoji}>🍳</Text>
          <Text style={s.introTileText}>Utensilios</Text>
        </View>
        <View style={s.introTile}>
          <Text style={s.introTileEmoji}>⏰</Text>
          <Text style={s.introTileText}>Tu tiempo</Text>
        </View>
      </View>
    </View>,

    <View key="1" style={s.paso}>
      <Text style={s.pasoEmoji}>🎓</Text>
      <Text style={s.pasoTitulo}>¿Eres estudiante universitario?</Text>
      <Text style={s.pasoSubtitulo}>Activa los cálculos de la BAES, el buscador de locales adheridos y recetas económicas especiales</Text>
      <View style={s.opcionesGrandes}>
        <TouchableOpacity
          style={[s.opcionGrande, esEstudiante && s.tileActivo]}
          onPress={() => setEsEstudiante(true)}
        >
          <Text style={[s.opcionLabel, esEstudiante && s.labelActivo]}>Sí, soy estudiante</Text>
          <Text style={s.opcionDesc}>Activa descuentos y beneficios</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.opcionGrande, !esEstudiante && s.tileActivo]}
          onPress={() => setEsEstudiante(false)}
        >
          <Text style={[s.opcionLabel, !esEstudiante && s.labelActivo]}>No soy estudiante</Text>
          <Text style={s.opcionDesc}>Continuar como usuario general</Text>
        </TouchableOpacity>
      </View>
    </View>,

    <View key="2" style={s.paso}>
      <Text style={s.pasoEmoji}>😋</Text>
      <Text style={s.pasoTitulo}>¿Qué te gusta comer?</Text>
      <Text style={s.pasoSubtitulo}>Elige todos los que quieras — priorizamos recetas afines</Text>
      <View style={s.bento}>
        {GUSTOS.map((g) => {
          const activo = gustos.includes(g.id);
          return (
            <TouchableOpacity
              key={g.id}
              style={[s.bentoTile, activo && s.tileActivo]}
              onPress={() => toggleGusto(g.id)}
            >
              <Text style={s.bentoEmoji}>{g.emoji}</Text>
              <Text style={[s.bentoLabel, activo && s.labelActivo]}>{g.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>,

    <View key="3" style={s.paso}>
      <Text style={s.pasoEmoji}>💰</Text>
      <Text style={s.pasoTitulo}>¿Presupuesto semanal de comida?</Text>
      <Text style={s.pasoSubtitulo}>Optimizamos tus compras para que no te pases</Text>
      {PRESUPUESTOS.map((p) => {
        const activo = presupuestoSemanal === p.valor;
        return (
          <TouchableOpacity
            key={p.valor}
            style={[s.opcionFila, activo && s.tileActivo]}
            onPress={() => setPresupuesto(p.valor)}
          >
            <View style={s.opcionFilaInfo}>
              <Text style={[s.opcionLabel, activo && s.labelActivo]}>{p.label}</Text>
              <Text style={s.opcionDesc}>{p.desc}</Text>
            </View>
            {activo && <Text style={s.check}>✓</Text>}
          </TouchableOpacity>
        );
      })}
    </View>,

    <View key="4" style={s.paso}>
      <Text style={s.pasoEmoji}>🍳</Text>
      <Text style={s.pasoTitulo}>¿Qué tienes en tu cocina?</Text>
      <Text style={s.pasoSubtitulo}>Solo te sugeriremos recetas que puedas preparar</Text>
      <View style={s.bento}>
        {UTENSILIOS.map((u) => {
          const activo = utensilios.includes(u.id);
          return (
            <TouchableOpacity
              key={u.id}
              style={[s.bentoTile, activo && s.tileActivo]}
              onPress={() => toggleUtensilio(u.id)}
            >
              <Text style={s.bentoEmoji}>{u.emoji}</Text>
              <Text style={[s.bentoLabel, activo && s.labelActivo]}>{u.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>,

    <View key="5" style={s.paso}>
      <Text style={s.pasoEmoji}>🍽️</Text>
      <Text style={s.pasoTitulo}>¿Restricciones alimentarias?</Text>
      <Text style={s.pasoSubtitulo}>Selecciona las que apliquen (opcional)</Text>
      {RESTRICCIONES.map((r) => {
        const activo = restricciones.includes(r.id);
        return (
          <TouchableOpacity
            key={r.id}
            style={[s.opcionFila, activo && s.tileActivo]}
            onPress={() => toggleRestriccion(r.id)}
          >
            <View style={s.opcionFilaInfo}>
              <Text style={[s.opcionLabel, activo && s.labelActivo]}>{r.label}</Text>
              <Text style={s.opcionDesc}>{r.desc}</Text>
            </View>
            {activo && <Text style={s.check}>✓</Text>}
          </TouchableOpacity>
        );
      })}
    </View>,

    <View key="6" style={s.paso}>
      <Text style={s.pasoEmoji}>⏰</Text>
      <Text style={s.pasoTitulo}>¿Cuánto tiempo tienes para cocinar?</Text>
      <Text style={s.pasoSubtitulo}>Filtramos recetas según tu disponibilidad</Text>
      {TIEMPOS.map((t) => {
        const activo = tiempoCocina === t.valor;
        return (
          <TouchableOpacity
            key={t.valor}
            style={[s.opcionFila, activo && s.tileActivo]}
            onPress={() => setTiempoCocina(t.valor)}
          >
            <View style={s.opcionFilaInfo}>
              <Text style={[s.opcionLabel, activo && s.labelActivo]}>{t.label}</Text>
              <Text style={s.opcionDesc}>{t.desc}</Text>
            </View>
            {activo && <Text style={s.check}>✓</Text>}
          </TouchableOpacity>
        );
      })}
    </View>,
  ];

  return (
    <View style={s.contenedor}>
      <StatusBar barStyle={C.bg === '#0D0F12' ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <View style={s.indicadores}>
        {Array.from({ length: TOTAL_PASOS }, (_, i) => (
          <View key={i} style={[s.punto, i <= paso && s.puntoActivo, i === paso && s.puntoCurrent]} />
        ))}
      </View>
      <ScrollView contentContainerStyle={s.scroll}>{pasos[paso]}</ScrollView>
      <View style={s.botones}>
        {paso > 0 && (
          <Button titulo="Atrás" onPress={() => setPaso(paso - 1)} variante="outline" estiloContenedor={s.btnAtras} />
        )}
        {paso < TOTAL_PASOS - 1 ? (
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

  // Bento grid
  bento: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bentoTile: {
    width: '48%',
    flexGrow: 1,
    aspectRatio: 1.6,
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bentoEmoji: { fontSize: 28 },
  bentoLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  tileActivo: { borderColor: C.primary, backgroundColor: C.primarySoft },
  labelActivo: { color: C.primary },

  // Bento intro (bienvenida)
  bentoIntro: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  introTile: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 4,
  },
  introTileWide: { width: '100%' },
  introTileEmoji: { fontSize: 22 },
  introTileText: { fontSize: 13, fontWeight: '600', color: C.text },

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
  opcionFilaInfo: { flex: 1 },
  opcionLabel: { fontSize: 15, fontWeight: '600', color: C.text },
  opcionDesc: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  check: { color: C.primary, fontWeight: '700', fontSize: 16 },

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
