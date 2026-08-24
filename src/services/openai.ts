import { API_BASE_URL } from '../config/api';
import { Ingrediente } from '../types/ingrediente';
import { Receta } from '../types/receta';

interface ContextoAsistente {
  despensa: Ingrediente[];
  recetaActual?: Receta;
  pasoActual?: number;
  restricciones: string[];
}

// Consultar al asistente de cocina IA — vía api/ (POST /asistente), que
// llama a OpenAI server-side. No exponer nunca EXPO_PUBLIC_OPENAI_API_KEY
// aquí: en un bundle web quedaría visible desde las devtools del navegador.
export async function consultarAsistente(
  pregunta: string,
  contexto: ContextoAsistente
): Promise<string> {
  const respuesta = await fetch(`${API_BASE_URL}/asistente`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pregunta, contexto }),
  });

  if (!respuesta.ok) {
    throw new Error(`Error asistente: ${respuesta.status}`);
  }

  const data = await respuesta.json();
  return data.respuesta ?? 'No pude responder en este momento.';
}
