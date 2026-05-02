import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ItemLista } from '../../types/producto';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { formatearPrecio } from '../../utils/precioHelper';

interface ProductoItemProps {
  item: ItemLista;
  onToggle: () => void;
  onEliminar: () => void;
  onCambiarCantidad?: (nueva: number) => void;
}

export function ProductoItem({ item, onToggle, onEliminar, onCambiarCantidad }: ProductoItemProps) {
  const C = useColors();
  const s = makeStyles(C);

  return (
    <View style={[s.contenedor, item.completado && s.completado]}>
      <TouchableOpacity style={s.check} onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <View style={[s.circulo, item.completado && s.circuloActivo]}>
          {item.completado && <Text style={s.checkMark}>✓</Text>}
        </View>
      </TouchableOpacity>

      <View style={s.info}>
        <Text style={[s.nombre, item.completado && s.textoCompletado]} numberOfLines={1}>
          {item.nombre}
        </Text>
        <Text style={s.meta}>
          {item.unidad}{item.supermercado ? ` · ${item.supermercado}` : ''}
        </Text>

        {/* Contador de cantidad */}
        {onCambiarCantidad && !item.completado && (
          <View style={s.cantidadFila}>
            <TouchableOpacity
              style={s.btnCantidad}
              onPress={() => onCambiarCantidad(item.cantidad - 1)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={s.btnCantidadTexto}>−</Text>
            </TouchableOpacity>
            <Text style={s.cantidad}>{item.cantidad}</Text>
            <TouchableOpacity
              style={s.btnCantidad}
              onPress={() => onCambiarCantidad(item.cantidad + 1)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={s.btnCantidadTexto}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={s.derecha}>
        {item.precioEstimado ? (
          <Text style={s.precio}>{formatearPrecio(item.precioEstimado * item.cantidad)}</Text>
        ) : null}
        <TouchableOpacity onPress={onEliminar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.eliminar}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  completado: { opacity: 0.5 },
  check: { marginRight: 12 },
  circulo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circuloActivo: { backgroundColor: C.primary, borderColor: C.primary },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  info: { flex: 1 },
  nombre: { fontSize: 15, fontWeight: '600', color: C.text },
  textoCompletado: { textDecorationLine: 'line-through', color: C.textMuted },
  meta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  cantidadFila: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  btnCantidad: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCantidadTexto: { fontSize: 16, color: C.primary, fontWeight: '600', lineHeight: 20 },
  cantidad: { fontSize: 15, fontWeight: '700', color: C.text, minWidth: 24, textAlign: 'center' },
  derecha: { alignItems: 'flex-end', gap: 6, marginLeft: 8 },
  precio: { fontSize: 14, fontWeight: '700', color: C.primary },
  eliminar: { color: C.textMuted, fontSize: 14 },
});
