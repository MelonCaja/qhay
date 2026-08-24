// DESHABILITADO — auditoría 2026-08-24 (curl/DNS/TLS) confirmó que la cuenta
// VTEX "walmartcl" ya no existe: el router Janus de VTEX responde 404 REAL
// (no un bloqueo transitorio ni un error de headers/rate-limit). Walmart Chile
// migró Lider a infraestructura propia (cert TLS real: ak-prod3.walmart.com),
// detrás de Akamai Bot Manager + Queue-it (sala de espera virtual) — bloquea
// incluso una petición simple a robots.txt.
//
// No reintentar contra VTEX: no es el problema. Para reactivar este scraper
// hace falta descubrir el endpoint BFF/GraphQL/mobile real (inspección con
// navegador headless o interceptar la app móvil con mitmproxy — ver
// .claude/agents/data-engineer.md). Hasta entonces, falla rápido y explícito
// en vez de colgar la búsqueda combinada esperando un timeout.
const buscarEnLider = async () => {
  throw new Error('Lider temporalmente no disponible (scraper deshabilitado: cuenta VTEX obsoleta, endpoint real pendiente de investigación)');
};
module.exports = { buscarEnLider };
