import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors, ColorPalette } from '../../context/ThemeContext';
import { ListaUniversalScreen } from './ListaUniversalScreen';
import { ListaComprasScreen } from './ListaComprasScreen';

type ModoLista = 'simple' | 'super';

const MODO_KEY = '@qhay_modo_lista';

const MODOS: { id: ModoLista; label: string }[] = [
  { id: 'simple', label: 'Lista simple' },
  { id: 'super', label: 'Supermercados' },
];

// Tab unificada: una sola pestaña de listas con selector fino entre
// la lista simple (sin cadenas) y el monitoreo de precios por supermercado.
export function ListasScreen() {
  const C = useColors();
  const s = makeStyles(C);
  const [modo, setModo] = useState<ModoLista>('simple');

  useEffect(() => {
    AsyncStorage.getItem(MODO_KEY)
      .then((v) => { if (v === 'simple' || v === 'super') setModo(v); })
      .catch(() => {});
  }, []);

  const cambiarModo = (nuevo: ModoLista) => {
    setModo(nuevo);
    AsyncStorage.setItem(MODO_KEY, nuevo).catch(() => {});
  };

  return (
    <View style={s.contenedor}>
      <StatusBar barStyle={C.bg === '#0D0F12' ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      <View style={s.selectorFila}>
        <View style={s.selector}>
          {MODOS.map((m) => {
            const activo = modo === m.id;
            return (
              <Pressable
                key={m.id}
                style={[s.segmento, activo && s.segmentoActivo]}
                onPress={() => cambiarModo(m.id)}
              >
                <Text style={[s.segmentoTexto, activo && s.segmentoTextoActivo]}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {modo === 'simple' ? <ListaUniversalScreen embebida /> : <ListaComprasScreen embebida />}
    </View>
  );
}

const makeStyles = (C: ColorPalette) => StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.bg },
  selectorFila: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 4, alignItems: 'center' },
  selector: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 100,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  segmento: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 100,
  },
  segmentoActivo: { backgroundColor: C.bg },
  segmentoTexto: { fontSize: 13, fontWeight: '500', color: C.textMuted },
  segmentoTextoActivo: { color: C.text, fontWeight: '600' },
});
