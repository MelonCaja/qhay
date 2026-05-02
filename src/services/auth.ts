import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
  User,
} from 'firebase/auth';
import { auth } from './firebase';
import { crearUsuarioEnFirestore, obtenerUsuario } from './firestore';

// Login con Google
export async function loginConGoogle(idToken: string): Promise<User> {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  
  // Verificar si es usuario nuevo en Firestore
  const userExistente = await obtenerUsuario(result.user.uid);
  if (!userExistente) {
    await crearUsuarioEnFirestore(result.user.uid, {
      nombre: result.user.displayName || 'Usuario Google',
      email: result.user.email || '',
      foto: result.user.photoURL || undefined,
      plan: 'gratuito',
      esEstudiante: false,
      estudianteVerificado: false,
      restriccionesAlimentarias: [],
      tiempoCocina: 45,
      onboardingCompletado: false,
      fechaRegistro: new Date(),
    });
  }
  return result.user;
}

// Registro con email y contraseña
export async function registrarUsuario(
  email: string,
  password: string,
  nombre: string
): Promise<User> {
  const credencial = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credencial.user, { displayName: nombre });
  // Crear documento en Firestore
  await crearUsuarioEnFirestore(credencial.user.uid, {
    nombre,
    email,
    plan: 'gratuito',
    esEstudiante: false,
    estudianteVerificado: false,
    restriccionesAlimentarias: [],
    tiempoCocina: 45,
    onboardingCompletado: false,
    fechaRegistro: new Date(),
  });
  return credencial.user;
}

// Login con email y contraseña
export async function iniciarSesion(email: string, password: string): Promise<User> {
  const credencial = await signInWithEmailAndPassword(auth, email, password);
  return credencial.user;
}

// Cerrar sesión
export async function cerrarSesion(): Promise<void> {
  await signOut(auth);
}

// Observador de estado de autenticación
export function observarAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
