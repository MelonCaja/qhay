import { Config } from '../constants/config';

export type EstadoVencimiento = 'ok' | 'proximo' | 'critico' | 'vencido';

// Días que faltan para vencer
export function diasParaVencer(fecha?: Date): number | null {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diff = fecha.getTime() - hoy.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Estado de vencimiento según días restantes
export function estadoVencimiento(fecha?: Date): EstadoVencimiento {
  const dias = diasParaVencer(fecha);
  if (dias === null) return 'ok';
  if (dias < 0) return 'vencido';
  if (dias < Config.vencimientoProximo) return 'critico';
  if (dias < Config.vencimientoOk) return 'proximo';
  return 'ok';
}

// Formato legible de fecha
export function formatearFecha(fecha?: Date): string {
  if (!fecha) return 'Sin vencimiento';
  return fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Texto descriptivo del vencimiento
export function textoVencimiento(fecha?: Date): string {
  const dias = diasParaVencer(fecha);
  if (dias === null) return '';
  if (dias < 0) return 'Vencido';
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  return `Vence en ${dias} días`;
}
