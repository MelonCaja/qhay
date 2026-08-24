import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { useListaStore } from '../store/listaStore';
import { rankMarketsReal, MarketSummaryReal } from '../services/shopOptimizer';
import { Supermercado } from '../types/producto';

/**
 * Datos + ranking precio/distancia de supermercados cercanos, compartido
 * entre MapaSupermercadosScreen.native.tsx (mapa) y .web.tsx (lista) — la
 * única diferencia entre plataformas es la UI, no de dónde salen los datos.
 * expo-location y el fetch a Overpass funcionan igual en ambas.
 */

// Cadenas grandes chilenas (para destacar en la recomendación)
const CADENAS_GRANDES = [
  'lider', 'lider express', 'acuenta', 'unimarc',
  'jumbo', 'santa isabel', 'mayorista alvi', 'alvi', 'mayorista 10',
];

export function esCadenaGrande(nombre: string) {
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

export interface SuperReal {
  nombre: string;
  lat: number;
  lng: number;
  distancia: number;
  horario?: string;
  direccion?: string;
}

export function formatearHorario(horario: string): string {
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

export function useSupermercadosCercanos() {
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const [cargandoUbicacion, setCargandoUbicacion] = useState(true);
  const [supermercados, setSupermercados] = useState<SuperReal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { items } = useListaStore();

  const solicitarUbicacion = async () => {
    setCargandoUbicacion(true);
    setSupermercados([]);
    setError(null);
    let lat = -33.4372;
    let lng = -70.6506;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Necesitamos tu ubicación para mostrar supermercados cercanos.');
      } else {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }
    } catch { /* usa Santiago por defecto */ }

    setUbicacion({ lat, lng });

    // Fetch Overpass (OpenStreetMap)
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
      lista.sort((a, b) => a.distancia - b.distancia);
      setSupermercados(lista);
    } catch {
      setSupermercados([]);
    } finally {
      setCargandoUbicacion(false);
    }
  };

  useEffect(() => { solicitarUbicacion(); }, []);

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

  const totalLista = items.reduce((acc, i) => acc + (i.precioEstimado ?? 0) * i.cantidad, 0);

  return {
    ubicacion, cargandoUbicacion, supermercados, error, solicitarUbicacion,
    optimo, recomendado, esOptimo, totalLista,
  };
}
