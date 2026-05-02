import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ingrediente } from '../../types/ingrediente';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { estadoVencimiento, textoVencimiento } from '../../utils/fechaHelper';

interface IngredienteCardProps {
  ingrediente: Ingrediente;
  onEliminar: () => void;
}

export function IngredienteCard({ ingrediente, onEliminar }: IngredienteCardProps) {
  const C = useColors();
  const s = makeStyles(C);
  const estado = estadoVencimiento(ingrediente.fechaVencimiento);

  const colorIndicador =
    estado === 'ok' ? C.expiryOk :
    estado === 'proximo' ? C.expiryWarning :
    C.expiryCritical;

  return (
    <View style={s.card}>
      <View style={[s.indicador, { backgroundColor: colorIndicador }]} />
      <View style={s.info}>
        <Text style={s.nombre}>{ingrediente.nombre}</Text>
        {ingrediente.marca && <Text style={s.meta}>{ingrediente.marca}</Text>}
        <Text style={s.meta}>{ingrediente.cantidad} {ingrediente.unidad}</Text>
        {ingrediente.fechaVencimiento && (
          <Text style={[s.vencimiento, { color: colorIndicador }]}>
            {textoVencimiento(ingrediente.fechaVencimiento)}
          </Text>
        )}
      </View>
      <TouchableOpacity style={s.botonEliminar} onPress={onEliminar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={s.textoEliminar}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  indicador: { width: 4, alignSelf: 'stretch' },
  info: { flex: 1, padding: 14 },
  nombre: { fontSize: 16, fontWeight: '600', color: C.text },
  meta: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  vencimiento: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  botonEliminar: { padding: 16 },
  textoEliminar: { color: C.textMuted, fontSize: 15 },
});
