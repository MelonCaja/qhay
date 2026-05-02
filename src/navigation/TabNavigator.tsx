import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, useColorScheme } from 'react-native';
import { HomeScreen } from '../screens/home/HomeScreen';
import { DespensaScreen } from '../screens/despensa/DespensaScreen';
import { RecetasScreen } from '../screens/recetas/RecetasScreen';
import { ListaComprasScreen } from '../screens/lista/ListaComprasScreen';
import { PerfilScreen } from '../screens/perfil/PerfilScreen';
import { useColors } from '../context/ThemeContext';

export type TabParamList = {
  Home: undefined;
  Despensa: undefined;
  Recetas: undefined;
  Lista: undefined;
  Perfil: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const iconos: Record<string, string> = {
  Home: '⌂',
  Despensa: '◎',
  Recetas: '◈',
  Lista: '☰',
  Perfil: '○',
};

export function TabNavigator() {
  const C = useColors();
  const isDark = useColorScheme() === 'dark';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <View style={{ alignItems: 'center' }}>
            {focused && (
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.primary, marginBottom: 3 }} />
            )}
            <Text style={{ fontSize: 20, color: focused ? C.primary : C.textMuted }}>
              {iconos[route.name]}
            </Text>
          </View>
        ),
        tabBarLabel: ({ focused, children }) => (
          <Text style={{
            fontSize: 10,
            color: focused ? C.primary : C.textMuted,
            fontWeight: focused ? '600' : '400',
            marginTop: 2,
          }}>
            {children}
          </Text>
        ),
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: C.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="Despensa" component={DespensaScreen} options={{ tabBarLabel: 'Despensa' }} />
      <Tab.Screen name="Recetas" component={RecetasScreen} options={{ tabBarLabel: 'Recetas' }} />
      <Tab.Screen name="Lista" component={ListaComprasScreen} options={{ tabBarLabel: 'Lista' }} />
      <Tab.Screen name="Perfil" component={PerfilScreen} options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
}
