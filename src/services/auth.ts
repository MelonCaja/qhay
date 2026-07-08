import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithCredential,
  User,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { crearPerfil, obtenerPerfil, perfilInicial } from './userService';

// Login con Google
export async function loginConGoogle(idToken: string): Promise<User> {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);

  // Verificar si es usuario nuevo en Firestore
  const userExistente = await obtenerPerfil(result.user.uid);
  if (!userExistente) {
    await crearPerfil(
      result.user.uid,
      perfilInicial({
        nombre: result.user.displayName || 'Usuario Google',
        email: result.user.email || '',
        foto: result.user.photoURL || undefined,
      })
    );
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
  await sendEmailVerification(credencial.user);
  await crearPerfil(credencial.user.uid, perfilInicial({ nombre, email }));
  return credencial.user;
}

// Login con email y contraseña
export async function iniciarSesion(email: string, password: string): Promise<User> {
  const credencial = await signInWithEmailAndPassword(auth, email, password);
  return credencial.user;
}

// Reenvía el correo de verificación al usuario actual
export async function reenviarVerificacion(): Promise<void> {
  const user = auth.currentUser;
  if (user && !user.emailVerified) {
    await sendEmailVerification(user);
  }
}

// Cerrar sesión
export async function cerrarSesion(): Promise<void> {
  await signOut(auth);
}

// Observador de estado de autenticación
export function observarAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
