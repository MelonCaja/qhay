import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ingrediente } from '../../types/ingrediente';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { diasParaVencer } from '../../utils/fechaHelper';

interface VencimientoAlertProps {
  ingredientes: Ingrediente[];
}

/** Alerta de vencimiento estilo HUD: barra lateral flúor + countdown por item */
export function VencimientoAlert({ ingredientes }: VencimientoAlertProps) {
  const C = useColors();
  const s = makeStyles(C);

  const conDias = ingredientes
    .map((i) => ({ item: i, dias: diasParaVencer(i.fechaVencimiento) }))
    .filter((x): x is { item: Ingrediente; dias: number } => x.dias !== null && x.dias <= 7)
    .sort((a, b) => a.dias - b.dias);

  if (conDias.length === 0) return null;

  const criticos = conDias.filter((x) => x.dias <= 2);
  const esCritico = criticos.length > 0;
  const color = esCritico ? C.expiryCritical : C.expiryWarning;

  const etiquetaDias = (dias: number) =>
    dias < 0 ? 'VENCIDO' : dias === 0 ? 'HOY' : `${dias}D`;

  return (
    <View style={[s.contenedor, { borderColor: color + '55' }]}>
      <View style={[s.barraLateral, { backgroundColor: color }]} />
      <View style={s.cuerpo}>
        <View style={s.headerFila}>
          <View style={[s.dot, { backgroundColor: color }]} />
          <Text style={[s.headerTexto, { color }]}>
            {esCritico ? 'VENCIMIENTO CRÍTICO' : 'PRÓXIMOS A VENCER'}
          </Text>
          <View style={[s.contador, { backgroundColor: color + '22' }]}>
            <Text style={[s.contadorTexto, { color }]}>{conDias.length}</Text>
          </View>
        </View>
        <View style={s.chips}>
          {conDias.slice(0, 6).map(({ item, dias }) => {
            const cColor = dias <= 2 ? C.expiryCritical : C.expiryWarning;
            return (
              <View key={item.id} style={[s.chip, { borderColor: cColor + '66' }]}>
                <Text style={s.chipNombre} numberOfLines={1}>{item.nombre}</Text>
                <Text style={[s.chipDias, { color: cColor }]}>{etiquetaDias(dias)}</Text>
              </View>
            );
          })}
          {conDias.length > 6 && (
            <Text style={s.masTexto}>+{conDias.length - 6} más</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  barraLateral: { width: 4 },
  cuerpo: { flex: 1, padding: 12 },
  headerFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  headerTexto: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  contador: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  contadorTexto: { fontSize: 12, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.bg,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    maxWidth: '100%',
  },
  chipNombre: { fontSize: 12, fontWeight: '600', color: C.text, maxWidth: 120 },
  chipDias: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  masTexto: { fontSize: 12, color: C.textMuted, alignSelf: 'center' },
});
