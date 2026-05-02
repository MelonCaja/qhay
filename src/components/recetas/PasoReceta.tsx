import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PasoReceta as PasoType } from '../../types/receta';
import { useColors, ColorPalette } from '../../context/ThemeContext';

interface PasoRecetaProps {
  paso: PasoType;
  activo: boolean;
  completado: boolean;
}

export function PasoReceta({ paso, activo, completado }: PasoRecetaProps) {
  const C = useColors();
  const s = makeStyles(C);
  const [tiempoRestante, setTiempoRestante] = useState(paso.timerSegundos ?? 0);
  const [corriendo, setCorriendo] = useState(false);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setTiempoRestante(paso.timerSegundos ?? 0);
    setCorriendo(false);
  }, [paso]);

  useEffect(() => {
    if (corriendo && tiempoRestante > 0) {
      intervaloRef.current = setInterval(() => {
        setTiempoRestante((t) => {
          if (t <= 1) { setCorriendo(false); clearInterval(intervaloRef.current!); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (intervaloRef.current) clearInterval(intervaloRef.current); };
  }, [corriendo]);

  const fmt = (seg: number) => {
    const m = Math.floor(seg / 60).toString().padStart(2, '0');
    const s = (seg % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <View style={[s.contenedor, activo && s.activo, completado && s.completado]}>
      <View style={[s.numero, activo && s.numeroActivo, completado && s.numeroCompletado]}>
        <Text style={[s.textoNumero, (activo || completado) && s.textoNumeroActivo]}>
          {completado ? '✓' : paso.numero}
        </Text>
      </View>
      <View style={s.cuerpo}>
        <Text style={[s.descripcion, completado && s.textoCompletado]}>{paso.descripcion}</Text>
        {activo && paso.timerSegundos && paso.timerSegundos > 0 && (
          <View style={s.timer}>
            <Text style={s.timerTexto}>{fmt(tiempoRestante)}</Text>
            <TouchableOpacity
              style={s.botonTimer}
              onPress={() => {
                if (tiempoRestante === 0) { setTiempoRestante(paso.timerSegundos!); setCorriendo(true); }
                else { setCorriendo(!corriendo); }
              }}
            >
              <Text style={s.botonTimerTexto}>{tiempoRestante === 0 ? '↺' : corriendo ? '⏸' : '▶'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    padding: 14,
    marginBottom: 8,
    backgroundColor: C.surface,
    borderRadius: 14,
    opacity: 0.5,
  },
  activo: { opacity: 1, borderLeftWidth: 3, borderLeftColor: C.primary },
  completado: { opacity: 0.4 },
  numero: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
    flexShrink: 0,
  },
  numeroActivo: { backgroundColor: C.primary },
  numeroCompletado: { backgroundColor: C.success },
  textoNumero: { fontWeight: '700', color: C.textMuted, fontSize: 13 },
  textoNumeroActivo: { color: '#fff' },
  cuerpo: { flex: 1 },
  descripcion: { fontSize: 15, color: C.text, lineHeight: 22 },
  textoCompletado: { textDecorationLine: 'line-through', color: C.textMuted },
  timer: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 12 },
  timerTexto: { fontSize: 24, fontWeight: '700', color: C.primary },
  botonTimer: {
    backgroundColor: C.primary,
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonTimerTexto: { fontSize: 14, color: '#fff' },
});
