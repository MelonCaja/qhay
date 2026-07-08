/**
 * Estilos de mapa limpios (estética Apple/macOS): sin POIs ruidosos,
 * paleta desaturada, tipografía discreta. Aplica en Android (Google Maps);
 * en iOS el mapa nativo de Apple ya cumple la estética.
 */

/** Verde flúor para acentos de oferta/ahorro sobre el mapa */
export const FLUOR = '#4ADE80';

export const MAPA_CLARO = [
  { elementType: 'geometry', stylers: [{ color: '#F5F5F4' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6B7280' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#E3EFE3' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#FAFAF9' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#F0EFEE' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#CBE1F0' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#E7E5E4' }] },
];

export const MAPA_OSCURO = [
  { elementType: 'geometry', stylers: [{ color: '#111113' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8A8A93' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#09090B' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#132015' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1C1C1F' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#26262A' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0E1A24' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#27272A' }] },
];
