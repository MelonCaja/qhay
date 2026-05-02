export type ColorPalette = {
  bg: string;
  surface: string;
  primary: string;
  primarySoft: string;
  text: string;
  textMuted: string;
  border: string;
  error: string;
  warning: string;
  success: string;
  expiryOk: string;
  expiryWarning: string;
  expiryCritical: string;
};

export const LightColors: ColorPalette = {
  bg: '#F4F4F5',
  surface: '#FFFFFF',
  primary: '#16A34A',
  primarySoft: '#DCFCE7',
  text: '#111827',
  textMuted: '#9CA3AF',
  border: '#E4E4E7',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#16A34A',
  expiryOk: '#16A34A',
  expiryWarning: '#F59E0B',
  expiryCritical: '#EF4444',
};

export const DarkColors: ColorPalette = {
  bg: '#09090B',
  surface: '#18181B',
  primary: '#22C55E',
  primarySoft: '#14532D',
  text: '#F9FAFB',
  textMuted: '#6B7280',
  border: '#27272A',
  error: '#F87171',
  warning: '#FBBF24',
  success: '#22C55E',
  expiryOk: '#22C55E',
  expiryWarning: '#FBBF24',
  expiryCritical: '#F87171',
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
