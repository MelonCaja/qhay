// DESHABILITADO — auditoría 2026-08-24 (curl/DNS/TLS) confirmó que la cuenta
// VTEX "alvi" ya no existe: el router Janus responde 404 REAL. El sitio real
// (alvi.cl) corre sobre infraestructura propia de SMU (cert TLS real:
// O=SMU S.A., CN=alvi.cl) detrás de Akamai, con 403 "Access Denied" en todas
// las rutas — bloqueo de borde total, no un bot-challenge simple.
//
// Comparte borde Akamai con Unimarc y Mayorista10 (ver unimarc.js) — mismo
// patrón, candidato a helper compartido nuevo (scrapers/smu.js) una vez
// identificado el endpoint real. No reintentar contra VTEX: no es el
// problema. Ver .claude/agents/data-engineer.md.
const buscarEnAlvi = async () => {
  throw new Error('Alvi temporalmente no disponible (scraper deshabilitado: cuenta VTEX obsoleta, endpoint real pendiente de investigación)');
};
module.exports = { buscarEnAlvi };
