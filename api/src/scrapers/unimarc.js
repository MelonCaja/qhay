// DESHABILITADO — auditoría 2026-08-24 (curl/DNS/TLS) confirmó que la cuenta
// VTEX "unimarc" apunta a un ELB de AWS huérfano que cuelga hasta agotar el
// timeout (10s) sin responder — comportamiento típico de un endpoint
// abandonado, no de un bloqueo normal. El sitio real (unimarc.cl) corre sobre
// infraestructura propia de SMU (cert TLS real: checkout-frontend.smu-service.cl)
// detrás de Akamai, con 403 "Access Denied" en TODAS las rutas, incluido
// robots.txt — bloqueo de borde total (WAF/reputación de IP), no un
// bot-challenge simple.
//
// Unimarc, Alvi y Mayorista10 comparten exactamente el mismo borde Akamai
// (IPs superpuestas) — si se descubre el endpoint real de uno, probablemente
// aplica el mismo patrón a los otros dos. Candidato: un helper compartido
// nuevo tipo scrapers/smu.js (análogo a vtex.js) una vez identificado. No
// reintentar contra VTEX: no es el problema. Ver .claude/agents/data-engineer.md.
const buscarEnUnimarc = async () => {
  throw new Error('Unimarc temporalmente no disponible (scraper deshabilitado: cuenta VTEX obsoleta, endpoint real pendiente de investigación)');
};
module.exports = { buscarEnUnimarc };
