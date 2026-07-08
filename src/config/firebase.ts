import { initializeApp, getApps, getApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Config pública del cliente Firebase. Los valores literales actúan de
// fallback si el .env no se cargó al exportar el bundle (EAS Update).
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyD2d-dv0bf1uu3DFVyJfYWSRCFB_0ooNnk',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'qhay-aac9d.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'qhay-aac9d',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'qhay-aac9d.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '977133613009',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:977133613009:web:4336220ea6404560e43af0',
};

// firebase v12 no expone getReactNativePersistence en los tipos del bundle web,
// pero sí existe en runtime React Native.
const getReactNativePersistence = (
  firebaseAuth as unknown as {
    getReactNativePersistence: (storage: unknown) => firebaseAuth.Persistence;
  }
).getReactNativePersistence;

const isNewApp = getApps().length === 0;
const app = isNewApp ? initializeApp(firebaseConfig) : getApp();

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
