/**
 * Mock mínimo de expo-web-browser / expo-auth-session para la suite Node:
 * services/auth.ts los importa para el OAuth de Google, pero los tests solo
 * ejercitan los flujos email/contraseña (el navegador no existe en Node).
 */
export const maybeCompleteAuthSession = () => ({ type: 'failed' });
export const openAuthSessionAsync = async () => ({ type: 'dismiss' });
export const makeRedirectUri = () => 'qhay://';
export const getQueryParams = (_url: string) => ({
  params: {} as Record<string, string>,
  errorCode: null as string | null,
});
