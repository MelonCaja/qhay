/**
 * Sube las recetas locales a Firestore.
 * Ejecutar: npx ts-node scripts/upload.js
 * Requiere: npm install -D ts-node dotenv  (si no están instalados)
 */
require('ts-node').register({ transpileOnly: true, esm: false });
require('dotenv').config();

const { initializeApp, getApps, getApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
const { recetasIniciales } = require('../src/data/recetasIniciales');

const app = getApps().length
  ? getApp()
  : initializeApp({
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    });

const db = getFirestore(app);

async function upload() {
  console.log(`Subiendo ${recetasIniciales.length} recetas a Firestore...`);
  for (const receta of recetasIniciales) {
    await setDoc(doc(db, 'recetas', receta.id), receta);
    console.log(`  ✓ ${receta.nombre}`);
  }
  console.log('¡Listo!');
  process.exit(0);
}

upload().catch((err) => {
  console.error('Error al subir recetas:', err);
  process.exit(1);
});
