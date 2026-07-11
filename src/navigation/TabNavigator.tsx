import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/home/HomeScreen';
import { DespensaScreen } from '../screens/despensa/DespensaScreen';
import { RecetasScreen } from '../screens/recetas/RecetasScreen';
import { ListasScreen } from '../screens/lista/ListasScreen';
import { PerfilScreen } from '../screens/perfil/PerfilScreen';
import { useAuthStore } from '../store/authStore';

export type TabParamList = {
  Home: undefined;
  Despensa: undefined;
  Recetas: undefined;
  Lista: undefined;
  Perfil: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

type IconoIon = keyof typeof Ionicons.glyphMap;

// [enfocado (filled), reposo (outline)]
const iconos: Record<Exclude<keyof TabParamList, 'Perfil'>, [IconoIon, IconoIon]> = {
  Home: ['home', 'home-outline'],
  Despensa: ['file-tray-full', 'file-tray-full-outline'],
  Recetas: ['restaurant', 'restaurant-outline'],
  Lista: ['cart', 'cart-outline'],
};

// Paleta fija de la barra: bluish-black que contrasta en light y dark
const BARRA = {
  fondo: '#141821',
  activo: '#FFFFFF',
  inactivo: 'rgba(255,255,255,0.55)',
  ovalo: 'rgba(255,255,255,0.14)',
};

function IconoTab({ ruta, focused }: { ruta: Exclude<keyof TabParamList, 'Perfil'>; focused: boolean }) {
  return (
    <View style={[st.ovalo, focused && st.ovaloActivo]}>
      <Ionicons
        name={iconos[ruta][focused ? 0 : 1]}
        size={23}
        color={focused ? BARRA.activo : BARRA.inactivo}
      />
    </View>
  );
}

function IconoPerfil({ focused }: { focused: boolean }) {
  const { usuario } = useAuthStore();

  return (
    <View style={[st.ovalo, focused && st.ovaloActivo]}>
      {usuario?.foto ? (
        <Image source={{ uri: usuario.foto }} style={[st.avatar, focused && st.avatarActivo]} />
      ) : usuario?.nombre ? (
        <View style={[st.avatar, st.avatarLetraFondo, focused && st.avatarActivo]}>
          <Text style={st.avatarLetra}>{usuario.nombre.charAt(0).toUpperCase()}</Text>
        </View>
      ) : (
        <Ionicons
          name={focused ? 'person' : 'person-outline'}
          size={23}
          color={focused ? BARRA.activo : BARRA.inactivo}
        />
      )}
    </View>
  );
}

export function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      // La píldora flota fuera del borde: el inset inferior ya va en `bottom`,
      // sin esto la barra duplica el safe area como padding interno y descentra los iconos
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) =>
          route.name === 'Perfil'
            ? <IconoPerfil focused={focused} />
            : <IconoTab ruta={route.name} focused={focused} />,
        tabBarStyle: {
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: Math.max(insets.bottom, 12) + 8,
          height: 60,
          borderRadius: 30,
          backgroundColor: BARRA.fondo,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.22,
          shadowRadius: 16,
          elevation: 10,
        },
        tabBarItemStyle: { justifyContent: 'center' },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Despensa" component={DespensaScreen} />
      <Tab.Screen name="Recetas" component={RecetasScreen} />
      <Tab.Screen name="Lista" component={ListasScreen} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
    </Tab.Navigator>
  );
}

const st = StyleSheet.create({
  ovalo: {
    width: 52,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ovaloActivo: { backgroundColor: BARRA.ovalo },
  avatar: { width: 27, height: 27, borderRadius: 14 },
  avatarActivo: { borderWidth: 1.5, borderColor: BARRA.activo },
  avatarLetraFondo: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetra: { fontSize: 13, fontWeight: '700', color: BARRA.activo },
});
