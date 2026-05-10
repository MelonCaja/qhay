export interface Ingrediente {
  id: string;
  nombre: string;
  marca?: string;
  cantidad: number;
  unidad: string;
  fechaVencimiento?: Date;
  precioUnitario?: number;
  supermercado?: string;
  foto?: string;
  imageUrl?: string;
  agregadoPor: 'manual' | 'boleta' | 'buscador';
  categoria?: string;
}

export type UnidadMedida =
  | 'kg'
  | 'g'
  | 'L'
  | 'ml'
  | 'unidad'
  | 'taza'
  | 'cucharada'
  | 'cucharadita'
  | 'paquete'
  | 'lata';
