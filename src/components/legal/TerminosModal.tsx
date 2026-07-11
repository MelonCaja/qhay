import React from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable,
} from 'react-native';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { TERMINOS_Y_CONDICIONES, TERMINOS_VERSION } from '../../legal/terms';

interface TerminosModalProps {
  visible: boolean;
  onCerrar: () => void;
  /** Si se entrega, muestra botón "Aceptar" que además cierra el modal */
  onAceptar?: () => void;
}

/** Vista minimalista de Términos y Condiciones (onboarding y ajustes) */
export function TerminosModal({ visible, onCerrar, onAceptar }: TerminosModalProps) {
  const C = useColors();
  const s = makeStyles(C);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCerrar}>
      <View style={s.overlay}>
        {/* Capa de cierre detrás del sheet: no envuelve al ScrollView, así
            ningún Pressable ancestro intercepta el gesto de scroll en iOS */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onCerrar} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.header}>
            <Text style={s.titulo}>Términos y Condiciones</Text>
            <Text style={s.version}>v{TERMINOS_VERSION}</Text>
          </View>
          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContenido}
            showsVerticalScrollIndicator
            bounces
            nestedScrollEnabled
          >
            <Text style={s.texto}>{TERMINOS_Y_CONDICIONES}</Text>
          </ScrollView>
          <View style={s.footer}>
            <TouchableOpacity style={s.btnSec} onPress={onCerrar}>
              <Text style={s.btnSecTexto}>Cerrar</Text>
            </TouchableOpacity>
            {onAceptar && (
              <TouchableOpacity
                style={s.btnPrim}
                onPress={() => { onAceptar(); onCerrar(); }}
              >
                <Text style={s.btnPrimTexto}>Acepto los términos</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: '88%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.border, alignSelf: 'center', marginBottom: 14,
  },
  header: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  titulo: { fontSize: 17, fontWeight: '800', color: C.text },
  version: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  // flexShrink:1 = el ScrollView se acota al maxHeight del sheet en vez de
  // crecer al alto del contenido (sin esto el texto quedaba recortado y fijo)
  scroll: { paddingHorizontal: 20, flexShrink: 1 },
  scrollContenido: { paddingBottom: 8 },
  texto: { fontSize: 13, lineHeight: 20, color: C.text, paddingVertical: 16 },
  footer: {
    flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border,
  },
  btnSec: {
    flex: 1, borderRadius: 100, paddingVertical: 13, alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border,
  },
  btnSecTexto: { fontSize: 14, fontWeight: '700', color: C.textMuted },
  btnPrim: {
    flex: 2, borderRadius: 100, paddingVertical: 13, alignItems: 'center',
    backgroundColor: C.primary,
  },
  btnPrimTexto: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
