export const CATEGORIAS_LISTA = [
  { id: 'frutas_verduras',  label: 'Frutas y Verduras',             emoji: '🍎' },
  { id: 'lacteos',          label: 'Lácteos, Huevos y Congelados',  emoji: '🥛' },
  { id: 'quesos_fiambres',  label: 'Quesos y Fiambres',             emoji: '🧀' },
  { id: 'despensa',         label: 'Despensa',                      emoji: '🫙' },
  { id: 'carnes_pescados',  label: 'Carnes y Pescados',             emoji: '🥩' },
  { id: 'panaderia',        label: 'Panadería y Pastelería',        emoji: '🍞' },
  { id: 'bebidas',          label: 'Bebidas y Licores',             emoji: '🧃' },
  { id: 'snacks',           label: 'Chocolates y Snacks',           emoji: '🍪' },
  { id: 'limpieza',         label: 'Limpieza',                      emoji: '🧹' },
  { id: 'cuidado_personal', label: 'Cuidado Personal',              emoji: '🧴' },
  { id: 'mascotas',         label: 'Mascotas',                      emoji: '🐾' },
  { id: 'hogar',            label: 'Hogar y Librería',              emoji: '🏠' },
  { id: 'farmacia',         label: 'Farmacia',                      emoji: '💊' },
] as const;

export type CategoriaId = typeof CATEGORIAS_LISTA[number]['id'];
