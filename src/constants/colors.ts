export type ColorPalette = {
  bg: string;
  surface: string;        // bloque bento base
  surface2: string;       // bloque bento elevado
  primary: string;        // acento positivo/disponible (flúor en dark)
  primarySoft: string;
  onPrimary: string;      // texto sobre primary (alto contraste)
  fluor: string;          // verde neón puro para highlights sutiles
  text: string;
  textMuted: string;
  border: string;
  borderBright: string;   // borde brillante para bloques destacados
  error: string;
  critical: string;       // rojo/naranja eléctrico para alertas duras
  warning: string;
  success: string;
  expiryOk: string;
  expiryWarning: string;
  expiryCritical: string;
};

export const LightColors: ColorPalette = {
  bg: '#F4F4F5',
  surface: '#FFFFFF',
  surface2: '#FAFAFA',
  primary: '#16A34A',
  primarySoft: '#DCFCE7',
  onPrimary: '#FFFFFF',
  fluor: '#16A34A',
  text: '#111827',
  textMuted: '#9CA3AF',
  border: '#E4E4E7',
  borderBright: '#16A34A40',
  error: '#EF4444',
  critical: '#E11D48',
  warning: '#F59E0B',
  success: '#16A34A',
  expiryOk: '#16A34A',
  expiryWarning: '#F59E0B',
  expiryCritical: '#EF4444',
};

// Modo oscuro profundo: pizarra/carbón, blanco puro + gris plata,
// flúor sutil para lo positivo, eléctrico para lo crítico.
export const DarkColors: ColorPalette = {
  bg: '#0D0F12',
  surface: '#14171D',
  surface2: '#1A1E26',
  primary: '#4ADE80',
  primarySoft: '#12251A',
  onPrimary: '#0D0F12',
  fluor: '#54FF9F',
  text: '#FFFFFF',
  textMuted: '#9BA3B0',
  border: '#232833',
  borderBright: '#4ADE8045',
  error: '#FF5C5C',
  critical: '#FF4D3D',
  warning: '#FF9F1C',
  success: '#4ADE80',
  expiryOk: '#4ADE80',
  expiryWarning: '#FF9F1C',
  expiryCritical: '#FF4D3D',
};

// Legacy alias — solo para compatibilidad con archivos aún no migrados
export const Colors = {
  primary: LightColors.primary,
  primaryLight: LightColors.primarySoft,
  primaryMedium: LightColors.primary,
  white: '#FFFFFF',
  textPrimary: LightColors.text,
  textSecondary: LightColors.textMuted,
  background: LightColors.bg,
  warning: LightColors.warning,
  error: LightColors.error,
  success: LightColors.success,
  border: LightColors.border,
  cardBackground: LightColors.surface,
  vencimientoOk: LightColors.expiryOk,
  vencimientoProximo: LightColors.expiryWarning,
  vencimientoCritico: LightColors.expiryCritical,
};
