# Qhay — Guía del repositorio

Qhay es una app móvil para Chile (React Native + Expo) que gestiona despensa, sugiere recetas y compara precios de supermercados (Jumbo, Santa Isabel, Unimarc activos; Alvi y M10 deshabilitados temporalmente; Líder excluido por decisión de producto — ver "Estado de los scrapers" más abajo). El repo es un monorepo simple con tres proyectos independientes que **no comparten `node_modules` ni build**:

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
- `src/scrapers/vtex.js` — helper compartido para los supermercados que **sí** corren sobre VTEX (Jumbo, Santa Isabel). No asumas que un scraper nuevo usa VTEX solo porque el resto del holding lo hizo históricamente — verifícalo (ver estado por supermercado abajo)
- Endpoints: `GET /buscar?q=`, `GET /health`, `POST /analizar-boleta` (OCR con GPT-4o Vision), `POST /asistente` (asistente de cocina IA)
- JavaScript plano (CommonJS), sin TypeScript ni build step — se despliega tal cual a Vercel

### Estado de los scrapers por supermercado (auditoría 2026-08-24)

| Supermercado | Estado | Detalle |
|---|---|---|
| Jumbo | ✅ Activo | VTEX (`vtex.js`, cuenta `jumbo`) |
| Santa Isabel | ✅ Activo | VTEX (`vtex.js`, cuenta `santaisabel`) |
| Unimarc | ✅ Activo | **No usa VTEX** — la cuenta VTEX `unimarc` está obsolescente (404 real del router). Reconstruido contra el BFF propio de SMU: `POST https://bff-unimarc-ecommerce.unimarc.cl/catalog/product/search` (ver `src/scrapers/unimarc.js`). Descubierto por inspección de red con Playwright; funciona con `node-fetch` simple (sin navegador) — un intento con `curl` fue bloqueado (403 Akamai) con headers casi idénticos, la diferencia está en el fingerprint TLS de la herramienta, no en los headers. Los headers `session`/`anonymous` son tokens client-side sin validación server-side aparente
| Alvi | ⛔ Deshabilitado | Misma cuenta VTEX obsoleta que Unimarc + mismo borde Akamai (403 total, incluso `robots.txt`). Candidato a reactivar con el mismo patrón que Unimarc una vez confirmado su BFF — no investigado todavía |
| Mayorista 10 (M10) | ⛔ Deshabilitado | Igual que Alvi — mismo borde Akamai que Unimarc, no investigado todavía |
| Líder | ⛔ **Excluido del comparador (decisión de producto, no técnica temporal)** | Walmart Chile usa **PerimeterX/HUMAN Security**, no Akamai — challenge conductual ("press and hold") activo desde la primera petición, incluso con navegador headless completo e IP residencial chilena real. No es un problema de reputación de IP como Unimarc: es fingerprinting de comportamiento. Evadirlo requeriría simular interacción humana real o un servicio de terceros con proxies residenciales rotativos (tipo Bright Data/Zyte) — se decidió **no** incurrir en ese costo/riesgo por ahora. Alternativas a evaluar si se retoma: API de la app móvil de Walmart Chile, o un dataset/proveedor de precios de terceros. `src/scrapers/lider.js` queda deshabilitado con esta documentación in situ |

Todos los scrapers deshabilitados fallan rápido con un error descriptivo (no hacen la request de red) para no colgar `/buscar` esperando un timeout de un endpoint que se sabe muerto.

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

## Fase 1 — Web First

Decisión de estrategia (2026-08): antes de invertir en builds nativas de app store, priorizamos validar el producto en **web** (Expo Web sobre `react-native-web`) para conseguir feedback de usuarios reales más rápido. Implicaciones concretas:

- El criterio de "listo" para una pantalla nueva en este período es que funcione bien en navegador, no solo que compile para iOS/Android
- Varios módulos nativos que la app usa hoy no tienen equivalente directo en web y necesitan fallback explícito: `react-native-maps` (mapa de supermercados), `expo-camera` (escaneo de boletas — en web se reemplaza por `<input type="file" capture>`), `react-native-webview`, `expo-notifications`. Ver `.claude/agents/web-platform-specialist.md` para el detalle por módulo
- No existe todavía pipeline de deploy para la Expo Web app (sin script de export estático, sin destino de hosting configurado) ni CI/CD en el repo (`.github/workflows/` no existe) — ambos son trabajo pendiente de esta fase, no algo ya resuelto que solo haya que activar
- ✅ **Resuelto (2026-08-24)**: `src/services/openai.ts` y `src/services/boleta.ts` ya no llaman a OpenAI directo desde el cliente. Ambos pasan por `api/` (`POST /asistente`, `POST /analizar-boleta`), que usa `OPENAI_API_KEY` server-side. `EXPO_PUBLIC_OPENAI_API_KEY` ya no existe en el proyecto
- ✅ **Resuelto (2026-08-24)**: el flujo de OCR de boletas (`ScanearBoletaScreen.tsx`, modo "foto") ya funciona en web — en `Platform.OS === 'web'` usa `ImagePicker.launchImageLibraryAsync` (que el propio Expo implementa como `<input type="file" accept="image/*">` en navegador) en vez de `launchCameraAsync` (no soportado en web). El modo "código de barras" (`CameraView` de `expo-camera`, escaneo en vivo) no se tocó — `expo-camera` sí tiene su propio soporte web vía `getUserMedia`, es un caso distinto al de la foto de boleta
- 🚨 **Bloqueante nuevo, más grave de lo estimado inicialmente (encontrado 2026-08-24)**: `react-dom` y `react-native-web` **no estaban instalados** — `npm run web` fallaba antes de llegar a bundlear nada. Ya se instalaron. Con eso resuelto, el bundle web **falla igual al compilar por completo**: `AppNavigator.tsx` importa `MapaSupermercadosScreen` incondicionalmente, que importa `react-native-maps`, que usa internals de codegen nativo (`codegenNativeCommands`) inexistentes en web — esto no es un problema de una pantalla degradada, es un **crash de bundling que impide que la app cargue en el navegador en absoluto**. Hay que resolver esto antes de seguir con cualquier otra adaptación web: opciones son (a) lazy-import de `MapaSupermercadosScreen`/`react-native-maps` solo en plataformas nativas con una pantalla alternativa en web, o (b) reemplazar el mapa por una librería con soporte web real. Es una decisión de producto (qué mostrar en el mapa en web), no solo técnica — no resuelta todavía
- Para este trabajo usa `.claude/agents/web-platform-specialist.md` (UI/UX web, responsividad, adaptación de módulos nativos) y `.claude/agents/devops-specialist.md` (pipeline de deploy, CI/CD, variables de entorno)

## Reglas generales

- Cambios en `api/`, `sitio-web/` y la app móvil son independientes: no mezclar sus dependencias ni asumir que un `npm install` en la raíz instala las otras
- Antes de tocar `supabase/schema.sql`, revisar qué tablas/columnas ya existen — muchas features (planes, BAES, límites de escaneo) ya tienen columnas dedicadas en `profiles`
- Los scrapers de supermercados dependen de estructura HTML/API externa que puede cambiar sin aviso; al modificar un scraper, preferir tocar `vtex.js` si el cambio aplica a todos los supermercados VTEX en vez de duplicar lógica en cada adaptador
- Usa los subagentes especializados en `.claude/agents/` (`frontend-specialist`, `backend-specialist`, `data-engineer`, `qa-reviewer`, `web-platform-specialist`, `devops-specialist`) para tareas que caigan claramente en su dominio
