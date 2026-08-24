# Qhay API — Scraping de precios

Backend Express que consulta las APIs públicas/BFF de los supermercados. Todas las rutas cuelgan de `/api` (ver `src/index.js`) — es el mismo servidor que usa tanto el deploy standalone de esta carpeta como el deploy unificado en la raíz del repo (ver "Deploy en Vercel" abajo).

## Desarrollo local

```bash
cd api
npm install
npm run dev
# → http://localhost:3000
```

Prueba:
```bash
curl "http://localhost:3000/api/buscar?q=leche"
curl "http://localhost:3000/api/health"
```

## Deploy en Vercel

Hay dos formas de desplegar este servidor — no son excluyentes, pero **la unificada es la recomendada**:

### Unificado (recomendado)

El `vercel.json` de la raíz del repo despliega esta API junto con el export estático de Expo Web en un solo proyecto de Vercel, enrutando `/api/*` aquí. Ver la sección "Despliegue en Vercel" de `CLAUDE.md` para el detalle completo (variables de entorno, pasos de Preview Deployment). No hace falta hacer nada distinto desde `api/` para esto — el `vercel.json` raíz ya apunta a `api/src/index.js`.

### Standalone (legacy/opcional)

Si se necesita la API sola, en su propio proyecto de Vercel:

```bash
cd api
npx vercel deploy --prod
```

Copia la URL resultante (ej: `https://qhay-api.vercel.app`) y actualiza:

```typescript
// src/config/api.ts (raíz del repo)
export const API_BASE_URL = 'https://qhay-api.vercel.app/api'; // con /api al final
```

En ambos modos, configura `OPENAI_API_KEY` como variable de entorno del proyecto en Vercel — la usan `POST /api/analizar-boleta` y `POST /api/asistente` server-side. Sin ella, ambos endpoints responden `503`.

## Notas

- Los scrapers usan las APIs VTEX de Jumbo y Santa Isabel (plataforma en común), un BFF propio de SMU para Unimarc, y Alvi/Mayorista 10/Líder están deshabilitados por ahora — ver "Estado de los scrapers por supermercado" en `CLAUDE.md` para el detalle y por qué
- Si un supermercado falla o está deshabilitado, el resto sigue funcionando (`Promise.allSettled` en `/api/buscar`) — no hay fallback a datos mock, simplemente ese supermercado no aporta resultados
