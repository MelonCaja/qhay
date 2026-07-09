import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { useDespensa } from '../../hooks/useDespensa';
import { useAuthStore } from '../../store/authStore';
import { useFavoritosStore } from '../../store/favoritosStore';
import { resumenGasto, perfilNutricional, GastoAgregado } from '../../services/analyticsService';
import { getRecetas } from '../../services/recipeService';
import { formatearPrecio } from '../../utils/precioHelper';
import { CATEGORIAS_LISTA } from '../../constants/categorias';
import { Receta } from '../../types/receta';

/** Hue único de barras — validado (banda de luminosidad + contraste) en claro y oscuro */
const BAR_HUE = '#16A34A';

const labelCategoria = (id: string): string =>
  CATEGORIAS_LISTA.find((c) => c.id === id)?.label ?? (id === 'sin_categoria' ? 'Sin categoría' : id);

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ── Barra horizontal minimalista: track recesivo, extremo de dato redondeado ──
function FilaBarra({ label, valor, pct, max, s }: {
  label: string;
  valor: string;
  pct: number;   // [0,100] del total (etiqueta)
  max: number;   // valor máximo del grupo (escala de la barra)
  s: ReturnType<typeof makeStyles>;
}) {
  const ancho = max > 0 ? Math.max((pct / max) * 100, 2) : 0;
  return (
    <View style={s.barraFila}>
      <View style={s.barraTextos}>
        <Text style={s.barraLabel} numberOfLines={1}>{label}</Text>
        <Text style={s.barraValor}>{valor} · {pct}%</Text>
      </View>
      <View style={s.barraTrack}>
        <View style={[s.barraFill, { width: `${ancho}%` as `${number}%` }]} />
      </View>
    </View>
  );
}

function GrupoBarras({ titulo, datos, labelDe, s }: {
  titulo: string;
  datos: GastoAgregado[];
  labelDe: (clave: string) => string;
  s: ReturnType<typeof makeStyles>;
}) {
  if (datos.length === 0) return null;
  const max = Math.max(...datos.map((d) => d.pct), 1);
  return (
    <View style={s.seccion}>
      <Text style={s.seccionTitulo}>{titulo}</Text>
      {datos.slice(0, 8).map((d) => (
        <FilaBarra
          key={d.clave}
          label={labelDe(d.clave)}
          valor={formatearPrecio(d.total)}
          pct={d.pct}
          max={max}
          s={s}
        />
      ))}
    </View>
  );
}

export function DashboardGastosScreen() {
  const C = useColors();
  const s = makeStyles(C);
  const { ingredientes } = useDespensa();
  const { usuario } = useAuthStore();
  const { esFavorito } = useFavoritosStore();
  const [recetas, setRecetas] = useState<Receta[]>([]);

  useEffect(() => {
    getRecetas(usuario?.plan ?? 'gratuito').then(setRecetas).catch(() => {});
  }, [usuario?.plan]);

  const gasto = useMemo(() => resumenGasto(ingredientes), [ingredientes]);
  const nutricion = useMemo(
    () => perfilNutricional(recetas.filter((r) => esFavorito(r.id))),
    [recetas, esFavorito]
  );

  const esPremium = usuario?.plan === 'premium';

  return (
    <View style={s.contenedor}>
      <StatusBar barStyle={C.bg === '#0D0F12' ? 'light-content' : 'dark-content'} backgroundColor={C.surface} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Stat tiles */}
        <View style={s.statsFila}>
          <View style={[s.statTile, s.statTileHero]}>
            <Text style={s.statLabel}>GASTO DESPENSA</Text>
            <Text style={s.statHero}>{formatearPrecio(gasto.total)}</Text>
            <Text style={s.statSub}>{gasto.items} ítems con precio</Text>
          </View>
          <View style={s.statTile}>
            <Text style={s.statLabel}>PROMEDIO / ÍTEM</Text>
            <Text style={s.statValor}>{formatearPrecio(gasto.promedioItem)}</Text>
          </View>
        </View>

        {!esPremium ? (
          /* Teaser Premium */
          <View style={s.teaser}>
            <Text style={s.teaserEmoji}>🔒</Text>
            <Text style={s.teaserTitulo}>Analíticas Premium</Text>
            <Text style={s.teaserSub}>
              Desglose de gasto por categoría y supermercado, y tu perfil
              nutricional según tus recetas favoritas.
            </Text>
            <View style={s.teaserBadge}>
              <Text style={s.teaserBadgeTexto}>★ Disponible en el plan Premium</Text>
            </View>
          </View>
        ) : (
          <>
            <GrupoBarras
              titulo="Gasto por categoría"
              datos={gasto.porCategoria}
              labelDe={labelCategoria}
              s={s}
            />
            <GrupoBarras
              titulo="Gasto por supermercado"
              datos={gasto.porSupermercado}
              labelDe={capitalizar}
              s={s}
            />

            {/* Nutrición (recetas favoritas) */}
            {nutricion && (
              <View style={s.seccion}>
                <Text style={s.seccionTitulo}>Perfil nutricional · favoritas</Text>
                <View style={s.nutriHeader}>
                  <Text style={s.nutriCal}>{nutricion.caloriasPromedio}</Text>
                  <Text style={s.nutriCalLabel}>
                    kcal promedio por porción · {nutricion.recetas} recetas
                  </Text>
                </View>
                {[
                  { label: `Proteínas · ${nutricion.proteinasPromedio}g`, pct: nutricion.pctProteinas },
                  { label: `Carbohidratos · ${nutricion.carbohidratosPromedio}g`, pct: nutricion.pctCarbohidratos },
                  { label: `Grasas · ${nutricion.grasasPromedio}g`, pct: nutricion.pctGrasas },
                ].map((m) => (
                  <FilaBarra
                    key={m.label}
                    label={m.label}
                    valor={`${m.pct}`}
                    pct={m.pct}
                    max={100}
                    s={s}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 40, gap: 14 },

  // Stat tiles
  statsFila: { flexDirection: 'row', gap: 10 },
  statTile: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    justifyContent: 'center',
    gap: 4,
  },
  statTileHero: { flex: 1.4 },
  statLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: C.textMuted },
  statHero: { fontSize: 26, fontWeight: '800', color: C.text },
  statValor: { fontSize: 20, fontWeight: '800', color: C.text },
  statSub: { fontSize: 11, color: C.textMuted },

  // Secciones de gráficos
  seccion: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 10,
  },
  seccionTitulo: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: C.textMuted,
    marginBottom: 2,
  },

  // Barras (marcas finas, track recesivo, extremo de dato redondeado)
  barraFila: { gap: 5 },
  barraTextos: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  barraLabel: { fontSize: 13, fontWeight: '600', color: C.text, flexShrink: 1 },
  barraValor: { fontSize: 12, fontWeight: '600', color: C.textMuted },
  barraTrack: {
    height: 10,
    borderRadius: 4,
    backgroundColor: C.border + '55',
    overflow: 'hidden',
  },
  barraFill: {
    height: '100%',
    backgroundColor: BAR_HUE,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },

  // Nutrición
  nutriHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 },
  nutriCal: { fontSize: 24, fontWeight: '800', color: C.text },
  nutriCalLabel: { fontSize: 12, color: C.textMuted, flexShrink: 1 },

  // Teaser Premium
  teaser: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  teaserEmoji: { fontSize: 36 },
  teaserTitulo: { fontSize: 17, fontWeight: '800', color: C.text },
  teaserSub: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19 },
  teaserBadge: {
    marginTop: 8,
    backgroundColor: C.primarySoft,
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  teaserBadgeTexto: { fontSize: 13, fontWeight: '700', color: C.primary },
});
