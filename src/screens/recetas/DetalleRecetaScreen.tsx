import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Modal, TextInput, StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { PasoReceta } from '../../components/recetas/PasoReceta';
import { Button } from '../../components/common/Button';
import { useDespensa } from '../../hooks/useDespensa';
import { useAsistente } from '../../hooks/useAsistente';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<RootStackParamList, 'DetalleReceta'>;

export function DetalleRecetaScreen({ route, navigation }: Props) {
  const C = useColors();
  const s = makeStyles(C);
  const { receta } = route.params;
  const { ingredientes, eliminar } = useDespensa();
  const { usuario } = useAuthStore();
  const [pasoActual, setPasoActual] = useState(0);
  const [mostrarEquiv, setMostrarEquiv] = useState(false);
  const [modalAsistente, setModalAsistente] = useState(false);
  const [pregunta, setPregunta] = useState('');

  const { preguntar, respuesta, cargando: cargandoIA } = useAsistente({
    despensa: ingredientes,
    recetaActual: receta,
    pasoActual: pasoActual + 1,
    restricciones: usuario?.restriccionesAlimentarias ?? [],
  });

  const ingredientesConEstado = receta.ingredientes.map((ing) => ({
    ...ing,
    disponible: ingredientes.some((d) =>
      d.nombre.toLowerCase().includes(ing.nombre.toLowerCase()) ||
      ing.nombre.toLowerCase().includes(d.nombre.toLowerCase())
    ),
  }));

  const disponibles = ingredientesConEstado.filter((i) => i.disponible).length;

  const handleRealizada = () => {
    Alert.alert('¡Excelente! 🎉', '¿Descontar ingredientes usados de tu despensa?', [
      { text: 'No, gracias', style: 'cancel' },
      {
        text: 'Sí, descontar',
        onPress: async () => {
          for (const ing of ingredientesConEstado) {
            if (ing.disponible) {
              const enDespensa = ingredientes.find((d) => d.nombre.toLowerCase().includes(ing.nombre.toLowerCase()));
              if (enDespensa) await eliminar(enDespensa.id);
            }
          }
          navigation.goBack();
        },
      },
    ]);
  };

  const colorDificultad = receta.dificultad === 'facil' ? C.success : receta.dificultad === 'media' ? C.warning : C.error;

  return (
    <View style={s.contenedor}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroEmoji}>🍽️</Text>
          <View style={s.heroOverlay}>
            <Text style={s.heroNombre}>{receta.nombre}</Text>
            <Text style={s.heroDesc}>{receta.descripcion}</Text>
          </View>
        </View>

        {/* Info rápida */}
        <View style={s.infoFila}>
          {[
            `⏱ ${receta.tiempoPreparacion} min`,
            receta.dificultad,
            `👥 ${receta.porciones} porciones`,
            receta.calorias ? `🔥 ${receta.calorias} kcal` : null,
          ].filter(Boolean).map((txt, i) => (
            <View key={i} style={s.infoChip}>
              <Text style={[s.infoTexto, i === 1 && { color: colorDificultad, textTransform: 'capitalize' }]}>
                {txt}
              </Text>
            </View>
          ))}
        </View>

        {/* Coincidencia */}
        {disponibles > 0 && (
          <View style={s.coincidencia}>
            <Text style={s.coincidenciaTexto}>
              Tienes {disponibles} de {receta.ingredientes.length} ingredientes
            </Text>
          </View>
        )}

        {/* Utensilios */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>Utensilios</Text>
          <View style={s.chips}>
            {receta.utensilios.map((ut, i) => (
              <View key={i} style={s.chip}><Text style={s.chipTexto}>{ut}</Text></View>
            ))}
          </View>
        </View>

        {/* Ingredientes */}
        <View style={s.seccion}>
          <View style={s.seccionHeader}>
            <Text style={s.seccionTitulo}>Ingredientes</Text>
            {receta.ingredientes.some((i) => i.equivalenciaSinBalanza) && (
              <TouchableOpacity onPress={() => setMostrarEquiv(!mostrarEquiv)}>
                <Text style={s.linkEquiv}>Sin balanza {mostrarEquiv ? '▲' : '▼'}</Text>
              </TouchableOpacity>
            )}
          </View>
          {ingredientesConEstado.map((ing, i) => (
            <View key={i} style={s.ingFila}>
              <Text style={s.ingCheck}>{ing.disponible ? '✅' : '○'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.ingNombre, !ing.disponible && s.ingFaltante]}>
                  {ing.cantidad} {ing.unidad} de {ing.nombre}
                </Text>
                {mostrarEquiv && ing.equivalenciaSinBalanza && (
                  <Text style={s.ingEquiv}>≈ {ing.equivalenciaSinBalanza}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Pasos */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>Paso a paso</Text>
          <View style={s.navPasos}>
            <TouchableOpacity
              onPress={() => setPasoActual(Math.max(0, pasoActual - 1))}
              disabled={pasoActual === 0}
              style={[s.navBtn, pasoActual === 0 && s.navBtnOff]}
            >
              <Text style={s.navBtnTexto}>← Anterior</Text>
            </TouchableOpacity>
            <Text style={s.navContador}>{pasoActual + 1} / {receta.pasos.length}</Text>
            <TouchableOpacity
              onPress={() => setPasoActual(Math.min(receta.pasos.length - 1, pasoActual + 1))}
              disabled={pasoActual === receta.pasos.length - 1}
              style={[s.navBtn, pasoActual === receta.pasos.length - 1 && s.navBtnOff]}
            >
              <Text style={s.navBtnTexto}>Siguiente →</Text>
            </TouchableOpacity>
          </View>
          {receta.pasos.map((paso, i) => (
            <PasoReceta key={paso.numero} paso={paso} activo={i === pasoActual} completado={i < pasoActual} />
          ))}
        </View>

        {/* Acciones */}
        <View style={s.acciones}>
          <Button titulo="Receta realizada" onPress={handleRealizada} />
          <TouchableOpacity style={s.btnAsistente} onPress={() => setModalAsistente(true)}>
            <Text style={s.btnAsistenteTexto}>Preguntar al asistente</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal asistente */}
      <Modal visible={modalAsistente} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitulo}>Asistente de cocina</Text>
            {respuesta ? (
              <View style={s.respuesta}>
                <Text style={s.respuestaTexto}>{respuesta}</Text>
              </View>
            ) : null}
            <TextInput
              style={s.inputModal}
              placeholder="¿Puedo reemplazar la leche? ¿Cuánto es una taza?"
              value={pregunta}
              onChangeText={setPregunta}
              multiline
              placeholderTextColor={C.textMuted}
            />
            <View style={s.modalBotones}>
              <Button titulo="Preguntar" onPress={async () => { await preguntar(pregunta.trim()); setPregunta(''); }} cargando={cargandoIA} estiloContenedor={{ flex: 1 }} />
              <Button titulo="Cerrar" onPress={() => setModalAsistente(false)} variante="outline" estiloContenedor={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.bg },
  hero: { height: 220, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  heroEmoji: { fontSize: 70 },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', padding: 16 },
  heroNombre: { fontSize: 22, fontWeight: '800', color: '#fff' },
  heroDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  infoFila: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 8, backgroundColor: C.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  infoChip: { backgroundColor: C.bg, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  infoTexto: { fontSize: 12, fontWeight: '600', color: C.text, textTransform: 'capitalize' },
  coincidencia: { margin: 16, backgroundColor: C.primarySoft, borderRadius: 12, padding: 12 },
  coincidenciaTexto: { color: C.primary, fontWeight: '600', fontSize: 14 },
  seccion: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  seccionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seccionTitulo: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 12 },
  linkEquiv: { color: C.primary, fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: C.bg, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  chipTexto: { fontSize: 12, color: C.textMuted },
  ingFila: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  ingCheck: { fontSize: 16, marginTop: 1 },
  ingNombre: { fontSize: 15, color: C.text },
  ingFaltante: { color: C.textMuted },
  ingEquiv: { fontSize: 12, color: C.primary, marginTop: 2, fontStyle: 'italic' },
  navPasos: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navBtn: { padding: 6 },
  navBtnOff: { opacity: 0.3 },
  navBtnTexto: { color: C.primary, fontWeight: '600', fontSize: 14 },
  navContador: { fontSize: 13, color: C.textMuted, fontWeight: '500' },
  acciones: { padding: 16, gap: 10, paddingBottom: 32 },
  btnAsistente: {
    backgroundColor: C.surface,
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  btnAsistenteTexto: { color: C.primary, fontWeight: '700', fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  modalTitulo: { fontSize: 18, fontWeight: '700', color: C.text },
  respuesta: { backgroundColor: C.primarySoft, borderRadius: 12, padding: 14 },
  respuestaTexto: { fontSize: 15, color: C.text, lineHeight: 22 },
  inputModal: { borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 12, fontSize: 15, color: C.text, minHeight: 80, textAlignVertical: 'top', backgroundColor: C.bg },
  modalBotones: { flexDirection: 'row', gap: 10, paddingBottom: 8 },
});
