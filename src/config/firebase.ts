import { initializeApp, getApps, getApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

// Falla audible si el .env no se cargó (init silenciosamente rota si apiKey='')
const faltantes = Object.entries(firebaseConfig)
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (faltantes.length > 0) {
  console.error(
    `[firebase] Variables de entorno faltantes: ${faltantes.join(', ')}. ` +
    'Revisa el .env (EXPO_PUBLIC_FIREBASE_*) y reinicia con "expo start -c".'
  );
}

const isNewApp = getApps().length === 0;
const app = isNewApp ? initializeApp(firebaseConfig) : getApp();

// firebase v12 no expone getReactNativePersistence en los tipos del bundle web,
// pero sí existe en runtime React Native.
const getReactNativePersistence = (
  firebaseAuth as unknown as {
    getReactNativePersistence: (storage: unknown) => firebaseAuth.Persistence;
  }
).getReactNativePersistence;

// En la primera inicialización se configura persistencia; en hot reload ya existe.
let auth: firebaseAuth.Auth;
if (isNewApp) {
  auth = firebaseAuth.initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} else {
  auth = firebaseAuth.getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export default app;
