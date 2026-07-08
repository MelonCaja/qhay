import { Alert } from 'react-native';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ TODO(debug): credenciales hardcodeadas TEMPORALMENTE para descartar
// variables de entorno vacías en el bundle de EAS Update. Revertir a
// process.env.EXPO_PUBLIC_FIREBASE_* cuando el login quede verificado.
const firebaseConfig = {
  apiKey: 'AIzaSyD2d-dv0bf1uu3DFVyJfYWSRCFB_0ooNnk',
  authDomain: 'qhay-aac9d.firebaseapp.com',
  projectId: 'qhay-aac9d',
  storageBucket: 'qhay-aac9d.firebasestorage.app',
  messagingSenderId: '977133613009',
  appId: '1:977133613009:web:4336220ea6404560e43af0',
};

// firebase v12 no expone getReactNativePersistence en los tipos del bundle web,
// pero sí existe en runtime React Native.
const getReactNativePersistence = (
  firebaseAuth as unknown as {
    getReactNativePersistence: (storage: unknown) => firebaseAuth.Persistence;
  }
).getReactNativePersistence;

let app: FirebaseApp;
let auth: firebaseAuth.Auth;

try {
  const isNewApp = getApps().length === 0;
  app = isNewApp ? initializeApp(firebaseConfig) : getApp();

  // ⚠️ TODO(debug): alerta de auditoría — quitar tras verificar el login
  Alert.alert('DEBUG', 'Firebase inicializado correctamente');

  // En la primera inicialización se configura persistencia; en hot reload ya existe.
  if (isNewApp) {
    auth = firebaseAuth.initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } else {
    auth = firebaseAuth.getAuth(app);
  }
} catch (error: any) {
  Alert.alert('DEBUG: FALLO INICIALIZANDO FIREBASE', String(error?.message ?? error));
  throw error;
}

export { auth };
export const db = getFirestore(app);
export default app;
