# Qhay — Guía del repositorio

Qhay es una app móvil para Chile (React Native + Expo) que gestiona despensa, sugiere recetas y compara precios de supermercados (Jumbo, Líder, Santa Isabel, Unimarc, Alvi, M10). El repo es un monorepo simple con tres proyectos independientes que **no comparten `node_modules` ni build**:

| Carpeta | Qué es | Stack |
|---|---|---|
| `/` (raíz) | App móvil | React Native 0.81 + Expo 54 + TypeScript, React Navigation v7, Zustand, Supabase |
| `api/` | Backend de scraping | Node.js + Express (CommonJS, no TS), deploy en Vercel |
| `sitio-web/` | Landing + páginas legales | Astro 5 + TypeScript, CSS plano (sin framework de utilidades) |
| `supabase/` | Esquema y parches SQL | PostgreSQL (Supabase) |

No existe Next.js ni Tailwind CSS en este proyecto — el estilo en la app es `StyleSheet` de React Native vía `ThemeContext`/`useColors`, y el sitio web usa CSS plano en `.astro`.

## Arquitectura de la app móvil (`src/`)

- `components/` — componentes reutilizables, organizados por dominio (`common/`, `despensa/`, `lista/`, `recetas/`, `perfil/`, `auth/`, `legal/`, `home/`)
- `screens/` — pantallas por módulo, un directorio por sección de navegación
- `navigation/` — `AppNavigator`, `AuthNavigator`, `TabNavigator` (React Navigation v7)
- `store/` — Zustand: `authStore`, `despensaStore`, `listaStore`, `favoritosStore`
- `services/` — toda la lógica de acceso a datos externos (Supabase, OpenAI, scraping, boletas/OCR). Las pantallas y componentes **no** deben llamar a Supabase/OpenAI directamente: pasan siempre por un servicio en `services/`
- `context/` — `ThemeContext` (tema claro/oscuro, `useColors()`)
- `config/supabase.ts` — único punto de inicialización del cliente Supabase
- `hooks/`, `constants/`, `types/`, `utils/`, `legal/` — soporte transversal
- `__tests__/integration/` — tests de integración de servicios con Supabase mockeado

Nota: el `README.md` menciona Firebase en varias secciones; eso está desactualizado — la app usa **Supabase** (Auth + Postgres) como backend de datos, ver `src/config/supabase.ts` y `supabase/schema.sql`. No agregues dependencias de Firebase.

## Backend de scraping (`api/`)

- `src/index.js` — servidor Express único: caché en memoria (TTL 15 min), normalización de nombres de producto (`normalizarClave`) y combinación de resultados de todos los scrapers
- `src/scrapers/vtex.js` — helper compartido para los supermercados que corren sobre la plataforma VTEX (Jumbo, Santa Isabel, Unimarc, Alvi, M10); los archivos individuales (`jumbo.js`, `santaisabel.js`, etc.) son adaptadores delgados sobre `vtex.js`
- `src/scrapers/lider.js` — scraper independiente (Líder/Walmart no usa VTEX)
- Endpoints: `GET /buscar?q=`, `GET /health`, `POST /analizar-boleta` (OCR con GPT-4o Vision)
- JavaScript plano (CommonJS), sin TypeScript ni build step — se despliega tal cual a Vercel

## Base de datos (`supabase/`)

- `schema.sql` es la fuente de verdad del esquema; es **idempotente** (`create table if not exists`, `alter table add column if not exists`). Toda migración nueva debe seguir ese patrón, no reescribir el archivo desde cero
- Row Level Security (RLS) está en uso — funciones como `registrar_escaneo` usan `SECURITY INVOKER` + `auth.uid()` para que las políticas own-row apliquen
- `patch_feedbacks.sql` es un ejemplo de parche incremental separado del schema principal — sigue ese patrón para cambios pequeños y con fecha/sprint identificable en vez de tocar `schema.sql` a mitad de una feature grande

## Convenciones de código

- TypeScript en modo `strict` (`tsconfig.json` extiende `expo/tsconfig.base`). No relajar `strict` para evitar errores de tipos
- Nombres de dominio en español (`despensaStore`, `ProductoItem`, `buscarEnJumbo`, `normalizarClave`), en línea con el resto del código — sigue esa convención en código nuevo del dominio negocio; identificadores técnicos genéricos (`Button`, `Card`, `useAuth`) pueden quedar en inglés como ya está
- Comentarios cortos y solo donde el porqué no es obvio (ver estilo existente en `TerminosModal.tsx`, `index.js` del API) — no documentar lo que el código ya dice
- Sin ESLint/Prettier configurado en el repo — la validación de calidad se hace vía `tsc` y `jest`; no asumas reglas de lint que no existen
- No hay archivo `.env.example` — las variables de entorno esperadas están documentadas en `README.md` (prefijo `EXPO_PUBLIC_` para las que necesita el cliente Expo)

## Comandos

```bash
# App móvil (raíz)
npm start / npm run android / npm run ios / npm run web
npm test                      # Jest, corre solo src/__tests__/**/*.test.ts
npx tsc --noEmit               # chequeo de tipos

# API de scraping
cd api && npm run dev          # http://localhost:3000

# Sitio web
cd sitio-web && npm run dev
cd sitio-web && npm run check  # astro check (tipos + diagnósticos Astro)
```

## Reglas generales

- Cambios en `api/`, `sitio-web/` y la app móvil son independientes: no mezclar sus dependencias ni asumir que un `npm install` en la raíz instala las otras
- Antes de tocar `supabase/schema.sql`, revisar qué tablas/columnas ya existen — muchas features (planes, BAES, límites de escaneo) ya tienen columnas dedicadas en `profiles`
- Los scrapers de supermercados dependen de estructura HTML/API externa que puede cambiar sin aviso; al modificar un scraper, preferir tocar `vtex.js` si el cambio aplica a todos los supermercados VTEX en vez de duplicar lógica en cada adaptador
- Usa los subagentes especializados en `.claude/agents/` (`frontend-specialist`, `backend-specialist`, `data-engineer`, `qa-reviewer`) para tareas que caigan claramente en su dominio
