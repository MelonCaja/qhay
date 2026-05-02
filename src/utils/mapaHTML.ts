export interface DatosSuperHTML {
  lat: number;
  lng: number;
  nombre: string;
  brand: string;
  calle: string;
  horario: string;
}

/**
 * Genera el HTML de Leaflet + OpenStreetMap para el mapa de supermercados.
 * Los supermercados se pasan como datos pre-cargados (Overpass se llama desde RN).
 */
export function generarMapaHTML(lat: number, lng: number, supermercados: DatosSuperHTML[]): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #mapa { width: 100%; height: 100%; }
    .leaflet-popup-content { min-width: 190px; max-width: 230px; font-family: -apple-system, sans-serif; }
    .p-nombre { font-size: 15px; font-weight: 700; color: #16A34A; margin-bottom: 5px; line-height: 1.3; }
    .p-cadena { font-size: 11px; font-weight: 700; color: #fff; background: #16A34A; border-radius: 4px; padding: 2px 7px; display:inline-block; margin-bottom:6px; }
    .p-row { font-size: 12px; color: #555; margin-bottom: 3px; display:flex; gap:5px; align-items:flex-start; }
    .p-horario { font-size: 12px; color: #333; margin: 6px 0 4px 0; background:#f0fdf4; border-radius:6px; padding:6px 8px; line-height:1.5; }
    .p-horario-titulo { font-weight:700; color:#16A34A; margin-bottom:2px; font-size:11px; text-transform:uppercase; }
    .p-btn {
      margin-top: 10px;
      background: #16A34A;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
    }
    .p-btn:active { background: #15803d; }
    .cargando {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
      font-family: sans-serif; color: #16A34A; font-size: 14px; text-align: center;
      background: white; padding: 20px 28px; border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
  </style>
</head>
<body>
<div id="cargando" class="cargando">🔍 Buscando supermercados<br>cercanos...</div>
<div id="mapa"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var USER_LAT = ${lat};
  var USER_LNG = ${lng};

  var mapa = L.map('mapa', { zoomControl: true, attributionControl: false }).setView([USER_LAT, USER_LNG], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapa);

  // Marker usuario
  var iconoUsuario = L.divIcon({
    html: '<div style="background:#16A34A;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>',
    className: '', iconSize: [14, 14], iconAnchor: [7, 7],
  });
  L.marker([USER_LAT, USER_LNG], { icon: iconoUsuario })
    .addTo(mapa)
    .bindPopup('<b style="color:#16A34A">📍 Tu ubicación</b>');

  // Cadenas chilenas conocidas y sus colores
  var CADENAS = {
    'lider': { color: '#1d4ed8', emoji: '🔵' },
    'lider express': { color: '#1d4ed8', emoji: '🔵' },
    'acuenta': { color: '#7c3aed', emoji: '🟣' },
    'jumbo': { color: '#dc2626', emoji: '🔴' },
    'santa isabel': { color: '#ea580c', emoji: '🟠' },
    'unimarc': { color: '#0891b2', emoji: '🩵' },
    'mayorista alvi': { color: '#854d0e', emoji: '🟤' },
    'alvi': { color: '#854d0e', emoji: '🟤' },
    'mayorista 10': { color: '#374151', emoji: '⚫' },
  };

  function detectarCadena(nombre, brand) {
    var texto = ((nombre || '') + ' ' + (brand || '')).toLowerCase();
    for (var c in CADENAS) {
      if (texto.indexOf(c) !== -1) return { clave: c, ...CADENAS[c] };
    }
    return { clave: null, color: '#FF6F00', emoji: '🛒' };
  }

  function iconoSuper(color, emoji) {
    return L.divIcon({
      html: '<div style="background:' + color + ';color:white;font-size:16px;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)">' + emoji + '</div>',
      className: '', iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36],
    });
  }

  function calcularDistancia(lat1, lng1, lat2, lng2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat/2)*Math.sin(dLat/2) +
            Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
            Math.sin(dLng/2)*Math.sin(dLng/2);
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(2);
  }

  // Formatea opening_hours de OSM a texto legible
  function formatearHorario(oh) {
    if (!oh) return null;
    oh = oh.trim();
    // Reemplazos comunes del formato OSM
    var dias = { 'Mo': 'Lun', 'Tu': 'Mar', 'We': 'Mié', 'Th': 'Jue', 'Fr': 'Vie', 'Sa': 'Sáb', 'Su': 'Dom', 'PH': 'Festivos' };
    var resultado = oh;
    for (var d in dias) {
      resultado = resultado.replace(new RegExp(d, 'g'), dias[d]);
    }
    // Limpiar separadores
    resultado = resultado.replace(/;/g, '\n').replace(/,/g, ', ');
    return resultado;
  }

  function agregarMarker(datos) {
    var lat = datos.lat, lng = datos.lng;
    var nombre = datos.nombre;
    var brand = datos.brand || '';
    var calle = datos.calle || '';
    var horarioRaw = datos.horario || '';
    var horario = formatearHorario(horarioRaw);
    var dist = calcularDistancia(USER_LAT, USER_LNG, lat, lng);
    var cadena = detectarCadena(nombre, brand);

    var nombreDisplay = nombre;
    if (brand && brand !== nombre && nombre.toLowerCase().indexOf(brand.toLowerCase()) === -1) {
      nombreDisplay = brand;
    }

    var popupHTML = '<div class="p-nombre">' + nombreDisplay + '</div>';
    if (cadena.clave) {
      popupHTML += '<span class="p-cadena">' + cadena.clave.toUpperCase() + '</span>';
    }
    if (calle) popupHTML += '<div class="p-row"><span>📍</span><span>' + calle + '</span></div>';
    popupHTML += '<div class="p-row"><span>📏</span><span>' + dist + ' km</span></div>';

    if (horario) {
      var lineas = horario.split('\\n');
      popupHTML += '<div class="p-horario"><div class="p-horario-titulo">🕐 Horario</div>';
      lineas.forEach(function(l) { if (l.trim()) popupHTML += '<div>' + l.trim() + '</div>'; });
      popupHTML += '</div>';
    } else {
      popupHTML += '<div class="p-row" style="color:#aaa;font-style:italic"><span>🕐</span><span>Horario no disponible</span></div>';
    }

    popupHTML += '<button class="p-btn" onclick="seleccionar(' +
      JSON.stringify(nombreDisplay) + ',' +
      JSON.stringify(calle) + ',' +
      lat + ',' + lng + ',' +
      JSON.stringify(horarioRaw) + ',' +
      dist +
    ')">Seleccionar</button>';

    L.marker([lat, lng], { icon: iconoSuper(cadena.color, cadena.emoji) })
      .addTo(mapa)
      .bindPopup(popupHTML, { maxWidth: 240 });
  }

  function seleccionar(nombre, direccion, lat, lng, horario, dist) {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'seleccionar',
      nombre: nombre,
      direccion: direccion,
      lat: lat,
      lng: lng,
      horario: horario,
      distancia: dist,
    }));
  }

  // Supermercados pre-cargados desde React Native (Overpass se llama en RN)
  var SUPERMERCADOS = ${JSON.stringify(supermercados)};

  if (SUPERMERCADOS.length === 0) {
    document.getElementById('cargando').innerHTML = '⚠️ No se encontraron<br>supermercados cercanos';
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'supermercados',
      lista: [],
    }));
  } else {
    document.getElementById('cargando').style.display = 'none';
    var listaSuper = [];
    SUPERMERCADOS.forEach(function(datos) {
      agregarMarker(datos);
      var dist = parseFloat(calcularDistancia(USER_LAT, USER_LNG, datos.lat, datos.lng));
      listaSuper.push({
        nombre: datos.nombre,
        lat: datos.lat,
        lng: datos.lng,
        distancia: dist,
        horario: datos.horario,
        direccion: datos.calle,
      });
    });
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'supermercados',
      lista: listaSuper,
    }));
  }
</script>
</body>
</html>`;
}
