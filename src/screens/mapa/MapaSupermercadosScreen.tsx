import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Animated, Platform, StatusBar,
} from 'react-native';
import MapView, { Marker, Callout, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useListaStore } from '../../store/listaStore';
import { formatearPrecio } from '../../utils/precioHelper';
import { rankMarketsReal, MarketSummaryReal } from '../../services/shopOptimizer';
import { Supermercado } from '../../types/producto';
import { MAPA_CLARO, MAPA_OSCURO, FLUOR } from '../../constants/mapStyles';

// Cadenas grandes chilenas (para destacar en la recomendación)
const CADENAS_GRANDES = [
  'lider', 'lider express', 'acuenta', 'unimarc',
  'jumbo', 'santa isabel', 'mayorista alvi', 'alvi', 'mayorista 10',
];

function esCadenaGrande(nombre: string) {
  const n = nombre.toLowerCase();
  return CADENAS_GRANDES.some((c) => n.includes(c));
}

function calcularDistanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface SuperReal {
  nombre: string;
  lat: number;
  lng: number;
  distancia: number;
  horario?: string;
  direccion?: string;
}

interface Seleccionado {
  nombre: string;
  direccion: string;
  distancia: number;
  horario: string;
}

function formatearHorario(horario: string): string {
  if (!horario) return '';
  const dias: Record<string, string> = {
    Mo: 'Lun', Tu: 'Mar', We: 'Mié', Th: 'Jue',
    Fr: 'Vie', Sa: 'Sáb', Su: 'Dom', PH: 'Festivos',
  };
  let r = horario;
  Object.entries(dias).forEach(([en, es]) => {
    r = r.replace(new RegExp(en, 'g'), es);
  });
  return r.replace(/;/g, '\n').trim();
}

export function MapaSupermercadosScreen() {
  const C = useColors();
  const s = makeStyles(C);
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const [cargandoUbicacion, setCargandoUbicacion] = useState(true);
  const [supermercados, setSupermercados] = useState<SuperReal[]>([]);
  const [seleccionado, setSeleccionado] = useState<Seleccionado | null>(null);
  const panelAnim = useRef(new Animated.Value(0)).current;
  const { items } = useListaStore();

  // Motor precio/distancia: ranking por costo real (lista + desplazamiento)
  const rankingReal: MarketSummaryReal[] = (() => {
    if (!ubicacion || supermercados.length === 0 || items.length === 0) return [];
    const grandes = supermercados.filter((sup) => esCadenaGrande(sup.nombre));
    const fuente = grandes.length > 0 ? grandes : supermercados;
    const markets: Supermercado[] = fuente.map((sup, i) => ({
      id: `osm_${i}`,
      nombre: sup.nombre,
      direccion: sup.direccion ?? '',
      lat: sup.lat,
      lng: sup.lng,
      aceptaBAES: false,
      tipo: esCadenaGrande(sup.nombre) ? 'supermercado' : 'barrio',
      horario: sup.horario,
    }));
    return rankMarketsReal(ubicacion, items, markets);
  })();

  const optimo: MarketSummaryReal | null = rankingReal[0] ?? null;

  // Fallback sin lista de compras: cadenas grandes → más cercana
  const recomendado: SuperReal | null = (() => {
    if (supermercados.length === 0) return null;
    const grandes = supermercados.filter((sup) => esCadenaGrande(sup.nombre));
    const fuente = grandes.length > 0 ? grandes : supermercados;
    return [...fuente].sort((a, b) => a.distancia - b.distancia)[0];
  })();

  const esOptimo = (sup: SuperReal) =>
    !!optimo && optimo.market.lat === sup.lat && optimo.market.lng === sup.lng;

  useEffect(() => { solicitarUbicacion(); }, []);

  const solicitarUbicacion = async () => {
    setCargandoUbicacion(true);
    setSupermercados([]);
    setSeleccionado(null);
    let lat = -33.4372;
    let lng = -70.6506;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos tu ubicación para mostrar supermercados cercanos.');
      } else {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }
    } catch { /* usa Santiago por defecto */ }

    setUbicacion({ lat, lng });

    // Fetch Overpass
    try {
      const q = `[out:json][timeout:25];(`
        + `node["shop"="supermarket"](around:5000,${lat},${lng});`
        + `way["shop"="supermarket"](around:5000,${lat},${lng});`
        + `node["shop"="wholesale"](around:5000,${lat},${lng});`
        + `way["shop"="wholesale"](around:5000,${lat},${lng});`
        + `node["brand"~"Lider|Acuenta|Unimarc|Jumbo|Santa Isabel|Alvi|Mayorista 10",i](around:5000,${lat},${lng});`
        + `way["brand"~"Lider|Acuenta|Unimarc|Jumbo|Santa Isabel|Alvi|Mayorista 10",i](around:5000,${lat},${lng});`
        + `);out center;`;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'QhayApp/1.0' } });
      const data = await res.json();
      const vistos = new Set<string>();
      const lista: SuperReal[] = [];
      for (const el of (data.elements ?? [])) {
        const elLat: number = el.lat ?? el.center?.lat;
        const elLng: number = el.lon ?? el.center?.lon;
        if (!elLat || !elLng) continue;
        const tags = el.tags ?? {};
        const nombre: string = tags.name ?? tags.brand ?? 'Supermercado';
        const clave = `${nombre.toLowerCase()}_${elLat.toFixed(4)}_${elLng.toFixed(4)}`;
        if (vistos.has(clave)) continue;
        vistos.add(clave);
        const direccion = tags['addr:street']
          ? `${tags['addr:street']}${tags['addr:housenumber'] ? ' ' + tags['addr:housenumber'] : ''}`
          : (tags['addr:full'] ?? '');
        lista.push({
          lat: elLat,
          lng: elLng,
          nombre,
          distancia: calcularDistanciaKm(lat, lng, elLat, elLng),
          direccion,
          horario: tags['opening_hours'] ?? tags['opening_hours:covid19'] ?? '',
        });
      }
      setSupermercados(lista);
    } catch {
      setSupermercados([]);
    } finally {
      setCargandoUbicacion(false);
    }
  };

  const seleccionarSuper = (super_: SuperReal) => {
    setSeleccionado({
      nombre: super_.nombre,
      direccion: super_.direccion ?? '',
      distancia: super_.distancia,
      horario: super_.horario ?? '',
    });
    panelAnim.setValue(0);
    Animated.spring(panelAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
  };

  if (cargandoUbicacion) return <LoadingSpinner pantalla mensaje="Obteniendo tu ubicación..." />;

  const totalLista = items.reduce((acc, i) => acc + (i.precioEstimado ?? 0) * i.cantidad, 0);

  const region: Region | undefined = ubicacion
    ? { latitude: ubicacion.lat, longitude: ubicacion.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : undefined;

  return (
    <View style={s.contenedor}>
      <StatusBar barStyle={C.bg === '#0D0F12' ? 'light-content' : 'dark-content'} />

      {ubicacion && region && (
        <MapView
          style={{ flex: 1 }}
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton
          showsPointsOfInterest={false}
          customMapStyle={C.bg === '#0D0F12' ? MAPA_OSCURO : MAPA_CLARO}
        >
          {supermercados.map((super_, idx) => (
            <Marker
              key={idx}
              coordinate={{ latitude: super_.lat, longitude: super_.lng }}
              title={super_.nombre}
              description={super_.direccion}
              pinColor={esOptimo(super_) ? FLUOR : esCadenaGrande(super_.nombre) ? '#64748B' : '#A8A29E'}
              onPress={() => seleccionarSuper(super_)}
            >
              <Callout onPress={() => seleccionarSuper(super_)}>
                <View style={s.callout}>
                  <Text style={s.calloutNombre}>{super_.nombre}</Text>
                  {super_.direccion ? <Text style={s.calloutMeta}>{super_.direccion}</Text> : null}
                  <Text style={s.calloutMeta}>{super_.distancia.toFixed(2)} km</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      )}

      <View style={s.panel}>
        {/* Supermercado seleccionado por el usuario */}
        {seleccionado ? (
          <Animated.View style={[s.card, s.cardSelec, {
            transform: [{ scale: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
            opacity: panelAnim,
          }]}>
            <View style={s.cardTop}>
              <View style={s.cardTopIzq}>
                <Text style={s.cardBadge}>Seleccionado</Text>
                <Text style={s.cardNombre}>{seleccionado.nombre}</Text>
                <Text style={s.cardMeta}>
                  📏 {seleccionado.distancia.toFixed(2)} km
                  {seleccionado.direccion ? `  ·  📍 ${seleccionado.direccion}` : ''}
                  {totalLista > 0 ? `  ·  Total est. ${formatearPrecio(totalLista)}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSeleccionado(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={s.cerrar}>✕</Text>
              </TouchableOpacity>
            </View>

            {seleccionado.horario ? (
              <View style={s.horarioBox}>
                <Text style={s.horarioTitulo}>🕐 Horario</Text>
                {formatearHorario(seleccionado.horario).split('\n').map((linea, i) => (
                  linea.trim() ? <Text key={i} style={s.horarioLinea}>{linea.trim()}</Text> : null
                ))}
              </View>
            ) : (
              <Text style={s.horarioSinDatos}>Horario no disponible en OpenStreetMap</Text>
            )}
          </Animated.View>

        ) : optimo ? (
          /* Óptimo precio/distancia con costos reales */
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
            {optimo.itemsEstimados > 0 && (
              <Text style={s.costoNota}>
                {optimo.itemsEstimados} ítem{optimo.itemsEstimados > 1 ? 's' : ''} con precio estimado (sin stock confirmado)
              </Text>
            )}
          </View>

        ) : recomendado ? (
          /* Recomendación automática */
          <View style={s.card}>
            <Text style={s.cardBadge}>⭐ Recomendado más cercano</Text>
            <Text style={s.cardNombre}>{recomendado.nombre}</Text>
            <Text style={s.cardMeta}>
              📏 {recomendado.distancia.toFixed(2)} km
              {recomendado.direccion ? `  ·  📍 ${recomendado.direccion}` : ''}
            </Text>
            {recomendado.horario ? (
              <View style={s.horarioBox}>
                <Text style={s.horarioTitulo}>🕐 Horario</Text>
                {formatearHorario(recomendado.horario).split('\n').map((linea, i) => (
                  linea.trim() ? <Text key={i} style={s.horarioLinea}>{linea.trim()}</Text> : null
                ))}
              </View>
            ) : null}
          </View>

        ) : (
          <Text style={s.hint}>
            {supermercados.length === 0
              ? 'Buscando supermercados cercanos...'
              : 'Toca un supermercado en el mapa'}
          </Text>
        )}

        <TouchableOpacity style={s.btnUbicacion} onPress={solicitarUbicacion}>
          <Text style={s.btnUbicacionTexto}>Actualizar ubicación</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.bg },
  panel: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 14,
    gap: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 10,
  },
  card: {
    backgroundColor: C.primarySoft,
    borderRadius: 14,
    padding: 13,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
    gap: 6,
  },
  cardSelec: { borderLeftColor: C.primary },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTopIzq: { flex: 1 },
  cardBadge: { fontSize: 10, color: C.primary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  cardBadgeFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  badgeAhorro: {
    backgroundColor: '#4ADE8022',
    borderWidth: 1,
    borderColor: '#4ADE80',
    borderRadius: 100,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  badgeAhorroTexto: { fontSize: 11, fontWeight: '800', color: '#16A34A' },
  costosFila: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  costoItem: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
  },
  costoLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, color: C.textMuted },
  costoValor: { fontSize: 13, fontWeight: '800', color: C.text },
  costoNota: { fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginTop: 6 },
  cardNombre: { fontSize: 16, fontWeight: '800', color: C.text },
  cardMeta: { fontSize: 12, color: C.textMuted, marginTop: 2, lineHeight: 16 },
  cerrar: { fontSize: 15, color: C.textMuted, paddingTop: 2 },
  horarioBox: {
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    gap: 2,
  },
  horarioTitulo: { fontSize: 11, fontWeight: '700', color: C.primary, textTransform: 'uppercase', marginBottom: 3 },
  horarioLinea: { fontSize: 13, color: C.text, lineHeight: 18 },
  horarioSinDatos: { fontSize: 12, color: C.textMuted, fontStyle: 'italic' },
  hint: { fontSize: 13, color: C.textMuted, textAlign: 'center', paddingVertical: 6, fontStyle: 'italic' },
  btnUbicacion: {
    backgroundColor: C.bg,
    borderRadius: 100,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  btnUbicacionTexto: { fontSize: 13, color: C.primary, fontWeight: '600' },
  callout: { padding: 6, maxWidth: 200 },
  calloutNombre: { fontSize: 13, fontWeight: '700', color: '#111' },
  calloutMeta: { fontSize: 11, color: '#555', marginTop: 2 },
});
