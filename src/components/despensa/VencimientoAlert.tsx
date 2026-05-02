import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ingrediente } from '../../types/ingrediente';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { diasParaVencer } from '../../utils/fechaHelper';

interface VencimientoAlertProps {
  ingredientes: Ingrediente[];
}

export function VencimientoAlert({ ingredientes }: VencimientoAlertProps) {
  const C = useColors();
  const s = makeStyles(C);

  const proximos = ingredientes.filter((i) => {
    const dias = diasParaVencer(i.fechaVencimiento);
    return dias !== null && dias >= 0 && dias <= 7;
  });

  if (proximos.length === 0) return null;

  return (
    <View style={s.contenedor}>
      <Text style={s.icono}>⚠️</Text>
      <View style={s.texto}>
        <Text style={s.titulo}>
          {proximos.length === 1 ? '1 ingrediente próximo a vencer' : `${proximos.length} ingredientes próximos a vencer`}
        </Text>
        <Text style={s.subtitulo}>{proximos.map((i) => i.nombre).join(', ')}</Text>
      </View>
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.warning + '18',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  icono: { fontSize: 18, marginRight: 10 },
  texto: { flex: 1 },
  titulo: { fontWeight: '600', color: C.warning, fontSize: 14 },
  subtitulo: { color: C.textMuted, fontSize: 12, marginTop: 2 },
});
