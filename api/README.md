# Qhay API — Scraping de precios

Backend que consulta las APIs públicas de Jumbo, Lider, Santa Isabel y Unimarc.

## Desarrollo local

```bash
cd api
npm install
npm run dev
# → http://localhost:3000
```

Prueba:
```bash
curl "http://localhost:3000/buscar?q=leche"
curl "http://localhost:3000/health"
```

## Deploy en Vercel (gratuito)

```bash
cd api
npx vercel deploy --prod
```

Una vez desplegado, copia la URL (ej: `https://qhay-api.vercel.app`) y pégala en:

```typescript
// src/config/api.ts
export const API_BASE_URL = 'https://qhay-api.vercel.app';
```

Configura además `OPENAI_API_KEY` como variable de entorno del proyecto en Vercel — la usan `POST /analizar-boleta` y `POST /asistente` server-side. Sin ella, ambos endpoints responden `503`.

## Deploy en Railway

1. Sube la carpeta `api/` a un repositorio GitHub
2. En [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Copia la URL del servicio y úsala en `SCRAPING_API_URL`

## Notas

- Si la API falla o `SCRAPING_API_URL` está vacío, la app usa datos mock automáticamente.
- Los scrapers usan las APIs VTEX de Jumbo/Santa Isabel/Unimarc (plataforma en común)
  y la API interna de Lider/Walmart.
- Si un supermercado bloquea las requests, el resto sigue funcionando.
