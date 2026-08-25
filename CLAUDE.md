# Qhay — Guía del repositorio

Qhay es una app móvil para Chile (React Native + Expo) que gestiona despensa, sugiere recetas y compara precios de supermercados (Jumbo y Santa Isabel activos; Unimarc, Alvi y M10 deshabilitados por bloqueo de Akamai; Líder excluido por decisión de producto — ver "Estado de los scrapers" más abajo). El repo es un monorepo simple con tres proyectos independientes que **no comparten `node_modules` ni build**:

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

**No infieras "correo duplicado" desde `data.user.identities` en `signUp()`.** El objeto de usuario "ofuscado" (identities vacío, sin error) que Supabase devuelve para un correo ya registrado solo está garantizado cuando **Confirm email Y Confirm phone** están ambos habilitados en el proyecto (documentado en `node_modules/@supabase/auth-js/src/GoTrueClient.ts`, remarks de `signUp`) — con Confirm phone deshabilitado (normal sin auth por teléfono, como este proyecto), un duplicado real ya lanza un `error` explícito (`code: user_already_exists`), que sí hay que capturar. Un heurístico basado en `identities.length === 0` causó un incidente real (2026-08-25): falsos positivos de "ya existe una cuenta" con correos nuevos sobre una base de datos vacía — ver `src/services/auth.ts` y el test de regresión en `userFlow.test.ts`. El único duplicado confiable es el que Supabase reporta como error.

## Backend de scraping (`api/`)

- `src/index.js` — servidor Express único: caché en memoria (TTL 15 min), normalización de nombres de producto (`normalizarClave`) y combinación de resultados de todos los scrapers
- `src/scrapers/vtex.js` — helper compartido para los supermercados que **sí** corren sobre VTEX (Jumbo, Santa Isabel). No asumas que un scraper nuevo usa VTEX solo porque el resto del holding lo hizo históricamente — verifícalo (ver estado por supermercado abajo)
- Endpoints (todos bajo `/api`, ver "Despliegue en Vercel" más abajo): `GET /api/buscar?q=`, `GET /api/health`, `POST /api/analizar-boleta` (OCR con GPT-4o Vision), `POST /api/asistente` (asistente de cocina IA). En dev local (`cd api && npm run dev`) también aplica el prefijo: `http://localhost:3000/api/buscar`
- JavaScript plano (CommonJS), sin TypeScript ni build step — se despliega tal cual a Vercel

### Estado de los scrapers por supermercado (auditoría 2026-08-24)

| Supermercado | Estado | Detalle |
|---|---|---|
| Jumbo | ✅ Activo | VTEX (`vtex.js`, cuenta `jumbo`) |
| Santa Isabel | ✅ Activo | VTEX (`vtex.js`, cuenta `santaisabel`) |
| Unimarc | ⛔ **Deshabilitado (código correcto, bloqueado en producción — confirmado 2026-08-25)** | El scraper (`src/scrapers/unimarc.js`, BFF `POST https://bff-unimarc-ecommerce.unimarc.cl/catalog/product/search`) funciona perfecto en local (IP residencial chilena de este entorno de desarrollo) pero devuelve 403 ("acceso restringido") desde la IP de datacenter de las Serverless Functions de Vercel — confirmado pegándole directo al endpoint real desplegado, no es una suposición. La sospecha original ("es el fingerprint TLS de curl vs. node-fetch") era incompleta: Vercel también usa `node-fetch`, y aun así lo bloquean — Akamai combina fingerprint TLS y reputación de IP, y una IP de datacenter en EE.UU. sirviendo tráfico a un sitio retail chileno dispara el bloqueo por reputación aunque el resto sea idéntico. No hay fix de código posible para esto — requeriría un proxy residencial/móvil chileno (servicio pago tipo Bright Data/Zyte, mismo tipo de solución descartada para Líder). Deshabilitado por decisión de producto (2026-08-25, mismo criterio que Líder) en vez de intentar la request y fallar en cada búsqueda — el código del scraper queda intacto en el archivo, comentado como referencia, listo para reactivar si se contrata un proxy residencial
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
- **Nunca importes `Alert` de `react-native`** — no funciona en web (no-op silencioso, ver "Fase 1 — Web First"). Usa `mostrarAlerta` de `src/utils/alert.ts` (misma firma que `Alert.alert`), funciona en las tres plataformas

## Comandos

```bash
# App móvil (raíz)
npm start / npm run android / npm run ios / npm run web
npm run build                  # expo export -p web → dist/ (lo que despliega Vercel)
npm test                       # Jest, corre solo src/__tests__/**/*.test.ts
npx tsc --noEmit                # chequeo de tipos

# API de scraping
cd api && npm run dev          # http://localhost:3000 (rutas bajo /api, ver arriba)

# Sitio web
cd sitio-web && npm run dev
cd sitio-web && npm run check  # astro check (tipos + diagnósticos Astro)
```

## Despliegue en Vercel

Trabajamos 100% en la nube — sin servidores locales de referencia. El proyecto tiene **dos formas de desplegar `api/`**, no las mezcles:

1. **Deploy unificado (raíz, recomendado)** — `vercel.json` en la raíz del repo. Un solo proyecto de Vercel sirve el export estático de Expo Web (`npm run build` → `dist/`) para todo, y enruta `/api/*` al mismo Express de `api/src/index.js` vía `@vercel/node`. Esto es lo que da Preview Deployments automáticos por rama/PR y producción en un solo flujo — **este es el que se usa en adelante**.
2. **Deploy standalone de `api/` (legacy/opcional)** — `api/vercel.json`, proyecto de Vercel aparte con Root Directory = `api/`. Sigue funcionando si alguna vez se necesita la API sola en su propio dominio, pero no es el flujo principal.

Como ambos comparten el mismo `api/src/index.js` (rutas montadas bajo `/api` vía `express.Router()`), si se usa el deploy standalone su URL pública también queda bajo `/api/*` (ej. `https://<proyecto-api>.vercel.app/api/buscar`), no en la raíz del dominio.

`src/config/api.ts` (`API_BASE_URL`) es el único lugar que apunta al dominio de producción — actualízalo ahí si cambia (nunca hardcodees la URL en `scraping.ts`/`openai.ts`/`boleta.ts`).

### Variables de entorno a registrar en el panel de Vercel

Solo 3 — confirmadas por `grep -rn "process.env" src api/src`, no inventes nombres que no estén en el código:

| Variable | Dónde se usa | Alcance |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `src/config/supabase.ts` | **Build-time** (Expo la inlinea en el bundle al exportar, como `NEXT_PUBLIC_*` en Next.js) — regístrala para los entornos Production **y** Preview, o los Preview Deployments van a servir un bundle sin Supabase configurado |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `src/config/supabase.ts` | Build-time, igual que arriba |
| `OPENAI_API_KEY` | `api/src/index.js` (`POST /api/analizar-boleta`, `POST /api/asistente`) | Runtime, function de Node — no necesita estar presente en el build, solo en ejecución |

`PORT` y `NODE_ENV` no se configuran manualmente — Vercel los provee automáticamente en las Serverless Functions. `EXPO_PUBLIC_OPENAI_API_KEY` **no existe** en el proyecto (se eliminó deliberadamente, ver "Fase 1 — Web First" abajo) — no la agregues.

### Pasos para desplegar una rama de prueba (Preview Deployment)

1. En el dashboard de Vercel: **New Project** → importar el repo → Root Directory = raíz del repo (no `api/`) → Vercel detecta `vercel.json` y respeta sus `builds`, no necesitas configurar Build Command/Output Directory a mano
2. **Settings → Environment Variables**: agrega las 3 variables de la tabla de arriba, marcando **Production, Preview y Development** (al menos Production + Preview) para cada una
3. Push a cualquier rama que no sea la de producción (o abre un PR) → Vercel genera automáticamente un Preview Deployment con su propia URL (`<proyecto>-<hash>.vercel.app`)
4. Verifica el deploy: `<preview-url>/` debe cargar la app web, `<preview-url>/api/health` debe responder `{"ok":true,...}`
5. Merge/push a la rama de producción configurada en Vercel (normalmente `master`) → mismo build, deploy a producción con el dominio definitivo

No validado contra el pipeline de build real de Vercel desde este entorno (`vercel build` requiere `vercel login` + proyecto vinculado, que no corresponde hacer sin la cuenta real del usuario) — sí se validó localmente: `npm run build` genera `dist/` correctamente, `npx tsc --noEmit` limpio, y el servidor Express responde bien bajo `/api/*`.

**Pendiente de dashboard, no de código (auditoría 2026-08-25)**: el login con Google (`loginConGoogle` en `services/auth.ts`) en web resuelve el redirect dinámicamente a `window.location.origin + '/auth'` (confirmado en el código fuente de `expo-auth-session`, sin nada hardcodeado). Para que funcione en producción, el dominio real (ej. `https://qhay.cl/**`) tiene que estar en Supabase → Auth → URL Configuration → Redirect URLs, junto a `qhay://**` y `exp://**` — si solo están esos dos, el login con Google en la web desplegada falla con redirect_uri no permitido. No se puede verificar ni corregir desde el repo.

### `sitio-web/` es un proyecto de Vercel APARTE — no se fusiona con el de arriba

`sitio-web/` (landing + `/privacidad` + `/terminos`, Astro) se despliega como su **propio proyecto de Vercel**, independiente del unificado (app Expo + `api/`). Decisión explícita (2026-08-24): se evaluó fusionar ambos en un solo `vercel.json` sirviendo `sitio-web/` bajo un subpath (ej. `/landing`), pero se descartó — con múltiples `builds` de tipo `@vercel/static-build` en un mismo `vercel.json`, no hay forma de verificar sin una cuenta de Vercel real conectada cómo se resuelve una posible colisión entre los `index.html` de cada build (el de la app Expo y el de la landing), y el riesgo de que uno pise al otro en producción no vale la pena frente a la alternativa simple. Dos proyectos separados es además el patrón que Vercel recomienda para monorepos con apps no relacionadas.

**Causa raíz de un incidente real (2026-08-24)**: tras crear el `vercel.json` unificado, `www.qhay.cl` seguía sirviendo la landing de Astro — el build tardaba ~9s (tiempo de un `astro build`, no de un `expo export` que bundlea ~850 módulos). Causa: el proyecto de Vercel históricamente conectado al dominio `qhay.cl` tiene su **Root Directory apuntando a `sitio-web/`** — nunca llegó a leer el `vercel.json` de la raíz del repo, porque con Root Directory = `sitio-web/`, ESE se convierte en el directorio raíz que Vercel usa para todo (incluida la búsqueda de `vercel.json`). No es algo que un cambio de archivo en el repo pueda arreglar — es una configuración del proyecto en el dashboard, fuera de control de versiones.

**Setup correcto (dos proyectos)**:

1. Proyecto A (`sitio-web/`) — el que ya existe y funciona hoy. Root Directory = `sitio-web/`. Déjalo con el dominio que corresponda a la landing/legal (puede seguir siendo `qhay.cl` temporalmente durante la migración, o pasar a algo como `landing.qhay.cl`, o quedar solo en su URL `*.vercel.app` si ya no hace falta un dominio propio)
2. Proyecto B (app Expo + `api/`) — proyecto nuevo, Root Directory = raíz del repo (Vercel detecta el `vercel.json` de la raíz automáticamente). Es al que hay que mover el dominio `qhay.cl`/`www.qhay.cl` para que la app interactiva sea lo que se sirve ahí
3. En el dashboard: **Proyecto B → Settings → Domains → Add** `qhay.cl` (y `www.qhay.cl`). Si el dominio ya está asignado al Proyecto A, Vercel pide confirmar el traspaso — cuando se acepta, dejar de estar en A y pasa a B
4. Verificar tras el traspaso: `qhay.cl/` debe cargar la app (comparador/escáner/mapa), `qhay.cl/api/health` debe responder `{"ok":true,...}` — si el Proyecto A todavía tenía un dominio propio, sus URLs (`/`, `/privacidad`, `/terminos`) siguen intactas ahí, sin cambios de código

## Fase 1 — Web First

Decisión de estrategia (2026-08): antes de invertir en builds nativas de app store, priorizamos validar el producto en **web** (Expo Web sobre `react-native-web`) para conseguir feedback de usuarios reales más rápido. Implicaciones concretas:

- El criterio de "listo" para una pantalla nueva en este período es que funcione bien en navegador, no solo que compile para iOS/Android
- Varios módulos nativos que la app usa hoy no tienen equivalente directo en web y necesitan fallback explícito: `react-native-maps` (✅ resuelto, ver abajo), `expo-camera`/OCR de boletas (✅ resuelto, ver abajo), `react-native-webview`, `expo-notifications` (pendientes). Patrón establecido para estos casos: split por extensión de plataforma (`Pantalla.native.tsx` / `Pantalla.web.tsx`, sin `.tsx` plano) con la lógica de datos no-UI extraída a un hook compartido — así el módulo nativo problemático nunca se importa en el bundle web. Ver `.claude/agents/web-platform-specialist.md` para el detalle por módulo
- No existe todavía pipeline de deploy para la Expo Web app (sin script de export estático, sin destino de hosting configurado) ni CI/CD en el repo (`.github/workflows/` no existe) — ambos son trabajo pendiente de esta fase, no algo ya resuelto que solo haya que activar
- ✅ **Resuelto (2026-08-24)**: `src/services/openai.ts` y `src/services/boleta.ts` ya no llaman a OpenAI directo desde el cliente. Ambos pasan por `api/` (`POST /asistente`, `POST /analizar-boleta`), que usa `OPENAI_API_KEY` server-side. `EXPO_PUBLIC_OPENAI_API_KEY` ya no existe en el proyecto
- ✅ **Resuelto (2026-08-24)**: el flujo de OCR de boletas (`ScanearBoletaScreen.tsx`, modo "foto") ya funciona en web — en `Platform.OS === 'web'` usa `ImagePicker.launchImageLibraryAsync` (que el propio Expo implementa como `<input type="file" accept="image/*">` en navegador) en vez de `launchCameraAsync` (no soportado en web). El modo "código de barras" (`CameraView` de `expo-camera`, escaneo en vivo) no se tocó — `expo-camera` sí tiene su propio soporte web vía `getUserMedia`, es un caso distinto al de la foto de boleta
- ✅ **Resuelto (2026-08-24)**: `react-dom`/`react-native-web` no estaban instalados (`npm run web` fallaba antes de bundlear nada) — instalados. El bundle web también fallaba por completo por `react-native-maps` (usa `codegenNativeCommands`, inexistente en web) importado sin condición vía `AppNavigator` → pantalla del mapa. Resuelto con split por extensión de plataforma: `src/screens/mapa/MapaSupermercadosScreen.native.tsx` (mapa intacto, sin cambios) y `.web.tsx` (lista de sucursales con dirección/horario + enlaces a Google Maps/Waze, sin `react-native-maps`). Lógica de datos compartida en `src/hooks/useSupermercadosCercanos.ts`. `tsconfig.json` necesitó `moduleSuffixes` para que `tsc` resuelva estos archivos igual que Metro. Verificado: `npm run web` bundlea 856 módulos sin errores, `index.html` y el bundle JS cargan (200 OK)
- ✅ **Resuelto (2026-08-24)**: el build de producción (`npm run build` = `expo export -p web`) tiraba `Uncaught SyntaxError: import.meta may only appear in a module` en el navegador — el HTML de Expo carga el bundle como `<script>` clásico, no como módulo ES. Causa: Expo SDK 54 trae `unstable_enablePackageExports: true` por defecto en Metro (el comentario viejo en `metro.config.js` que decía lo contrario estaba desactualizado); con eso activo, `import { persist } from 'zustand/middleware'` resuelve al build ESM de zustand (`esm/middleware.mjs`, condition `"import"` de su `exports` map) en vez del CJS (`middleware.js`), y ese `.mjs` usa `import.meta.env` crudo (detección de Vite en su middleware `devtools`, que ni siquiera usamos — solo importamos `persist`, pero Metro bundlea el archivo completo, no hace tree-shaking por export). `metro.config.js` ahora fuerza `resolver.resolveRequest` a resolver `zustand/middleware` directo al archivo `.js` (CJS), sin pasar por el mecanismo de "exports". Verificado con `grep -c "import.meta"` sobre el bundle real de `dist/_expo/static/js/web/*.js`: 1 → 0, y `node --check` sobre el bundle confirma sintaxis válida como script clásico. Si aparece el mismo error con otro paquete en el futuro, diagnostica igual: buildear y grepear el bundle de salida
- ✅ **Resuelto (2026-08-24)**: `Alert.alert` de `react-native` **no funciona en web** — `react-native-web` lo implementa como no-op literal (`static alert() {}`). Cualquier feedback de la app (confirmaciones, errores) que pasara por `Alert.alert` desaparecía en silencio en el navegador: la acción SÍ corría, pero el usuario nunca veía el resultado — así se manifestó como "el botón de registro no hace nada" (el signUp corría igual, el error se lanzaba, pero el `Alert.alert('Error', ...)` del catch no dejaba rastro visible). Afectaba a **14 archivos** en toda la app, no solo auth. Fix: `src/utils/alert.ts` (`mostrarAlerta`, misma firma que `Alert.alert`) + `src/components/common/WebAlertHost.tsx` (Modal real, montado una vez en `App.tsx`, solo en web — en nativo `mostrarAlerta` delega directo a `Alert.alert` sin cambios). Todos los call sites migrados. Verificado end-to-end con Playwright contra `dist/` real (no solo `tsc`/`jest`, que no detectan esto — es un problema de UI en runtime): antes, el modal de error no aparecía tras el submit; después, aparece con título/mensaje/botón funcionales
- **Lección para futuros bugs "el botón no hace nada" en web**: sospecha primero de APIs de `react-native` con soporte web nulo o parcial (`Alert`, y en general cualquier API que dependa de UI nativa del SO) antes de asumir que el handler no se dispara — `tsc`/`jest` no detectan esto, hace falta probar el click real en un navegador (Playwright u otro)
- Para este trabajo usa `.claude/agents/web-platform-specialist.md` (UI/UX web, responsividad, adaptación de módulos nativos) y `.claude/agents/devops-specialist.md` (pipeline de deploy, CI/CD, variables de entorno)

## Reglas generales

- Cambios en `api/`, `sitio-web/` y la app móvil son independientes: no mezclar sus dependencias ni asumir que un `npm install` en la raíz instala las otras
- Antes de tocar `supabase/schema.sql`, revisar qué tablas/columnas ya existen — muchas features (planes, BAES, límites de escaneo) ya tienen columnas dedicadas en `profiles`
- Los scrapers de supermercados dependen de estructura HTML/API externa que puede cambiar sin aviso; al modificar un scraper, preferir tocar `vtex.js` si el cambio aplica a todos los supermercados VTEX en vez de duplicar lógica en cada adaptador
- Usa los subagentes especializados en `.claude/agents/` (`frontend-specialist`, `backend-specialist`, `data-engineer`, `qa-reviewer`, `web-platform-specialist`, `devops-specialist`) para tareas que caigan claramente en su dominio
