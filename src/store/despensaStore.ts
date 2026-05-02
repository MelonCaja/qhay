import { create } from 'zustand';
import { Ingrediente } from '../types/ingrediente';

interface DespensaState {
  ingredientes: Ingrediente[];
  cargando: boolean;
  setIngredientes: (ingredientes: Ingrediente[]) => void;
  agregarIngrediente: (ingrediente: Ingrediente) => void;
  eliminarIngrediente: (id: string) => void;
  actualizarIngrediente: (id: string, datos: Partial<Ingrediente>) => void;
  setCargando: (cargando: boolean) => void;
}

export const useDespensaStore = create<DespensaState>((set) => ({
  ingredientes: [],
  cargando: false,
  setIngredientes: (ingredientes) => set({ ingredientes }),
  agregarIngrediente: (ingrediente) =>
    set((state) => ({ ingredientes: [...state.ingredientes, ingrediente] })),
  eliminarIngrediente: (id) =>
    set((state) => ({
      ingredientes: state.ingredientes.filter((i) => i.id !== id),
    })),
  actualizarIngrediente: (id, datos) =>
    set((state) => ({
      ingredientes: state.ingredientes.map((i) =>
        i.id === id ? { ...i, ...datos } : i
      ),
    })),
  setCargando: (cargando) => set({ cargando }),
}));
