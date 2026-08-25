import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, 
} from 'react-native';
import { mostrarAlerta } from '../../utils/alert';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { RecetaCard } from '../../components/recetas/RecetaCard';
import { VencimientoAlert } from '../../components/despensa/VencimientoAlert';
import { ProductoFrecuenteCard } from '../../components/home/ProductoFrecuenteCard';
import { useDespensa } from '../../hooks/useDespensa';
import { useRecetas } from '../../hooks/useRecetas';
import { useAuthStore } from '../../store/authStore';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Ingrediente } from '../../types/ingrediente';
import { ESPACIO_TAB_BAR } from '../../constants/layout';

// ── Mapa de categorías relacionadas para recomendaciones ──────────────────────
const RELACIONADAS: Record<string, { label: string; emoji: string; query: string }> = {
  carnes_pescados:  { label: 'Verduras frescas',    emoji: '🥦', query: 'verdura' },
  panaderia:        { label: 'Lácteos',              emoji: '🥛', query: 'leche' },
  lacteos:          { label: 'Frutas frescas',       emoji: '🍎', query: 'fruta' },
  frutas_verduras:  { label: 'Proteínas',            emoji: '🥩', query: 'pollo' },
  despensa:         { label: 'Frutas y Verduras',    emoji: '🥬', query: 'verdura fruta' },
  snacks:           { label: 'Opciones saludables',  emoji: '🥜', query: 'nuez granola' },
  bebidas:          { label: 'Snacks',               emoji: '🍪', query: 'galleta barra' },
  limpieza:         { label: 'Cuidado Personal',     emoji: '🧴', query: 'shampoo' },
  quesos_fiambres:  { label: 'Pan fresco',           emoji: '🍞', query: 'pan' },
};

// ── Calcula la categoría más frecuente ────────────────────────────────────────
function categoriaDominante(frecuentes: Ingrediente[]): string | null {
  const conteo: Record<string, number> = {};
  for (const ing of frecuentes) {
    if (!ing.categoria) continue;
    conteo[ing.categoria] = (conteo[ing.categoria] ?? 0) + (ing.frecuenciaUso ?? 1);
  }
  const entries = Object.entries(conteo);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

// ─────────────────────────────────────────────────────────────────────────────

export function HomeScreen() {
  const C = useColors();
  const s = makeStyles(C);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { usuario } = useAuthStore();
  const { emailVerificado, reenviarVerificacion, recargarVerificacion } = useAuth();
  const [reenviando, setReenviando] = useState(false);

  const { ingredientes, proxAVencer, cargando: cargandoDespensa, agregar } = useDespensa();
  const { recetas, cargando: cargandoRecetas } = useRecetas(ingredientes, {
    tab: 'despensa',
    restricciones: usuario?.restriccionesAlimentarias ?? [],
  });

  // ── Top 5 productos más frecuentes — 0 lecturas Firestore extra ────────────
  const frecuentes = useMemo(
    () =>
      [...ingredientes]
        .filter((i) => (i.frecuenciaUso ?? 0) >= 1)
        .sort((a, b) => (b.frecuenciaUso ?? 0) - (a.frecuenciaUso ?? 0))
        .slice(0, 6),
    [ingredientes],
  );

  // ── Recomendación basada en categoría dominante ────────────────────────────
  const recomendacion = useMemo(() => {
    if (!frecuentes.length) return null;
    const catDom = categoriaDominante(frecuentes);
    if (!catDom) return null;
    return RELACIONADAS[catDom] ?? null;
  }, [frecuentes]);

  const recetasSugeridas = recetas.slice(0, 5);
  const nombre = usuario?.nombre?.split(' ')[0] ?? 'cocinero';
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';

  if (cargandoDespensa || cargandoRecetas) {
    return <LoadingSpinner pantalla mensaje="Cargando tu cocina..." />;
  }

  const handleReenviar = async () => {
    setReenviando(true);
    try {
      await reenviarVerificacion();
      mostrarAlerta('Correo enviado', 'Revisa tu bandeja de entrada (y spam).');
    } catch {
      mostrarAlerta('Error', 'No se pudo enviar el correo. Intenta más tarde.');
    } finally {
      setReenviando(false);
    }
  };

  const handleYaVerifique = async () => {
    const ok = await recargarVerificacion();
    if (!ok) mostrarAlerta('Aún sin verificar', 'Haz clic en el enlace del correo que te enviamos y vuelve a intentarlo.');
  };

  const handleQuickAgregar = async (ingrediente: Ingrediente) => {
    try {
      await agregar({
        nombre: ingrediente.nombre,
        marca: ingrediente.marca,
        cantidad: 1,
        unidad: ingrediente.unidad,
        agregadoPor: 'manual',
        imageUrl: ingrediente.imageUrl,
        categoria: ingrediente.categoria,
      });
      mostrarAlerta('¡Listo! ✓', `${ingrediente.nombre} agregado a tu despensa.`);
    } catch {
      mostrarAlerta('Error', 'No se pudo agregar. Intenta de nuevo.');
    }
  };

  const handleBuscarDesdeFrec = (nombre: string) => {
    navigation.navigate('BuscadorProducto', { query: nombre });
  };

  const handleBuscarRecomendacion = (query: string) => {
    navigation.navigate('BuscadorProducto', { query });
  };

  return (
    <View style={s.contenedor}>
      <StatusBar
        barStyle={C.bg === '#0D0F12' ? 'light-content' : 'dark-content'}
        backgroundColor={C.surface}
      />

      {/* Banner de verificación */}
      {usuario && !emailVerificado && (
        <View style={s.verificacionBanner}>
          <Text style={s.verificacionEmoji}>📧</Text>
          <View style={s.verificacionTextos}>
            <Text style={s.verificacionTitulo}>Verifica tu correo</Text>
            <Text style={s.verificacionSub}>
              Enviamos un enlace a {usuario.email}. Revisa tu bandeja de entrada y spam.
            </Text>
            <View style={s.verificacionBtns}>
              <TouchableOpacity onPress={handleYaVerifique} style={s.btnVerificado}>
                <Text style={s.btnVerificadoTexto}>Ya verifiqué</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleReenviar} disabled={reenviando} style={s.btnReenviar}>
                <Text style={s.btnReenviarTexto}>{reenviando ? 'Enviando…' : 'Reenviar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTexto}>
            <Text style={s.saludo}>{saludo}, {nombre}</Text>
            <Text style={s.pregunta}>¿Qué hay para cocinar?</Text>
          </View>
          <TouchableOpacity
            style={s.avatar}
            onPress={() => navigation.navigate('Main', { screen: 'Perfil' } as never)}
          >
            <Text style={s.avatarTexto}>{nombre.charAt(0).toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.contenido}>
          <VencimientoAlert ingredientes={proxAVencer} />

          {/* Stats */}
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statNum}>{ingredientes.length}</Text>
              <Text style={s.statLabel}>ingredientes</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCard}>
              <Text style={s.statNum}>{recetas.length}</Text>
              <Text style={s.statLabel}>recetas posibles</Text>
            </View>
          </View>

          {/* CTA principal */}
          <TouchableOpacity
            style={s.cta}
            onPress={() => navigation.navigate('Main', { screen: 'Recetas' } as never)}
            activeOpacity={0.8}
          >
            <View style={s.ctaIcon}>
              <Text style={s.ctaEmoji}>✨</Text>
            </View>
            <View>
              <Text style={s.ctaTexto}>Cocina con lo que hay</Text>
              <Text style={s.ctaSub}>Encontramos la receta perfecta para ti</Text>
            </View>
            <Text style={s.ctaArrow}>›</Text>
          </TouchableOpacity>

          {/* ── Mis Básicos (frecuentes) ─────────────────────────────────── */}
          {frecuentes.length >= 2 && (
            <View style={s.seccion}>
              <View style={s.seccionHeader}>
                <View>
                  <Text style={s.seccionTitulo}>Mis Básicos</Text>
                  <Text style={s.seccionSub}>Los que más repites · toca + para agregar</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.frecuentesScroll}
                contentContainerStyle={s.frecuentesContent}
              >
                {frecuentes.map((ing) => (
                  <ProductoFrecuenteCard
                    key={ing.id}
                    ingrediente={ing}
                    onAgregar={handleQuickAgregar}
                    onBuscar={handleBuscarDesdeFrec}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Banner de recomendación ───────────────────────────────────── */}
          {recomendacion && (
            <TouchableOpacity
              style={s.recBanner}
              onPress={() => handleBuscarRecomendacion(recomendacion.query)}
              activeOpacity={0.85}
            >
              <Text style={s.recEmoji}>{recomendacion.emoji}</Text>
              <View style={s.recTextos}>
                <Text style={s.recTitulo}>¿Se te acabaron las {recomendacion.label}?</Text>
                <Text style={s.recSub}>Basado en lo que más compras</Text>
              </View>
              <Text style={s.recArrow}>›</Text>
            </TouchableOpacity>
          )}

          {/* Widget top receta */}
          {recetasSugeridas.length > 0 && (
            <View style={s.magiaCard}>
              <Text style={s.magiaTag}>TOP SUGERENCIA</Text>
              <Text style={s.magiaTitulo}>{recetasSugeridas[0].nombre}</Text>
              {recetasSugeridas[0].porcentajeCoincidencia === 100 ? (
                <Text style={s.magiaEstado}>✅ Tienes todos los ingredientes listos</Text>
              ) : (
                <Text style={s.magiaFaltan}>
                  Falta comprar:{' '}
                  {(recetasSugeridas[0] as any).ingredientesFaltantes?.slice(0, 2).join(', ')}
                  {((recetasSugeridas[0] as any).ingredientesFaltantes?.length || 0) > 2
                    ? ' y más'
                    : ''}
                </Text>
              )}
              <TouchableOpacity
                style={s.magiaBtn}
                onPress={() => navigation.navigate('DetalleReceta', { receta: recetasSugeridas[0] })}
              >
                <Text style={s.magiaBtnTexto}>
                  Ver receta ({recetasSugeridas[0].porcentajeCoincidencia}% match)
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Recetas sugeridas */}
          {recetasSugeridas.length > 0 && (
            <View style={s.seccion}>
              <View style={s.seccionHeader}>
                <Text style={s.seccionTitulo}>Sugeridas para ti</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Recetas' } as never)}>
                  <Text style={s.verTodas}>Ver todas</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -20 }}
                contentContainerStyle={{ paddingHorizontal: 20 }}
              >
                {recetasSugeridas.map((receta) => (
                  <RecetaCard
                    key={receta.id}
                    receta={receta}
                    horizontal
                    onPress={() => navigation.navigate('DetalleReceta', { receta })}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Despensa vacía */}
          {ingredientes.length === 0 && (
            <View style={s.vacio}>
              <Text style={s.vacioEmoji}>🫙</Text>
              <Text style={s.vacioTitulo}>Tu despensa está vacía</Text>
              <Text style={s.vacioSub}>
                Agrega ingredientes para descubrir qué puedes cocinar
              </Text>
              <TouchableOpacity
                style={s.vacioBtn}
                onPress={() => navigation.navigate('Main', { screen: 'Despensa' } as never)}
              >
                <Text style={s.vacioBtnTexto}>Agregar ingredientes</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* BAES */}
          {usuario?.esEstudiante && (
            <TouchableOpacity
              style={s.baes}
              onPress={() => navigation.navigate('BAES')}
              activeOpacity={0.8}
            >
              <Text style={s.baesEmoji}>🎓</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.baesTitulo}>Beneficio BAES activo</Text>
                <Text style={s.baesSub}>Ver supermercados con descuento</Text>
              </View>
              <Text style={s.baesArrow}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.bg },

  verificacionBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  verificacionEmoji: { fontSize: 22, marginTop: 2 },
  verificacionTextos: { flex: 1, gap: 4 },
  verificacionTitulo: { fontSize: 14, fontWeight: '700', color: '#5D4037' },
  verificacionSub: { fontSize: 12, color: '#6D4C41', lineHeight: 17 },
  verificacionBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btnVerificado: {
    backgroundColor: '#FFA000',
    borderRadius: 100,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  btnVerificadoTexto: { color: '#fff', fontSize: 12, fontWeight: '700' },
  btnReenviar: {
    borderWidth: 1,
    borderColor: '#FFA000',
    borderRadius: 100,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  btnReenviarTexto: { color: '#FFA000', fontSize: 12, fontWeight: '700' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
    backgroundColor: C.surface,
  },
  headerTexto: { flex: 1 },
  saludo: { fontSize: 13, color: C.textMuted },
  pregunta: { fontSize: 22, fontWeight: '700', color: C.text, marginTop: 2 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { fontSize: 16, fontWeight: '700', color: C.primary },

  contenido: { padding: 20, gap: 16, paddingBottom: ESPACIO_TAB_BAR },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statCard: { alignItems: 'center' },
  statNum: { fontSize: 34, fontWeight: '800', color: C.primary },
  statLabel: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 44,
    backgroundColor: C.border,
  },

  cta: {
    backgroundColor: C.primary,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaEmoji: { fontSize: 22 },
  ctaTexto: { color: '#fff', fontSize: 17, fontWeight: '800' },
  ctaSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  ctaArrow: { color: '#fff', fontSize: 24, fontWeight: '300', marginLeft: 'auto' },

  // ── Sección genérica ────────────────────────────────────────────────────────
  seccion: { gap: 10 },
  seccionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  seccionTitulo: { fontSize: 17, fontWeight: '700', color: C.text },
  seccionSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  verTodas: { fontSize: 14, color: C.primary, fontWeight: '600' },

  // ── Mis Básicos ─────────────────────────────────────────────────────────────
  frecuentesScroll: { marginHorizontal: -20 },
  frecuentesContent: { paddingHorizontal: 20, paddingVertical: 4 },

  // ── Banner recomendación ────────────────────────────────────────────────────
  recBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  recEmoji: { fontSize: 30 },
  recTextos: { flex: 1 },
  recTitulo: { fontSize: 14, fontWeight: '700', color: C.text },
  recSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  recArrow: { fontSize: 22, color: C.textMuted, fontWeight: '300' },

  // ── Widget top receta ───────────────────────────────────────────────────────
  magiaCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: C.primary + '30',
    borderLeftWidth: 4,
    borderLeftColor: C.primary,
  },
  magiaTag: {
    fontSize: 10,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  magiaTitulo: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 8 },
  magiaEstado: { fontSize: 13, color: C.primary, fontWeight: '600', marginBottom: 14 },
  magiaFaltan: { fontSize: 13, color: C.warning, fontWeight: '600', marginBottom: 14 },
  magiaBtn: {
    backgroundColor: C.primarySoft,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  magiaBtnTexto: { color: C.primary, fontWeight: '700', fontSize: 14 },

  // ── Despensa vacía ──────────────────────────────────────────────────────────
  vacio: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  vacioEmoji: { fontSize: 48, marginBottom: 12 },
  vacioTitulo: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 8 },
  vacioSub: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  vacioBtn: {
    backgroundColor: C.primary,
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  vacioBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── BAES ────────────────────────────────────────────────────────────────────
  baes: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primarySoft,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  baesEmoji: { fontSize: 24 },
  baesTitulo: { fontSize: 14, fontWeight: '700', color: C.primary },
  baesSub: { fontSize: 12, color: C.primary + 'AA', marginTop: 2 },
  baesArrow: { fontSize: 22, color: C.primary, fontWeight: '300' },
});
