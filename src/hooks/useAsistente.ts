import { useState } from 'react';
import * as Speech from 'expo-speech';
import { consultarAsistente } from '../services/openai';
import { Ingrediente } from '../types/ingrediente';
import { Receta } from '../types/receta';

interface UseAsistenteOptions {
  despensa: Ingrediente[];
  recetaActual?: Receta;
  pasoActual?: number;
  restricciones: string[];
}

export function useAsistente(opciones: UseAsistenteOptions) {
  const [respuesta, setRespuesta] = useState<string>('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preguntar = async (pregunta: string) => {
    setCargando(true);
    setError(null);
    try {
      const texto = await consultarAsistente(pregunta, {
        despensa: opciones.despensa,
        recetaActual: opciones.recetaActual,
        pasoActual: opciones.pasoActual,
        restricciones: opciones.restricciones,
      });
      setRespuesta(texto);
      // Leer en voz alta
      Speech.speak(texto, { language: 'es-CL', rate: 0.9 });
      return texto;
    } catch {
      const msg = 'No pude conectarme al asistente. Intenta de nuevo.';
      setError(msg);
      return msg;
    } finally {
      setCargando(false);
    }
  };

  const detenerVoz = () => {
    Speech.stop();
  };

  return { respuesta, cargando, error, preguntar, detenerVoz };
}
