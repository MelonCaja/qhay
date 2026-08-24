// URL base del backend de Qhay (api/, Express en Vercel, montado bajo /api
// en el mismo proyecto que sirve el export estático de Expo Web — ver
// vercel.json en la raíz). Único punto de verdad para que
// scraping/boleta/asistente no se desincronicen si cambia el dominio.
export const API_BASE_URL = 'https://qhay.vercel.app/api';
