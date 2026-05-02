import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ItemLista } from '../types/producto';

const STORAGE_KEY = '@qhay_listas_guardadas';

export interface ListaGuardada {
  id: string;
  nombre: string;
  items: ItemLista[];
  creadaEn: number;
}

interface ListaState {
  items: ItemLista[];
  cargando: boolean;
  listasGuardadas: ListaGuardada[];
  setItems: (items: ItemLista[]) => void;
  agregarItem: (item: ItemLista) => void;
  eliminarItem: (id: string) => void;
  toggleCompletado: (id: string) => void;
  actualizarCantidad: (id: string, cantidad: number) => void;
  setCargando: (cargando: boolean) => void;
  totalEstimado: () => number;
  guardarListaActual: (nombre: string) => Promise<void>;
  cargarListaGuardada: (id: string) => void;
  eliminarListaGuardada: (id: string) => Promise<void>;
  inicializarListasGuardadas: () => Promise<void>;
}

export const useListaStore = create<ListaState>((set, get) => ({
  items: [],
  cargando: false,
  listasGuardadas: [],
  setItems: (items) => set({ items }),
  agregarItem: (item) =>
    set((state) => ({ items: [...state.items, item] })),
  eliminarItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  toggleCompletado: (id) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, completado: !i.completado } : i
      ),
    })),
  actualizarCantidad: (id, cantidad) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, cantidad: Math.max(1, cantidad) } : i
      ),
    })),
  setCargando: (cargando) => set({ cargando }),
  totalEstimado: () =>
    get().items.reduce((acc, i) => acc + (i.precioEstimado ?? 0) * i.cantidad, 0),

  guardarListaActual: async (nombre) => {
    const { items, listasGuardadas } = get();
    const nueva: ListaGuardada = {
      id: Date.now().toString(),
      nombre: nombre.trim() || 'Mi lista',
      items: [...items],
      creadaEn: Date.now(),
    };
    const actualizadas = [...listasGuardadas, nueva];
    set({ listasGuardadas: actualizadas });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(actualizadas));
  },

  cargarListaGuardada: (id) => {
    const lista = get().listasGuardadas.find((l) => l.id === id);
    if (lista) set({ items: [...lista.items] });
  },

  eliminarListaGuardada: async (id) => {
    const actualizadas = get().listasGuardadas.filter((l) => l.id !== id);
    set({ listasGuardadas: actualizadas });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(actualizadas));
  },

  inicializarListasGuardadas: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) set({ listasGuardadas: JSON.parse(raw) });
    } catch {}
  },
}));
