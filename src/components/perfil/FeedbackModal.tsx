import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, StyleSheet, Pressable, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { Button } from '../common/Button';
import { enviarFeedback } from '../../services/feedbackService';

interface FeedbackModalProps {
  visible: boolean;
  onCerrar: () => void;
}

const ETIQUETAS_RATING = ['', 'Muy mala 😞', 'Mala', 'Regular', 'Buena', '¡Excelente! 🎉'];

/** Bottom sheet de feedback: estrellas (1-5) + mensaje, guardado directo en
 *  la tabla feedbacks vía cliente Supabase. Sin mailto ni apps externas. */
export function FeedbackModal({ visible, onCerrar }: FeedbackModalProps) {
  const C = useColors();
  const s = makeStyles(C);
  const [rating, setRating] = useState(0);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const cerrar = () => {
    onCerrar();
    setTimeout(() => { setRating(0); setMensaje(''); setEnviado(false); }, 300);
  };

  const enviar = async () => {
    if (rating === 0) {
      Alert.alert('Falta tu puntuación', 'Toca las estrellas para calificar tu experiencia.');
      return;
    }
    const texto = mensaje.trim();
    if (texto.length < 3) {
      Alert.alert('Feedback vacío', 'Cuéntanos un poco más para poder ayudarte.');
      return;
    }
    setCargando(true);
    try {
      await enviarFeedback(rating, texto);
      setEnviado(true);
    } catch (e) {
      console.error('[feedback] Error al guardar:', e);
      Alert.alert('No se pudo enviar', 'Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={cerrar}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={cerrar} />
        <View style={s.sheet}>
          <View style={s.handle} />
          {enviado ? (
            <>
              <Text style={s.emoji}>🙌</Text>
              <Text style={s.titulo}>¡Gracias por tu feedback!</Text>
              <Text style={s.subtitulo}>
                Lo leeremos con atención. Nos ayuda a hacer Qhay cada vez mejor.
              </Text>
              <Button titulo="Listo" onPress={cerrar} estiloContenedor={s.btn} />
            </>
          ) : (
            <>
              <Text style={s.titulo}>💬 Enviar Feedback</Text>
              <Text style={s.subtitulo}>¿Cómo ha sido tu experiencia con Qhay?</Text>

              <View style={s.estrellas}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setRating(n)}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <Ionicons
                      name={n <= rating ? 'star' : 'star-outline'}
                      size={36}
                      color={n <= rating ? '#F5A623' : C.border}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.etiquetaRating}>
                {rating > 0 ? ETIQUETAS_RATING[rating] : ' '}
              </Text>

              <TextInput
                style={s.area}
                placeholder="Ideas, problemas o algo que te encantó…"
                placeholderTextColor={C.textMuted}
                value={mensaje}
                onChangeText={setMensaje}
                multiline
                maxLength={4000}
                textAlignVertical="top"
              />
              <Button
                titulo="Enviar"
                onPress={enviar}
                cargando={cargando}
                estiloContenedor={s.btn}
              />
              <Button
                titulo="Cancelar"
                onPress={cerrar}
                variante="outline"
                estiloContenedor={s.btnCancelar}
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 22,
    paddingBottom: 34,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.border, alignSelf: 'center', marginBottom: 18,
  },
  emoji: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  titulo: { fontSize: 19, fontWeight: '800', color: C.text, letterSpacing: -0.3, textAlign: 'center' },
  subtitulo: { fontSize: 14, color: C.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 14, lineHeight: 20 },
  estrellas: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 6,
  },
  etiquetaRating: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textMuted,
    textAlign: 'center',
    marginBottom: 14,
    minHeight: 18,
  },
  area: {
    minHeight: 110,
    maxHeight: 200,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.surface,
    color: C.text,
    fontSize: 15,
    padding: 14,
    marginBottom: 14,
  },
  btn: { marginTop: 2 },
  btnCancelar: { marginTop: 10, borderWidth: 0 },
});
