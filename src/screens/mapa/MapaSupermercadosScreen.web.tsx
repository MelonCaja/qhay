import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, StatusBar,
} from 'react-native';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatearPrecio } from '../../utils/precioHelper';
import { FLUOR } from '../../constants/mapStyles';
import {
  useSupermercadosCercanos, esCadenaGrande, formatearHorario, SuperReal,
} from '../../hooks/useSupermercadosCercanos';

// En web no hay react-native-maps (usa internals nativos que no existen en
// el navegador y rompen el bundle entero) — esta es la vista equivalente:
// lista de sucursales cercanas con enlaces a Maps/Waze en vez de mapa embebido.

function urlGoogleMaps(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function urlWaze(lat: number, lng: number) {
  return `https://waze.com/ul?ll=${lat}%2C${lng}&navigate=yes`;
}

export function MapaSupermercadosScreen() {
  const C = useColors();
  const s = makeStyles(C);

  const {
    ubicacion, cargandoUbicacion, supermercados, error, solicitarUbicacion,
    optimo, recomendado, esOptimo, totalLista,
  } = useSupermercadosCercanos();

  if (cargandoUbicacion) return <LoadingSpinner pantalla mensaje="Obteniendo tu ubicación..." />;

  return (
    <View style={s.contenedor}>
      <StatusBar barStyle={C.bg === '#0D0F12' ? 'light-content' : 'dark-content'} />

      <View style={s.header}>
        <Text style={s.headerTitulo}>Supermercados cercanos</Text>
        <TouchableOpacity style={s.btnUbicacion} onPress={solicitarUbicacion}>
          <Text style={s.btnUbicacionTexto}>Actualizar ubicación</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={s.aviso}>{error} (usando Santiago centro como referencia)</Text>}

      <ScrollView contentContainerStyle={s.lista} showsVerticalScrollIndicator={false}>
        {/* Óptimo precio/distancia con costos reales, si hay lista de compras */}
        {optimo && (
          <View style={[s.card, { borderLeftColor: FLUOR }]}>
            <View style={s.cardBadgeFila}>
              <Text style={s.cardBadge}>⚡ Óptimo precio + distancia</Text>
              {optimo.saveLabel && (
                <View style={s.badgeAhorro}>
                  <Text style={s.badgeAhorroTexto}>{optimo.saveLabel}</Text>
                </View>
              )}
            </View>
            <Text style={s.cardNombre}>{optimo.market.nombre}</Text>
            <Text style={s.cardMeta}>
              📏 {optimo.distanceKm.toFixed(2)} km
              {optimo.market.direccion ? `  ·  📍 ${optimo.market.direccion}` : ''}
              {totalLista > 0 ? `  ·  Total est. ${formatearPrecio(totalLista)}` : ''}
            </Text>
            <View style={s.costosFila}>
              <View style={s.costoItem}>
                <Text style={s.costoLabel}>LISTA</Text>
                <Text style={s.costoValor}>{formatearPrecio(Math.round(optimo.totalCost))}</Text>
              </View>
              <View style={s.costoItem}>
                <Text style={s.costoLabel}>TRASLADO</Text>
                <Text style={s.costoValor}>{formatearPrecio(optimo.costoDesplazamiento)}</Text>
              </View>
              <View style={s.costoItem}>
                <Text style={s.costoLabel}>COSTO REAL</Text>
                <Text style={[s.costoValor, { color: C.primary }]}>
                  {formatearPrecio(optimo.costoTotalReal)}
                </Text>
              </View>
            </View>
            <View style={s.accionesFila}>
              <TouchableOpacity style={s.btnAccion} onPress={() => Linking.openURL(urlGoogleMaps(optimo.market.lat, optimo.market.lng))}>
                <Text style={s.btnAccionTexto}>Google Maps</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnAccion} onPress={() => Linking.openURL(urlWaze(optimo.market.lat, optimo.market.lng))}>
                <Text style={s.btnAccionTexto}>Waze</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Recomendado más cercano, si no hay lista de compras aún */}
        {!optimo && recomendado && (
          <View style={s.card}>
            <Text style={s.cardBadge}>⭐ Recomendado más cercano</Text>
            <Text style={s.cardNombre}>{recomendado.nombre}</Text>
            <Text style={s.cardMeta}>
              📏 {recomendado.distancia.toFixed(2)} km
              {recomendado.direccion ? `  ·  📍 ${recomendado.direccion}` : ''}
            </Text>
            <View style={s.accionesFila}>
              <TouchableOpacity style={s.btnAccion} onPress={() => Linking.openURL(urlGoogleMaps(recomendado.lat, recomendado.lng))}>
                <Text style={s.btnAccionTexto}>Google Maps</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnAccion} onPress={() => Linking.openURL(urlWaze(recomendado.lat, recomendado.lng))}>
                <Text style={s.btnAccionTexto}>Waze</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Lista completa de sucursales cercanas */}
        <Text style={s.seccionTitulo}>
          {supermercados.length === 0 ? 'Buscando supermercados cercanos...' : `${supermercados.length} sucursales cercanas`}
        </Text>

        {supermercados.map((super_: SuperReal, idx: number) => (
          <View key={idx} style={s.itemCard}>
            <View style={s.itemTop}>
              <View style={s.itemInfo}>
                <Text style={s.itemNombre}>{super_.nombre}</Text>
                <Text style={s.itemMeta}>
                  📏 {super_.distancia.toFixed(2)} km
                  {super_.direccion ? `  ·  📍 ${super_.direccion}` : ''}
                </Text>
              </View>
              {esOptimo(super_) && (
                <View style={s.badgeAhorro}>
                  <Text style={s.badgeAhorroTexto}>Óptimo</Text>
                </View>
              )}
              {!esOptimo(super_) && esCadenaGrande(super_.nombre) && (
                <View style={s.badgeCadena}>
                  <Text style={s.badgeCadenaTexto}>Cadena</Text>
                </View>
              )}
            </View>

            {super_.horario ? (
              <View style={s.horarioBox}>
                <Text style={s.horarioTitulo}>🕐 Horario</Text>
                {formatearHorario(super_.horario).split('\n').map((linea, i) => (
                  linea.trim() ? <Text key={i} style={s.horarioLinea}>{linea.trim()}</Text> : null
                ))}
              </View>
            ) : (
              <Text style={s.horarioSinDatos}>Horario no disponible en OpenStreetMap</Text>
            )}

            <View style={s.accionesFila}>
              <TouchableOpacity style={s.btnAccion} onPress={() => Linking.openURL(urlGoogleMaps(super_.lat, super_.lng))}>
                <Text style={s.btnAccionTexto}>Google Maps</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnAccion} onPress={() => Linking.openURL(urlWaze(super_.lat, super_.lng))}>
                <Text style={s.btnAccionTexto}>Waze</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: C.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  headerTitulo: { fontSize: 18, fontWeight: '800', color: C.text },
  aviso: { fontSize: 12, color: C.textMuted, fontStyle: 'italic', paddingHorizontal: 16, paddingTop: 8 },
  lista: { padding: 14, gap: 10, paddingBottom: 32, maxWidth: 640, width: '100%', alignSelf: 'center' },
  seccionTitulo: { fontSize: 13, fontWeight: '700', color: C.textMuted, marginTop: 4, marginBottom: -2 },

  card: {
    backgroundColor: C.primarySoft,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
    gap: 6,
  },
  cardBadgeFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardBadge: { fontSize: 10, color: C.primary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  cardNombre: { fontSize: 16, fontWeight: '800', color: C.text },
  cardMeta: { fontSize: 12, color: C.textMuted, marginTop: 2, lineHeight: 16 },

  badgeAhorro: {
    backgroundColor: '#4ADE8022', borderWidth: 1, borderColor: '#4ADE80',
    borderRadius: 100, paddingVertical: 3, paddingHorizontal: 10,
  },
  badgeAhorroTexto: { fontSize: 11, fontWeight: '800', color: '#16A34A' },
  badgeCadena: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 100, paddingVertical: 3, paddingHorizontal: 10,
  },
  badgeCadenaTexto: { fontSize: 11, fontWeight: '700', color: C.textMuted },

  costosFila: { flexDirection: 'row', gap: 8, marginTop: 8 },
  costoItem: { flex: 1, backgroundColor: C.surface, borderRadius: 10, paddingVertical: 8, alignItems: 'center', gap: 2 },
  costoLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, color: C.textMuted },
  costoValor: { fontSize: 13, fontWeight: '800', color: C.text },

  itemCard: {
    backgroundColor: C.surface, borderRadius: 14, padding: 14, gap: 8,
    borderWidth: 1, borderColor: C.border,
  },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  itemInfo: { flex: 1 },
  itemNombre: { fontSize: 15, fontWeight: '700', color: C.text },
  itemMeta: { fontSize: 12, color: C.textMuted, marginTop: 2, lineHeight: 16 },

  horarioBox: { backgroundColor: C.bg, borderRadius: 10, padding: 10, gap: 2 },
  horarioTitulo: { fontSize: 11, fontWeight: '700', color: C.primary, textTransform: 'uppercase', marginBottom: 3 },
  horarioLinea: { fontSize: 13, color: C.text, lineHeight: 18 },
  horarioSinDatos: { fontSize: 12, color: C.textMuted, fontStyle: 'italic' },

  accionesFila: { flexDirection: 'row', gap: 8, marginTop: 2 },
  btnAccion: {
    flex: 1, backgroundColor: C.bg, borderRadius: 100, paddingVertical: 9,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  btnAccionTexto: { fontSize: 13, color: C.primary, fontWeight: '700' },

  btnUbicacion: {
    backgroundColor: C.bg, borderRadius: 100, paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: C.border,
  },
  btnUbicacionTexto: { fontSize: 12, color: C.primary, fontWeight: '600' },
});
