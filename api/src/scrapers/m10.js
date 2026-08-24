// DESHABILITADO — auditoría 2026-08-24 (curl/DNS/TLS) confirmó que la cuenta
// VTEX "m10" ya no existe: el router Janus responde 404 REAL. El sitio real
// (mayorista10.cl, cert TLS: CN=mayorista10.cl) comparte borde Akamai e IP con
// unimarc.cl, con 403 "Access Denied" en todas las rutas — bloqueo de borde
// total, no un bot-challenge simple.
//
// M10 es parte del holding SMU (acepta BAES en varios locales) y comparte
// exactamente la misma infraestructura que Unimarc y Alvi (ver unimarc.js) —
// candidato a helper compartido nuevo (scrapers/smu.js) una vez identificado
// el endpoint real. No reintentar contra VTEX: no es el problema. Ver
// .claude/agents/data-engineer.md.
const buscarEnM10 = async () => {
  throw new Error('Mayorista 10 temporalmente no disponible (scraper deshabilitado: cuenta VTEX obsoleta, endpoint real pendiente de investigación)');
};
module.exports = { buscarEnM10 };
