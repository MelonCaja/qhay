# Qhay 🛒

**Qhay** es una aplicación móvil para Chile que combina gestión de despensa, sugerencias de recetas y comparación de precios en supermercados, potenciada por inteligencia artificial.

> Estado actual: **MVP en desarrollo activo**

---

## ¿Qué hace Qhay?

- **Gestión de despensa** — Registra tus ingredientes, cantidades, fechas de vencimiento, marcas y precios
- **Sugerencias de recetas** — Recibe recetas basadas en lo que tienes disponible y tus restricciones alimentarias
- **Lista de compras** — Crea y gestiona listas de compras con estimación de precios
- **Comparación de precios** — Busca y compara precios en Jumbo, Líder, Santa Isabel y Unimarc en tiempo real
- **Escaneo de boletas** — Fotografía tu boleta y la app extrae los productos automáticamente (GPT-4o Vision)
- **Mapa de supermercados** — Localiza supermercados cercanos a tu ubicación
- **Asistente IA** — Consultor de cocina inteligente contextualizado con tu despensa (GPT-4o)

---

## Stack tecnológico

### Frontend (App móvil)
| Tecnología | Versión | Uso |
|-----------|---------|-----|
| React Native | 0.81.5 | Framework base |
| Expo | ~54.0.33 | Build y desarrollo |
| TypeScript | 5.9.2 | Lenguaje principal |
| React Navigation | v7 | Navegación entre pantallas |
| Zustand | 5.0.12 | Estado global |
| Firebase | ^10 | Autenticación y base de datos (Firestore) |
| react-native-maps | 1.20.1 | Mapa de supermercados |
| react-native-vision-camera | 4.7.3 | Escaneo de boletas |
| expo-location | — | Geolocalización |
| expo-notifications | — | Notificaciones push |

### Backend (API de scraping)
| Tecnología | Uso |
|-----------|-----|
| Node.js + Express | Servidor HTTP |
| VTEX API | Scraping de Jumbo, Santa Isabel, Unimarc |
| Walmart/Líder API | Scraping de Líder |
| Vercel / Railway | Deploy |

### Integraciones externas
- **OpenAI GPT-4o** — Asistente de cocina y análisis de boletas
- **Firebase Auth** — Autenticación de usuarios
- **Firebase Firestore** — Almacenamiento de despensa y listas

---

## Funcionalidades

### Implementadas
- [x] Autenticación (registro, login, verificación de email)
- [x] Onboarding con restricciones alimentarias
- [x] Estructura de navegación completa (tabs + stacks)
- [x] Gestión de despensa (ingredientes, vencimientos)
- [x] Lista de compras base
- [x] Componentes UI reutilizables
- [x] Estado global con Zustand (auth, despensa, lista)
- [x] Integración Firebase (Auth + Firestore)
- [x] API de scraping de precios (estructura)
- [x] Pantalla de mapa (estructura)
- [x] Soporte tema claro/oscuro

### En desarrollo / Pendiente
- [ ] Recetas completas (más contenido)
- [ ] Añadir productos al carrito de supermercado
- [ ] Scraping de supermercados (optimización y cobertura completa)
- [ ] Comparador de supermercados funcional
- [ ] Escaneo de boletas (integración GPT-4o Vision)
- [ ] Asistente IA (integración GPT-4o completa)
- [ ] Mapa de supermercados funcional
- [ ] Algoritmo precio/distancia
- [ ] Historial nutricional
- [ ] Editar perfil (nombre, foto)
- [ ] Verificación de correo estudiantil
- [ ] Registro de utensilios de cocina
- [ ] Modo oscuro completo

---

## Instalación y setup

### Requisitos previos
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Cuenta de Expo (`expo login`)
- Cuenta de Firebase
- API key de OpenAI

### 1. Clonar el repositorio

```bash
git clone https://github.com/gunsdghost/qhay.git
cd qhay
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=tu_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=tu_app_id
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
```

### 4. Iniciar la app

```bash
npx expo start
```

Escanea el QR con Expo Go (iOS/Android) o presiona `w` para abrir en navegador.

---

## API de scraping (backend)

El backend es un servidor Express independiente que consulta las APIs públicas de los supermercados.

### Desarrollo local

```bash
cd api
npm install
npm run dev
# → http://localhost:3000
```

### Endpoints

```
GET /buscar?q=leche          # Busca productos en todos los supermercados
GET /health                  # Health check
```

### Deploy en Vercel

```bash
cd api
npx vercel deploy --prod
```

Una vez desplegado, actualiza la URL en `src/services/scraping.ts`:

```typescript
const SCRAPING_API_URL = 'https://tu-api.vercel.app';
```

---

## Estructura del proyecto

```
qhay/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── common/         # Button, Card, Input, LoadingSpinner
│   │   ├── despensa/       # IngredienteCard, VencimientoAlert
│   │   ├── lista/          # ProductoItem, TotalEstimado
│   │   └── recetas/        # RecetaCard, PasoReceta
│   ├── constants/           # Colores, categorías, strings
│   ├── context/             # ThemeContext
│   ├── hooks/               # useAuth, useDespensa, useRecetas, useAsistente
│   ├── navigation/          # AppNavigator, AuthNavigator, TabNavigator
│   ├── screens/             # Pantallas por módulo
│   │   ├── auth/           # Login, Register, Onboarding
│   │   ├── despensa/       # Gestión de ingredientes
│   │   ├── home/           # Dashboard
│   │   ├── lista/          # Lista de compras
│   │   ├── mapa/           # Mapa de supermercados
│   │   ├── perfil/         # Perfil de usuario
│   │   └── recetas/        # Recetas y detalles
│   ├── services/            # Firebase, OpenAI, scraping, boletas
│   ├── store/               # Zustand stores (auth, despensa, lista)
│   └── types/               # Interfaces TypeScript
│
├── api/                     # Backend de scraping (Express)
│   ├── src/
│   │   ├── index.js        # Servidor principal
│   │   └── scrapers/       # jumbo.js, lider.js, santaisabel.js, unimarc.js
│   ├── package.json
│   └── vercel.json
│
├── assets/                  # Iconos, splash screen, favicon
├── App.tsx                  # Entry point
├── app.json                 # Configuración Expo
└── eas.json                 # Configuración EAS Build
```

---

## Permisos requeridos

| Permiso | Uso |
|--------|-----|
| Cámara | Escaneo de boletas y productos |
| Micrófono | Notas de voz (futuro) |
| Ubicación precisa | Mapa de supermercados cercanos |
| Notificaciones | Alertas de vencimiento |

---

## Contribuir

Este proyecto está en etapa MVP. Si quieres contribuir, abre un issue o envía un pull request.

---

## Licencia

MIT
