import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, TextInput, StatusBar,
} from 'react-native';
import { mostrarAlerta } from '../../utils/alert';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { PasoReceta } from '../../components/recetas/PasoReceta';
import { Button } from '../../components/common/Button';
import { useDespensa } from '../../hooks/useDespensa';
import { useAsistente } from '../../hooks/useAsistente';
import { useAuthStore } from '../../store/authStore';
import { useFavoritosStore } from '../../store/favoritosStore';
import { escalarMacros, obtenerTagsFitness, validarCaloriasReceta } from '../../utils/fitnessUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'DetalleReceta'>;

export function DetalleRecetaScreen({ route, navigation }: Props) {
  const C = useColors();
  const s = makeStyles(C);
  const { receta } = route.params;
  const { ingredientes, descontarReceta } = useDespensa();
  const { usuario } = useAuthStore();
  const { toggleFavorito, esFavorito } = useFavoritosStore();
  const [pasoActual, setPasoActual] = useState(0);
  const [mostrarEquiv, setMostrarEquiv] = useState(false);
  const [modalAsistente, setModalAsistente] = useState(false);
  const [pregunta, setPregunta] = useState('');
  const [porcionesActuales, setPorcionesActuales] = useState(receta.porciones);

  useEffect(() => {
    validarCaloriasReceta(receta);
  }, [receta.id]);

  const { preguntar, respuesta, cargando: cargandoIA } = useAsistente({
    despensa: ingredientes,
    recetaActual: receta,
    pasoActual: pasoActual + 1,
    restricciones: usuario?.restriccionesAlimentarias ?? [],
  });

  const factorEscala = receta.porciones > 0 ? porcionesActuales / receta.porciones : 1;
  const caloriasEscaladas = receta.calorias ? Math.round(receta.calorias * factorEscala) : undefined;
  const macrosEscalados = receta.macros ? escalarMacros(receta.macros, factorEscala) : undefined;
  const tagsFitness = obtenerTagsFitness(receta.macros);
  const favorito = esFavorito(receta.id);

  const ingredientesConEstado = receta.ingredientes.map((ing) => ({
    ...ing,
    disponible: ingredientes.some((d) =>
      d.nombre.toLowerCase().includes(ing.nombre.toLowerCase()) ||
      ing.nombre.toLowerCase().includes(d.nombre.toLowerCase())
    ),
  }));

  const disponibles = ingredientesConEstado.filter((i) => i.disponible).length;

  const handleRealizada = () => {
    mostrarAlerta('¡Excelente! 🎉', '¿Descontar ingredientes usados de tu despensa?', [
      { text: 'No, gracias', style: 'cancel' },
      {
        text: 'Sí, descontar',
        onPress: async () => {
          try {
            const descuentos = await descontarReceta(receta.ingredientes);
            const agotados = descuentos.filter((d) => d.cantidadRestante <= 0);
            const resumen = [
              descuentos.length > 0
                ? `Se descontaron ${descuentos.length} ingredientes.`
                : 'No había ingredientes que descontar.',
              agotados.length > 0
                ? `Se agotaron: ${agotados.map((d) => d.nombre).join(', ')}.`
                : null,
            ].filter(Boolean).join('\n');
            mostrarAlerta('Despensa actualizada', resumen, [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          } catch {
            mostrarAlerta('Error', 'No se pudo actualizar la despensa.');
          }
        },
      },
    ]);
  };

  const handleToggleFavorito = () => {
    toggleFavorito(receta.id);
    if (!favorito && receta.esFitness) {
      mostrarAlerta('⭐ Guardado en Mis Metas', 'Esta receta ahora aparece en tu sección Mis Metas dentro de Perfil.');
    }
  };

  const colorDificultad = receta.dificultad === 'facil' ? C.success : receta.dificultad === 'media' ? C.warning : C.error;

  return (
    <View style={s.contenedor}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroEmoji}>🍽️</Text>
          <TouchableOpacity style={s.btnFav} onPress={handleToggleFavorito} activeOpacity={0.7}>
            <Text style={s.btnFavTexto}>{favorito ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
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
            caloriasEscaladas ? `🔥 ${caloriasEscaladas} kcal` : null,
          ].filter(Boolean).map((txt, i) => (
            <View key={i} style={[s.infoChip, !!caloriasEscaladas && i === 3 && s.infoChipCalorias]}>
              <Text style={[s.infoTexto, i === 1 && { color: colorDificultad, textTransform: 'capitalize' }, !!caloriasEscaladas && i === 3 && s.infoTextoCalorias]}>
                {txt}
              </Text>
            </View>
          ))}
          {receta.esFitness && (
            <View style={s.infoChipFitness}>
              <Text style={s.infoTextoFitness}>💪 Apto fitness</Text>
            </View>
          )}
        </View>

        {/* Tags fitness dinámicos */}
        {tagsFitness.length > 0 && (
          <View style={s.tagsFila}>
            {tagsFitness.map((tag) => (
              <View key={tag.label} style={[s.tagChip, { backgroundColor: tag.bgColor }]}>
                <Text style={[s.tagTexto, { color: tag.color }]}>{tag.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Macros con Smart Scaling */}
        {macrosEscalados && (
          <View style={s.macrosContenedor}>
            <View style={s.macrosHeader}>
              <Text style={s.macrosTitulo}>Macros por porción</Text>
              <View style={s.stepper}>
                <TouchableOpacity
                  style={s.stepperBtn}
                  onPress={() => setPorcionesActuales(Math.max(1, porcionesActuales - 1))}
                >
                  <Text style={s.stepperBtnTexto}>−</Text>
                </TouchableOpacity>
                <Text style={s.stepperValor}>{porcionesActuales}</Text>
                <TouchableOpacity
                  style={s.stepperBtn}
                  onPress={() => setPorcionesActuales(Math.min(12, porcionesActuales + 1))}
                >
                  <Text style={s.stepperBtnTexto}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            {porcionesActuales !== receta.porciones && (
              <Text style={s.macrosNota}>
                Escalado ×{(factorEscala).toFixed(1)} · base: {receta.porciones} porc.
              </Text>
            )}
            <View style={s.macrosFila}>
              {[
                { label: 'Proteínas', valor: macrosEscalados.proteinas, color: '#4CAF50', emoji: '🥩' },
                { label: 'Carbos', valor: macrosEscalados.carbohidratos, color: '#2196F3', emoji: '🌾' },
                { label: 'Grasas', valor: macrosEscalados.grasas, color: '#FF9800', emoji: '🫒' },
              ].map((macro) => {
                const total = macrosEscalados.proteinas + macrosEscalados.carbohidratos + macrosEscalados.grasas;
                const pct = total > 0 ? Math.round((macro.valor / total) * 100) : 0;
                return (
                  <View key={macro.label} style={s.macroItem}>
                    <Text style={s.macroEmoji}>{macro.emoji}</Text>
                    <View style={s.macroBarraFondo}>
                      <View style={[s.macroBarraRelleno, { width: `${pct}%` as `${number}%`, backgroundColor: macro.color }]} />
                    </View>
                    <Text style={s.macroValor}>{macro.valor}g</Text>
                    <Text style={s.macroLabel}>{macro.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

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
  btnFav: { position: 'absolute', top: 12, right: 12, padding: 8, zIndex: 10 },
  btnFavTexto: { fontSize: 26 },
  infoFila: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 8, backgroundColor: C.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  infoChip: { backgroundColor: C.bg, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  infoChipCalorias: { backgroundColor: '#FFF3E0' },
  infoChipFitness: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  infoTexto: { fontSize: 12, fontWeight: '600', color: C.text, textTransform: 'capitalize' },
  infoTextoCalorias: { color: '#E65100' },
  infoTextoFitness: { fontSize: 12, fontWeight: '700', color: '#2E7D32' },
  tagsFila: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2, gap: 8, backgroundColor: C.surface },
  tagChip: { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12 },
  tagTexto: { fontSize: 12, fontWeight: '700' },
  macrosContenedor: { margin: 16, backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  macrosHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  macrosTitulo: { fontSize: 15, fontWeight: '700', color: C.text },
  macrosNota: { fontSize: 11, color: C.textMuted, marginBottom: 10, fontStyle: 'italic' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.bg, borderRadius: 10, padding: 4 },
  stepperBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stepperBtnTexto: { fontSize: 18, color: C.primary, fontWeight: '700', lineHeight: 22 },
  stepperValor: { fontSize: 15, fontWeight: '700', color: C.text, minWidth: 20, textAlign: 'center' },
  macrosFila: { gap: 10, marginTop: 10 },
  macroItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  macroEmoji: { fontSize: 16, width: 22 },
  macroBarraFondo: { flex: 1, height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
  macroBarraRelleno: { height: '100%', borderRadius: 4 },
  macroValor: { fontSize: 12, fontWeight: '700', color: C.text, minWidth: 34, textAlign: 'right' },
  macroLabel: { fontSize: 11, color: C.textMuted, minWidth: 62 },
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
