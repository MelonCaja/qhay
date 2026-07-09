import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Switch, StatusBar, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { actualizarUsuario } from '../../services/profileService';
import { useDespensa } from '../../hooks/useDespensa';
import { useFavoritosStore } from '../../store/favoritosStore';
import { getRecetas } from '../../services/recipeService';
import { Receta } from '../../types/receta';
import { TerminosModal } from '../../components/legal/TerminosModal';

const RESTRICCIONES = [
  { id: 'vegetariano', label: 'Vegetariano' },
  { id: 'vegano', label: 'Vegano' },
  { id: 'sin-gluten', label: 'Sin gluten' },
  { id: 'sin-lactosa', label: 'Sin lactosa' },
];

export function PerfilScreen() {
  const C = useColors();
  const s = makeStyles(C);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { usuario, logout, actualizarUsuario: actualizarStore } = useAuth();
  const { ingredientes } = useDespensa();
  const { favoritos, esFavorito } = useFavoritosStore();
  const [guardando, setGuardando] = useState(false);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [modalTerminos, setModalTerminos] = useState(false);

  useEffect(() => {
    getRecetas().then(setRecetas).catch(() => {});
  }, []);

  const metasFavoritas = recetas.filter((r) => r.esFitness && esFavorito(r.id));

  if (!usuario) return null;

  const toggleRestriccion = async (id: string) => {
    const actuales = usuario.restriccionesAlimentarias ?? [];
    const nuevas = actuales.includes(id) ? actuales.filter((r) => r !== id) : [...actuales, id];
    setGuardando(true);
    try {
      await actualizarUsuario(usuario.id, { restriccionesAlimentarias: nuevas });
      actualizarStore({ restriccionesAlimentarias: nuevas });
    } catch { Alert.alert('Error', 'No se pudo guardar el cambio'); }
    finally { setGuardando(false); }
  };

  const toggleEstudiante = async (valor: boolean) => {
    setGuardando(true);
    try {
      await actualizarUsuario(usuario.id, { esEstudiante: valor });
      actualizarStore({ esEstudiante: valor });
    } catch {} finally { setGuardando(false); }
  };

  return (
    <View style={s.contenedor}>
      <StatusBar barStyle={C.bg === '#0D0F12' ? 'light-content' : 'dark-content'} backgroundColor={C.surface} />
      <View style={s.header}>
        <Text style={s.titulo}>Perfil</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Avatar + info */}
        <View style={s.userCard}>
          <View style={s.avatar}>
            <Text style={s.avatarLetra}>{usuario.nombre?.charAt(0)?.toUpperCase() ?? '?'}</Text>
          </View>
          <Text style={s.nombre}>{usuario.nombre}</Text>
          <Text style={s.email}>{usuario.email}</Text>
          <View style={s.badge}>
            <Text style={s.badgeTexto}>{usuario.plan === 'premium' ? '★ Premium' : 'Plan gratuito'}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.stat}><Text style={s.statNum}>{ingredientes.length}</Text><Text style={s.statLabel}>ingredientes</Text></View>
          <View style={s.statDiv} />
          <View style={s.stat}>
            <Text style={s.statNum}>{usuario.tiempoCocina === 20 ? '<20' : usuario.tiempoCocina === 90 ? '45+' : '~45'}</Text>
            <Text style={s.statLabel}>min cocina</Text>
          </View>
          <View style={s.statDiv} />
          <View style={s.stat}><Text style={s.statNum}>{usuario.restriccionesAlimentarias.length}</Text><Text style={s.statLabel}>restricciones</Text></View>
        </View>

        {/* Dashboard de gastos */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>Analíticas</Text>
          <TouchableOpacity style={s.fila} onPress={() => navigation.navigate('DashboardGastos')}>
            <View style={{ flex: 1 }}>
              <Text style={s.filaLabel}>📊 Dashboard de gastos</Text>
              <Text style={s.filaSub}>Gasto por categoría, supermercado y nutrición</Text>
            </View>
            <Text style={{ color: C.textMuted, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Restricciones */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>Restricciones alimentarias</Text>
          {RESTRICCIONES.map((r, i) => (
            <View key={r.id} style={[s.fila, i < RESTRICCIONES.length - 1 && s.filaConSep]}>
              <Text style={s.filaLabel}>{r.label}</Text>
              <Switch
                value={usuario.restriccionesAlimentarias?.includes(r.id) ?? false}
                onValueChange={() => toggleRestriccion(r.id)}
                trackColor={{ false: C.border, true: C.primary + '60' }}
                thumbColor={usuario.restriccionesAlimentarias?.includes(r.id) ? C.primary : C.surface}
                disabled={guardando}
              />
            </View>
          ))}
        </View>

        {/* BAES */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>Beneficio estudiantil</Text>
          <View style={s.fila}>
            <View style={{ flex: 1 }}>
              <Text style={s.filaLabel}>Soy estudiante</Text>
              <Text style={s.filaSub}>Activa precios BAES y recetas económicas</Text>
            </View>
            <Switch
              value={usuario.esEstudiante}
              onValueChange={toggleEstudiante}
              trackColor={{ false: C.border, true: C.primary + '60' }}
              thumbColor={usuario.esEstudiante ? C.primary : C.surface}
              disabled={guardando}
            />
          </View>
          {usuario.esEstudiante && (
            <TouchableOpacity style={s.btnBAES} onPress={() => navigation.navigate('BAES')}>
              <Text style={s.btnBAESTexto}>Ver beneficios BAES →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Mis Metas */}
        {metasFavoritas.length > 0 && (
          <View style={s.seccion}>
            <Text style={s.seccionTitulo}>⭐ Mis metas fitness</Text>
            {metasFavoritas.map((r, i) => (
              <View key={r.id} style={[s.fila, i < metasFavoritas.length - 1 && s.filaConSep]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.filaLabel}>{r.nombre}</Text>
                  {r.macros && (
                    <Text style={s.filaSub}>
                      P {r.macros.proteinas}g · C {r.macros.carbohidratos}g · G {r.macros.grasas}g
                    </Text>
                  )}
                </View>
                {r.calorias != null && (
                  <Text style={s.metaCal}>🔥 {r.calorias} kcal</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Legal */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>Legal</Text>
          <TouchableOpacity style={s.fila} onPress={() => setModalTerminos(true)}>
            <View style={{ flex: 1 }}>
              <Text style={s.filaLabel}>📄 Términos y Condiciones</Text>
              <Text style={s.filaSub}>Precios referenciales, datos de boletas (Ley 19.628) y uso BAES</Text>
            </View>
            <Text style={{ color: C.textMuted, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Feedback */}
        <TouchableOpacity
          style={s.btnFeedback}
          onPress={() => Linking.openURL(
            'mailto:gunsdghost@gmail.com' +
            '?subject=' + encodeURIComponent('Feedback Qhay') +
            '&body=' + encodeURIComponent('Hola! Quiero compartir mi experiencia con Qhay:\n\n')
          )}
        >
          <Text style={s.btnFeedbackTexto}>💬 Enviar Feedback</Text>
        </TouchableOpacity>

        {/* Acciones */}
        <View style={s.acciones}>
          <TouchableOpacity style={s.btnSalir} onPress={() => Alert.alert('Cerrar sesión', '¿Estás seguro?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
          ])}>
            <Text style={s.btnSalirTexto}>Cerrar sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Eliminar cuenta', 'Escríbenos a soporte para eliminar tu cuenta.')}>
            <Text style={s.btnEliminar}>Eliminar cuenta</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.version}>Qhay v1.0.0</Text>
      </ScrollView>

      <TerminosModal visible={modalTerminos} onCerrar={() => setModalTerminos(false)} />
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: C.surface },
  titulo: { fontSize: 24, fontWeight: '700', color: C.text },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  userCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLetra: { fontSize: 30, fontWeight: '700', color: C.primary },
  nombre: { fontSize: 19, fontWeight: '700', color: C.text },
  email: { fontSize: 13, color: C.textMuted, marginTop: 4 },
  badge: { marginTop: 10, backgroundColor: C.primarySoft, borderRadius: 100, paddingVertical: 4, paddingHorizontal: 12 },
  badgeTexto: { color: C.primary, fontWeight: '600', fontSize: 12 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 26, fontWeight: '800', color: C.primary },
  statLabel: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  statDiv: { width: StyleSheet.hairlineWidth, height: 36, backgroundColor: C.border },
  seccion: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  seccionTitulo: { fontSize: 13, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  filaConSep: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  filaLabel: { fontSize: 15, color: C.text },
  filaSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  btnBAES: {
    backgroundColor: C.primarySoft,
    borderRadius: 100,
    padding: 10,
    marginTop: 4,
    alignItems: 'center',
  },
  btnBAESTexto: { color: C.primary, fontWeight: '600', fontSize: 13 },
  btnFeedback: {
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.primary + '50',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  btnFeedbackTexto: { color: C.primary, fontWeight: '700', fontSize: 15 },
  acciones: { gap: 8 },
  btnSalir: {
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
  btnSalirTexto: { color: C.text, fontWeight: '600', fontSize: 15 },
  btnEliminar: { color: C.error, fontWeight: '600', fontSize: 14, textAlign: 'center', paddingVertical: 6 },
  version: { textAlign: 'center', color: C.border, fontSize: 12, marginTop: 8, marginBottom: 16 },
  metaCal: { fontSize: 12, color: '#E65100', fontWeight: '600' },
});
