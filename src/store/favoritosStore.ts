import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FavoritosState {
  favoritos: string[];
  toggleFavorito: (id: string) => void;
  esFavorito: (id: string) => boolean;
}

export const useFavoritosStore = create<FavoritosState>()(
  persist(
    (set, get) => ({
      favoritos: [],
      toggleFavorito: (id) =>
        set((state) => ({
          favoritos: state.favoritos.includes(id)
            ? state.favoritos.filter((f) => f !== id)
            : [...state.favoritos, id],
        })),
      esFavorito: (id) => get().favoritos.includes(id),
    }),
    {
      name: 'qhay-favoritos',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
