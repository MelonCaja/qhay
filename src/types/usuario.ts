export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  foto?: string;
  plan: 'gratuito' | 'premium';
  esEstudiante: boolean;
  estudianteVerificado: boolean;
  restriccionesAlimentarias: string[];
  tiempoCocina: number; // minutos
  presupuestoSemanal?: number;
  supermercadoFavorito?: string;
  onboardingCompletado: boolean;
  fechaRegistro?: Date;
}

export type RestriccionAlimentaria =
  | 'vegetariano'
  | 'vegano'
  | 'sin-gluten'
  | 'sin-lactosa'
  | 'sin-mariscos'
  | 'sin-nueces';

export type TiempoCocina = 20 | 45 | 90;
