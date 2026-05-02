import { create } from 'zustand';
import { Usuario } from '../types/usuario';

interface AuthState {
  usuario: Usuario | null;
  cargando: boolean;
  setUsuario: (usuario: Usuario | null) => void;
  setCargando: (cargando: boolean) => void;
  actualizarUsuario: (datos: Partial<Usuario>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  cargando: true,
  setUsuario: (usuario) => set({ usuario }),
  setCargando: (cargando) => set({ cargando }),
  actualizarUsuario: (datos) =>
    set((state) => ({
      usuario: state.usuario ? { ...state.usuario, ...datos } : null,
    })),
}));
