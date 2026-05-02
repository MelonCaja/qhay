// Configuración general de la app
export const Config = {
  // OpenAI
  openaiModel: 'gpt-4o-mini',
  openaiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '',

  // Umbrales de vencimiento en días
  vencimientoOk: 7,
  vencimientoProximo: 3,

  // Debounce para búsqueda
  searchDebounce: 500,

  // Umbral diferencia de precio para recomendar más cercano (en pesos CLP)
  umbralDiferenciaPrecio: 1000,

  // Versión
  version: '1.0.0',
};
