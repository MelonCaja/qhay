import { create } from 'zustand';
import { Usuario } from '../types/usuario';

interface AuthState {
  usuario: Usuario | null;
  cargando: boolean;
  emailVerificado: boolean;
  setUsuario: (usuario: Usuario | null) => void;
  setCargando: (cargando: boolean) => void;
  setEmailVerificado: (verificado: boolean) => void;
  actualizarUsuario: (datos: Partial<Usuario>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  cargando: true,
  emailVerificado: false,
  setUsuario: (usuario) => set({ usuario }),
  setCargando: (cargando) => set({ cargando }),
  setEmailVerificado: (emailVerificado) => set({ emailVerificado }),
  actualizarUsuario: (datos) =>
    set((state) => ({
      usuario: state.usuario ? { ...state.usuario, ...datos } : null,
    })),
}));
