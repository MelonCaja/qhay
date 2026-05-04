/**
 * Upload local recipes to Firestore.
 * Run from project root: node scripts/upload-node.js
 * No ts-node needed — parses the TS file as plain JS.
 */
'use strict';

const path = require('path');
const fs   = require('fs');
const vm   = require('vm');

// ── Load .env from project root ──────────────────────────────────────────────
// __dirname = .../qhay/.claude/worktrees/<branch>/scripts
// main .env = .../qhay/.env  (4 levels up from scripts/)
const envPath = path.resolve(__dirname, '../../../../.env');
const altEnv  = path.resolve(__dirname, '../.env'); // fallback if .env in worktree

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  fs.readFileSync(filePath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

loadEnv(envPath);
loadEnv(altEnv);

// ── Load recipe data (strip TS types, eval the array) ────────────────────────
const tsSource = fs.readFileSync(
  path.resolve(__dirname, '../src/data/recetasIniciales.ts'),
  'utf8'
);

const jsSource = tsSource
  .split(/\r?\n/)
  .filter((l) => !l.trim().startsWith('import'))           // remove import lines
  .join('\n')
  .replace(/export\s+const\s+\w+\s*:\s*\w+\s*\[\]\s*=/, '__result ='); // strip type

const ctx = { __result: null };
vm.createContext(ctx);
try {
  vm.runInContext(jsSource, ctx);
} catch (e) {
  console.error('Error parsing recetasIniciales.ts:', e.message);
  process.exit(1);
}

// JSON round-trip normalizes vm-context objects to plain JS objects (required by Firestore)
const recetasIniciales = JSON.parse(JSON.stringify(ctx.__result));
if (!Array.isArray(recetasIniciales) || recetasIniciales.length === 0) {
  console.error('No se pudieron cargar las recetas.');
  process.exit(1);
}

// ── Init Firebase (CJS) ───────────────────────────────────────────────────────
const { initializeApp, getApps, getApp } = require('firebase/app');
const { getFirestore, doc, setDoc }       = require('firebase/firestore');

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error('EXPO_PUBLIC_FIREBASE_PROJECT_ID no está definido. Revisa el .env.');
  process.exit(1);
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Upload ────────────────────────────────────────────────────────────────────
async function upload() {
  console.log(`Proyecto: ${firebaseConfig.projectId}`);
  console.log(`Subiendo ${recetasIniciales.length} recetas...\n`);

  for (const receta of recetasIniciales) {
    await setDoc(doc(db, 'recetas', receta.id), receta);
    console.log(`  ✓ ${receta.nombre}`);
  }

  console.log('\n¡Firestore actualizado!');
  process.exit(0);
}

upload().catch((err) => {
  console.error('\nError:', err.message ?? err);
  process.exit(1);
});
