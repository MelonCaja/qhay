import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { formatearPrecio } from '../../utils/precioHelper';

interface TotalEstimadoProps {
  total: number;
  esEstudiante?: boolean;
  descuentoBAES?: number;
}

export function TotalEstimado({ total, esEstudiante, descuentoBAES = 45000 }: TotalEstimadoProps) {
  const C = useColors();
  const s = makeStyles(C);

  // Si el estudiante está verificado, usamos la beca total como ejemplo.
  // En un entorno real se calcularía cuánto del carro lo cubre la BAES.
  const montoDescuento = esEstudiante ? Math.min(total, descuentoBAES) : 0;

  return (
    <View style={s.contenedor}>
      <View style={s.fila}>
        <Text style={s.label}>Total estimado</Text>
        <Text style={s.total}>{formatearPrecio(total)}</Text>
      </View>
      {esEstudiante && (
        <>
          <View style={s.sep} />
          <View style={s.fila}>
            <Text style={s.labelBAES}>Monto BAES disponible 🎓</Text>
            <Text style={s.descuento}>-{formatearPrecio(montoDescuento)}</Text>
          </View>
          <View style={s.fila}>
            <Text style={s.labelFinal}>Pago adicional (Efectivo/Tarjeta)</Text>
            <Text style={s.totalFinal}>{formatearPrecio(total - montoDescuento)}</Text>
          </View>
        </>
      )}
      <Text style={s.disclaimer}>Precios referenciales, pueden variar en la sala de ventas de supermercados no adheridos a BAES.</Text>
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { fontSize: 14, color: C.textMuted },
  total: { fontSize: 18, fontWeight: '700', color: C.text },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginVertical: 10 },
  labelBAES: { fontSize: 14, color: C.primary, fontWeight: '600' },
  descuento: { fontSize: 15, fontWeight: '600', color: C.primary },
  labelFinal: { fontSize: 15, fontWeight: '700', color: C.text },
  totalFinal: { fontSize: 20, fontWeight: '700', color: C.primary },
  disclaimer: { fontSize: 11, color: C.textMuted, marginTop: 10, fontStyle: 'italic' },
});
