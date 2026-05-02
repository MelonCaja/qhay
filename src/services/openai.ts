import { Config } from '../constants/config';
import { Ingrediente } from '../types/ingrediente';
import { Receta } from '../types/receta';

interface ContextoAsistente {
  despensa: Ingrediente[];
  recetaActual?: Receta;
  pasoActual?: number;
  restricciones: string[];
}

// Consultar al asistente de cocina IA
export async function consultarAsistente(
  pregunta: string,
  contexto: ContextoAsistente
): Promise<string> {
  const ingredientesTexto = contexto.despensa
    .map((i) => `${i.nombre} (${i.cantidad} ${i.unidad})`)
    .join(', ');

  const sistemaMensaje = `Eres el asistente de cocina de Qhay. Responde en español de forma concisa y amigable.
Ayudas a cocinar con lo que el usuario tiene en su despensa.
${contexto.restricciones.length > 0 ? `Restricciones alimentarias del usuario: ${contexto.restricciones.join(', ')}.` : ''}`;

  const usuarioMensaje = `Despensa actual: ${ingredientesTexto}
${contexto.recetaActual ? `Receta que estoy haciendo: ${contexto.recetaActual.nombre}, paso ${contexto.pasoActual ?? 1}` : ''}
Pregunta: ${pregunta}`;

  const respuesta = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Config.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: Config.openaiModel,
      messages: [
        { role: 'system', content: sistemaMensaje },
        { role: 'user', content: usuarioMensaje },
      ],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  if (!respuesta.ok) {
    throw new Error(`Error OpenAI: ${respuesta.status}`);
  }

  const data = await respuesta.json();
  return data.choices[0]?.message?.content ?? 'No pude responder en este momento.';
}
