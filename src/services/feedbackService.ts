import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

/** Correo corporativo de soporte (solo informativo en UI, sin mailto) */
export const CORREO_SOPORTE = 'contacto@qhay.cl';

// Inserta el feedback en la tabla feedbacks (RLS: solo insert del propio uid)
export async function enviarFeedback(rating: number, mensaje: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw Object.assign(new Error('Sin sesión activa'), { code: 'no_session' });
  }

  const { error } = await supabase.from('feedbacks').insert({
    user_id: session.user.id,
    email: session.user.email ?? null,
    rating,
    message: mensaje.trim(),
    platform: Platform.OS,
    app_version: '1.0.0',
  });
  if (error) throw error;
}
