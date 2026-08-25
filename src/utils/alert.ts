import { Alert as AlertNativo, Platform } from 'react-native';

export interface BotonAlerta {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface EstadoAlerta {
  titulo: string;
  mensaje?: string;
  botones: BotonAlerta[];
}

type Escucha = (estado: EstadoAlerta | null) => void;
let escucha: Escucha | null = null;

/** Suscribe el host visual (WebAlertHost) — solo se monta en web. */
export function suscribirAlerta(fn: Escucha): () => void {
  escucha = fn;
  return () => { if (escucha === fn) escucha = null; };
}

/**
 * Reemplazo de Alert.alert de react-native que funciona en web.
 * react-native-web NO implementa Alert.alert (es un no-op literal:
 * `static alert() {}`), así que en web cualquier feedback vía Alert.alert
 * desaparece en silencio — el usuario ve el botón "sin hacer nada" aunque
 * la acción sí corrió. En nativo delega directo a Alert.alert de RN, sin
 * cambios de comportamiento.
 */
export function mostrarAlerta(titulo: string, mensaje?: string, botones?: BotonAlerta[]): void {
  if (Platform.OS !== 'web') {
    AlertNativo.alert(titulo, mensaje, botones as Parameters<typeof AlertNativo.alert>[2]);
    return;
  }

  const botonesFinales = botones && botones.length > 0 ? botones : [{ text: 'OK' }];
  if (escucha) {
    escucha({ titulo, mensaje, botones: botonesFinales });
  } else {
    // WebAlertHost no está montado (no debería pasar) — fallback mínimo.
    window.alert([titulo, mensaje].filter(Boolean).join('\n\n'));
    botonesFinales[0]?.onPress?.();
  }
}
