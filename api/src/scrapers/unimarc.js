// DESHABILITADO — 2026-08-25. El scraper contra el BFF real de SMU
// (POST https://bff-unimarc-ecommerce.unimarc.cl/catalog/product/search,
// ver historial de este archivo) funciona correctamente en local — probado
// con node-fetch desde una IP residencial chilena, sin navegador — pero
// devuelve 403 "Access Denied" de Akamai cuando la petición sale desde la
// IP de datacenter de las Serverless Functions de Vercel. Confirmado
// pegándole directo al endpoint real desplegado, no es una suposición: el
// código nunca fue el problema.
//
// La hipótesis original (auditoría del scraper) — "es el fingerprint TLS
// de curl vs. node-fetch, no la IP" — resultó incompleta: Vercel también
// usa node-fetch y aun así lo bloquean. Akamai combina fingerprint TLS y
// reputación de IP; una IP de datacenter en EE.UU. sirviendo tráfico a un
// sitio retail chileno dispara el bloqueo por reputación aunque el resto
// sea idéntico a una petición legítima.
//
// No hay fix de código posible. Reactivar requeriría un proxy
// residencial/móvil chileno (servicio pago tipo Bright Data/Zyte — mismo
// tipo de solución descartada para Líder, ver lider.js). Decisión de
// producto (no técnica): deshabilitado por ahora en vez de intentar la
// request y fallar en cada búsqueda. Ver CLAUDE.md, sección "Estado de
// los scrapers por supermercado".
const buscarEnUnimarc = async () => {
  throw new Error('Unimarc temporalmente no disponible (bloqueado por reputación de IP de datacenter — código correcto, ver CLAUDE.md)');
};
module.exports = { buscarEnUnimarc };
