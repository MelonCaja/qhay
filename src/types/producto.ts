export interface PrecioSupermercado {
  supermercado: string;
  precio: number;
  enOferta: boolean;
  precioLista?: number;
  ultimaActualizacion: Date;
  distancia?: number; // km
}

export interface Producto {
  id: string;
  nombre: string;
  marca: string;
  formato: string;
  foto?: string;
  imageUrl?: string;
  precios: PrecioSupermercado[];
}

export interface ItemLista {
  id: string;
  productoId?: string;
  nombre: string;
  marca?: string;
  cantidad: number;
  unidad: string;
  precioEstimado?: number;
  supermercado?: string;
  todosLosPrecios?: PrecioSupermercado[];
  completado: boolean;
  categoria?: string;
}

export interface Supermercado {
  id: string;
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
  aceptaBAES: boolean;
  tipo: 'supermercado' | 'barrio';
  totalEstimado?: number;
  distancia?: number; // km
  horario?: string;
}
