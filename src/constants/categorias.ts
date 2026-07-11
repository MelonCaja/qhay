// icono = nombre de MaterialCommunityIcons (misma librería que los pasillos
// de DespensaScreen) — set estilizado y consistente, sin emojis genéricos
export const CATEGORIAS_LISTA = [
  { id: 'frutas_verduras',  label: 'Frutas y Verduras',             icono: 'food-apple-outline' },
  { id: 'lacteos',          label: 'Lácteos, Huevos y Congelados',  icono: 'fridge-outline' },
  { id: 'quesos_fiambres',  label: 'Quesos y Fiambres',             icono: 'cheese' },
  { id: 'despensa',         label: 'Despensa',                      icono: 'archive-outline' },
  { id: 'carnes_pescados',  label: 'Carnes y Pescados',             icono: 'food-steak' },
  { id: 'panaderia',        label: 'Panadería y Pastelería',        icono: 'baguette' },
  { id: 'bebidas',          label: 'Bebidas y Licores',             icono: 'bottle-soda-classic-outline' },
  { id: 'snacks',           label: 'Chocolates y Snacks',           icono: 'cookie-outline' },
  { id: 'limpieza',         label: 'Limpieza',                      icono: 'spray-bottle' },
  { id: 'cuidado_personal', label: 'Cuidado Personal',              icono: 'lotion-outline' },
  { id: 'mascotas',         label: 'Mascotas',                      icono: 'paw-outline' },
  { id: 'hogar',            label: 'Hogar y Librería',              icono: 'home-outline' },
  { id: 'farmacia',         label: 'Farmacia',                      icono: 'pill' },
] as const;

export type CategoriaId = typeof CATEGORIAS_LISTA[number]['id'];
