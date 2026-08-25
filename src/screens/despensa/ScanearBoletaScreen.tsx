import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, StatusBar, Image, TextInput, Platform,
} from 'react-native';
import { mostrarAlerta } from '../../utils/alert';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { useDespensa } from '../../hooks/useDespensa';
import { escanearBoleta, buscarPorCodigoBarras, ItemBoleta } from '../../services/boleta';
import { mapearItemsAProductos, ItemBoletaMapeado } from '../../services/ocrService';
import {
  puedeEscanearBoleta, registrarEscaneoBoleta, escaneosRestantes, LIMITE_ESCANEOS_FREE,
} from '../../services/userService';
import { useAuthStore } from '../../store/authStore';
import { UnidadMedida } from '../../types/ingrediente';

type Modo = 'barras' | 'foto';
type Paso = 'camara' | 'preview' | 'procesando' | 'revision';

interface ItemConCheck extends ItemBoletaMapeado {
  seleccionado: boolean;
}

interface FotoCapturada {
  uri: string;
  base64: string;
}

export function ScanearBoletaScreen() {
  const C = useColors();
  const s = makeStyles(C);
  const navigation = useNavigation();
  const { agregar } = useDespensa();
  const { usuario } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [modo, setModo] = useState<Modo>('barras');
  const [paso, setPaso] = useState<Paso>('camara');
  const [foto, setFoto] = useState<FotoCapturada | null>(null);
  const [items, setItems] = useState<ItemConCheck[]>([]);
  const [guardando, setGuardando] = useState(false);
  const escaneandoRef = useRef(false);

  // ── Modo foto: abre la cámara nativa con ImagePicker ─────────────────────
  const abrirCamara = useCallback(async () => {
    // En web no hay cámara nativa de app: ImagePicker.launchCameraAsync no
    // está soportado. launchImageLibraryAsync sí lo está — en el navegador
    // lo implementa como <input type="file" accept="image/*">, que en
    // móvil ofrece igual la opción de tomar una foto nueva.
    if (Platform.OS === 'web') {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]?.base64) {
        setFoto({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
        setPaso('preview');
      }
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      mostrarAlerta('Permiso requerido', 'Necesitamos acceso a la cámara.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setFoto({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
      setPaso('preview');
    }
  }, []);

  // ── Modo foto: analizar la imagen ya capturada ────────────────────────────
  const analizarFoto = useCallback(async () => {
    if (!foto?.base64) return;

    // Límite plan Free: 4 escaneos/mes (contador en /users/{uid}.limites)
    if (usuario && !puedeEscanearBoleta(usuario)) {
      mostrarAlerta(
        'Límite mensual alcanzado',
        `Tu plan gratuito incluye ${LIMITE_ESCANEOS_FREE} escaneos de boleta al mes. Pásate a Premium para escaneos ilimitados.`,
      );
      return;
    }

    setPaso('procesando');
    try {
      const extraidos = await escanearBoleta(foto.base64);
      if (extraidos.length === 0) {
        mostrarAlerta(
          'Sin productos detectados',
          'No se encontraron productos. Intenta con mejor iluminación o usa el modo código de barras.',
          [{ text: 'OK', onPress: () => setPaso('preview') }]
        );
        return;
      }
      // Fuzzy matching contra /products_scraped: imagen + precio de referencia
      const mapeados = await mapearItemsAProductos(extraidos).catch(() => extraidos);
      if (usuario) registrarEscaneoBoleta(usuario).catch(() => {});
      setItems(mapeados.map((i) => ({ ...i, seleccionado: true })));
      setPaso('revision');
    } catch (err: any) {
      mostrarAlerta('Error al analizar', err?.message ?? 'Error desconocido', [
        { text: 'OK', onPress: () => setPaso('preview') },
      ]);
    }
  }, [foto, usuario]);

  // ── Modo barras: escaneo automático ──────────────────────────────────────
  const handleBarcode = useCallback(async ({ data: codigo }: { data: string }) => {
    if (escaneandoRef.current) return;
    escaneandoRef.current = true;
    setPaso('procesando');
    try {
      const producto = await buscarPorCodigoBarras(codigo);
      if (!producto) {
        mostrarAlerta(
          'Producto no encontrado',
          `Código: ${codigo}\n¿Quieres agregarlo manualmente?`,
          [
            { text: 'Cancelar', onPress: () => { escaneandoRef.current = false; setPaso('camara'); } },
            {
              text: 'Agregar igual', onPress: () => {
                setItems((p) => [...p, { nombre: `Producto ${codigo}`, cantidad: 1, unidad: 'unidad', seleccionado: true }]);
                escaneandoRef.current = false;
                setPaso('revision');
              },
            },
          ]
        );
        return;
      }
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.nombre.toLowerCase() === producto.nombre.toLowerCase());
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 };
          return next;
        }
        return [...prev, { ...producto, seleccionado: true }];
      });
      setPaso('revision');
    } catch {
      mostrarAlerta('Error', 'No se pudo consultar el producto.', [
        { text: 'OK', onPress: () => { escaneandoRef.current = false; setPaso('camara'); } },
      ]);
    } finally {
      escaneandoRef.current = false;
    }
  }, []);

  // ── Revisión: guardar en despensa ─────────────────────────────────────────
  const toggleItem = useCallback((idx: number) =>
    setItems((p) => p.map((it, i) => i === idx ? { ...it, seleccionado: !it.seleccionado } : it)), []);

  const cambiarCantidad = useCallback((idx: number, delta: number) =>
    setItems((p) => p.map((it, i) => i === idx
      ? { ...it, cantidad: Math.max(1, it.cantidad + delta) }
      : it)), []);

  const editarCantidad = useCallback((idx: number, valor: string) => {
    const n = parseInt(valor, 10);
    if (!isNaN(n) && n > 0) {
      setItems((p) => p.map((it, i) => i === idx ? { ...it, cantidad: n } : it));
    }
  }, []);

  const handleAgregar = useCallback(async () => {
    const sel = items.filter((i) => i.seleccionado);
    if (!sel.length) return;
    setGuardando(true);
    try {
      await Promise.all(sel.map((item) => agregar({
        nombre: item.nombre,
        cantidad: item.cantidad,
        unidad: item.unidad as UnidadMedida,
        precioUnitario: item.precioUnitario,
        categoria: item.categoria,
        imageUrl: item.imageUrl,
        agregadoPor: 'boleta',
      })));
      mostrarAlerta('¡Listo!', `${sel.length} producto${sel.length !== 1 ? 's' : ''} agregado${sel.length !== 1 ? 's' : ''} a tu despensa.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch {
      mostrarAlerta('Error', 'No se pudieron guardar algunos productos.');
    } finally {
      setGuardando(false);
    }
  }, [items, agregar, navigation]);

  const resetear = useCallback(() => {
    escaneandoRef.current = false;
    setFoto(null);
    setPaso('camara');
    if (modo === 'foto') setItems([]);
  }, [modo]);

  const cambiarModo = useCallback((m: Modo) => {
    escaneandoRef.current = false;
    setModo(m);
    setFoto(null);
    setItems([]);
    setPaso('camara');
  }, []);

  // ── Renders ───────────────────────────────────────────────────────────────

  // Procesando
  if (paso === 'procesando') {
    return (
      <View style={[s.flex, s.centrado, { backgroundColor: '#09090B' }]}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={s.procesandoText}>
          {modo === 'barras' ? 'Buscando producto...' : 'Analizando boleta con IA...'}
        </Text>
        <Text style={s.procesandoSub}>Esto puede tomar unos segundos</Text>
      </View>
    );
  }

  // Preview de la foto (solo modo foto)
  if (paso === 'preview' && foto) {
    return (
      <View style={[s.flex, { backgroundColor: '#09090B' }]}>
        <StatusBar barStyle="light-content" />
        <View style={s.previewHeader}>
          <Text style={s.previewTitulo}>¿Se ve bien la boleta?</Text>
          <Text style={s.previewSub}>Asegúrate de que el texto sea legible antes de analizar</Text>
        </View>

        <Image source={{ uri: foto.uri }} style={s.previewImg} resizeMode="contain" />

        <View style={s.previewFooter}>
          <TouchableOpacity style={s.btnSec} onPress={abrirCamara}>
            <Text style={s.btnSecTexto}>{Platform.OS === 'web' ? 'Elegir otra foto' : 'Retomar foto'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnPrim} onPress={analizarFoto}>
            <Text style={s.btnPrimTexto}>Analizar boleta</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Revisión de productos
  if (paso === 'revision') {
    const totalSel = items.filter((i) => i.seleccionado).length;
    return (
      <View style={[s.flex, { backgroundColor: C.bg }]}>
        <StatusBar barStyle={C.bg === '#0D0F12' ? 'light-content' : 'dark-content'} backgroundColor={C.surface} />
        <View style={s.revHeader}>
          <Text style={s.revTitulo}>
            {modo === 'barras' ? 'Productos escaneados' : 'Productos detectados'}
          </Text>
          <Text style={s.revSub}>{items.length} productos · toca para deseleccionar</Text>
        </View>

        <ScrollView contentContainerStyle={s.lista} showsVerticalScrollIndicator={false}>
          {items.map((item, idx) => (
            <View key={idx} style={[s.itemCard, !item.seleccionado && s.itemOff]}>
              <TouchableOpacity
                style={[s.check, item.seleccionado && s.checkOn]}
                onPress={() => toggleItem(idx)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {item.seleccionado && <Text style={s.checkMark}>✓</Text>}
              </TouchableOpacity>
              <View style={s.itemInfo}>
                <Text style={[s.itemNombre, !item.seleccionado && s.textOff]} numberOfLines={2}>
                  {item.nombre}
                </Text>
                <Text style={[s.itemDetalle, !item.seleccionado && s.textOff]}>
                  {item.unidad}
                  {item.precioUnitario ? ` · $${item.precioUnitario.toLocaleString('es-CL')}` : ''}
                </Text>
              </View>
              {/* Editor de cantidad manual */}
              <View style={s.cantidadRow}>
                <TouchableOpacity style={s.cantBtn} onPress={() => cambiarCantidad(idx, -1)}>
                  <Text style={s.cantBtnTxt}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={s.cantInput}
                  value={String(item.cantidad)}
                  onChangeText={(v) => editarCantidad(idx, v)}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
                <TouchableOpacity style={s.cantBtn} onPress={() => cambiarCantidad(idx, 1)}>
                  <Text style={s.cantBtnTxt}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={s.revFooter}>
          <TouchableOpacity style={s.btnSec} onPress={resetear}>
            <Text style={s.btnSecTexto}>
              {modo === 'barras' ? '+ Escanear otro' : 'Nueva foto'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btnPrim, (guardando || totalSel === 0) && s.btnOff]}
            onPress={handleAgregar}
            disabled={guardando || totalSel === 0}
          >
            {guardando
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.btnPrimTexto}>Agregar {totalSel > 0 ? totalSel : ''} a despensa</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Pantalla principal: tabs + cámara ─────────────────────────────────────
  return (
    <View style={s.flex}>
      <StatusBar barStyle="light-content" />

      <View style={s.tabs}>
        {(['barras', 'foto'] as Modo[]).map((m) => (
          <TouchableOpacity key={m} style={[s.tab, modo === m && s.tabActivo]} onPress={() => cambiarModo(m)}>
            <Text style={[s.tabTexto, modo === m && s.tabTextoActivo]}>
              {m === 'barras' ? '||| Código de barras' : '📄 Foto de boleta'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {modo === 'barras' ? (
        /* ── Escáner de barras ──────────────────────────────────────── */
        permission?.granted ? (
          <CameraView
            style={s.camara}
            facing="back"
            onBarcodeScanned={handleBarcode}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
          >
            <View style={s.overlay}>
              <Text style={s.guiaHint}>Apunta al código de barras del producto</Text>
              <View style={s.guiaBarras}>
                <View style={[s.esq, s.esqTL]} /><View style={[s.esq, s.esqTR]} />
                <View style={[s.esq, s.esqBL]} /><View style={[s.esq, s.esqBR]} />
                <View style={s.lineaEscaneo} />
              </View>
              <Text style={s.guiaHintSub}>El escaneo es automático</Text>
            </View>
          </CameraView>
        ) : (
          <View style={[s.flex, s.centrado]}>
            <Text style={s.permisoEmoji}>📷</Text>
            <Text style={s.permisoTitulo}>Se necesita la cámara</Text>
            <TouchableOpacity style={s.permisoBtn} onPress={requestPermission}>
              <Text style={s.permisoBtnTexto}>Permitir cámara</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        /* ── Modo foto: botón grande ────────────────────────────────── */
        <View style={[s.flex, s.centrado, { backgroundColor: '#09090B' }]}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>📄</Text>
          <Text style={s.fotoTitulo}>
            {Platform.OS === 'web' ? 'Sube una foto de tu boleta' : 'Fotografía tu boleta'}
          </Text>
          <Text style={s.fotoSub}>
            {Platform.OS === 'web'
              ? 'Elige una foto nítida y bien iluminada.\nLa IA detectará todos los productos.'
              : 'Captura toda la boleta, bien iluminada.\nLa IA detectará todos los productos.'}
          </Text>
          {usuario && usuario.plan !== 'premium' && (
            <Text style={s.fotoLimite}>
              {escaneosRestantes(usuario)} de {LIMITE_ESCANEOS_FREE} escaneos disponibles este mes
            </Text>
          )}
          <TouchableOpacity style={s.btnTomarFoto} onPress={abrirCamara}>
            <Text style={s.btnTomarFotoTexto}>{Platform.OS === 'web' ? 'Subir foto' : 'Abrir cámara'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#09090B' },
  centrado: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },

  procesandoText: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16 },
  procesandoSub: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },

  tabs: { flexDirection: 'row', backgroundColor: '#18181B', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 100, alignItems: 'center', borderWidth: 1.5, borderColor: '#3F3F46' },
  tabActivo: { backgroundColor: C.primary, borderColor: C.primary },
  tabTexto: { fontSize: 13, color: '#A1A1AA', fontWeight: '600' },
  tabTextoActivo: { color: '#fff', fontWeight: '700' },

  // Modo foto
  fotoTitulo: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  fotoSub: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  fotoLimite: { fontSize: 12, color: '#FBBF24', fontWeight: '600' },
  btnTomarFoto: { backgroundColor: C.primary, borderRadius: 100, paddingVertical: 16, paddingHorizontal: 40, marginTop: 8 },
  btnTomarFotoTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Preview
  previewHeader: { padding: 20, backgroundColor: '#18181B' },
  previewTitulo: { fontSize: 18, fontWeight: '700', color: '#fff' },
  previewSub: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  previewImg: { flex: 1, width: '100%' },
  previewFooter: { flexDirection: 'row', padding: 14, gap: 10, backgroundColor: '#18181B' },

  // Cámara (barras)
  camara: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 80 },
  guiaHint: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  guiaHintSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center' },
  guiaBarras: { width: 300, height: 130, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  lineaEscaneo: { width: '85%', height: 2, backgroundColor: C.primary, opacity: 0.9 },
  esq: { position: 'absolute', width: 24, height: 24, borderColor: '#fff' },
  esqTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 5 },
  esqTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 5 },
  esqBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 5 },
  esqBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 5 },

  // Permiso
  permisoEmoji: { fontSize: 48, color: '#fff' },
  permisoTitulo: { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },
  permisoBtn: { backgroundColor: C.primary, borderRadius: 100, paddingVertical: 13, paddingHorizontal: 28, marginTop: 8 },
  permisoBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Revisión
  revHeader: { backgroundColor: C.surface, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  revTitulo: { fontSize: 19, fontWeight: '700', color: C.text },
  revSub: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  lista: { padding: 14, gap: 8, paddingBottom: 24 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 14, padding: 12, gap: 10, borderWidth: 1.5, borderColor: C.primary },
  cantidadRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  cantBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  cantBtnTxt: { fontSize: 18, color: C.primary, fontWeight: '700', lineHeight: 22 },
  cantInput: { width: 40, height: 30, borderRadius: 8, borderWidth: 1.5, borderColor: C.border, textAlign: 'center', fontSize: 14, fontWeight: '700', color: C.text, backgroundColor: C.bg },
  itemOff: { borderColor: C.border, opacity: 0.5 },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkOn: { backgroundColor: C.primary, borderColor: C.primary },
  checkMark: { color: '#fff', fontWeight: '700', fontSize: 13 },
  itemInfo: { flex: 1 },
  itemNombre: { fontSize: 15, fontWeight: '600', color: C.text },
  itemDetalle: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  textOff: { color: C.textMuted },
  revFooter: { flexDirection: 'row', padding: 14, gap: 10, backgroundColor: C.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },

  // Botones compartidos
  btnSec: { borderRadius: 100, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1.5, borderColor: '#3F3F46', alignItems: 'center', justifyContent: 'center' },
  btnSecTexto: { fontSize: 13, color: C.primary, fontWeight: '700' },
  btnPrim: { flex: 1, backgroundColor: C.primary, borderRadius: 100, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnOff: { opacity: 0.4 },
  btnPrimTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
