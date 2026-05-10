import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { EmailVerificationScreen } from '../screens/auth/EmailVerificationScreen';
import { DetalleRecetaScreen } from '../screens/recetas/DetalleRecetaScreen';
import { AgregarIngredienteScreen } from '../screens/despensa/AgregarIngredienteScreen';
import { ScanearBoletaScreen } from '../screens/despensa/ScanearBoletaScreen';
import { BuscadorProductoScreen } from '../screens/lista/BuscadorProductoScreen';
import { MapaSupermercadosScreen } from '../screens/mapa/MapaSupermercadosScreen';
import { BAESScreen } from '../screens/baes/BAESScreen';
import { PasilloCategoriaScreen } from '../screens/despensa/PasilloCategoriaScreen';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Colors } from '../constants/colors';
import { Receta } from '../types/receta';

export type RootStackParamList = {
  Auth: undefined;
  EmailVerification: undefined;
  Onboarding: undefined;
  Main: undefined;
  DetalleReceta: { receta: Receta };
  AgregarIngrediente: undefined;
  ScanearBoleta: undefined;
  BuscadorProducto: { query?: string } | undefined;
  MapaSupermercados: undefined;
  BAES: undefined;
  PasilloCategoriaScreen: { pasilloId: string; pasilloLabel: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { usuario, cargando, emailVerificado } = useAuth();

  if (cargando) {
    return <LoadingSpinner pantalla mensaje="Cargando Qhay..." />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!usuario ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !emailVerificado ? (
          <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        ) : !usuario.onboardingCompletado ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          // App principal
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen
              name="DetalleReceta"
              component={DetalleRecetaScreen}
              options={{ headerShown: true, title: '' }}
            />
            <Stack.Screen
              name="AgregarIngrediente"
              component={AgregarIngredienteScreen}
              options={{ headerShown: true, title: 'Agregar ingrediente', headerTintColor: Colors.primary }}
            />
            <Stack.Screen
              name="ScanearBoleta"
              component={ScanearBoletaScreen}
              options={{ headerShown: true, title: 'Escanear boleta', headerTintColor: Colors.primary }}
            />
            <Stack.Screen
              name="BuscadorProducto"
              component={BuscadorProductoScreen}
              options={{ headerShown: true, title: 'Buscar producto', headerTintColor: Colors.primary }}
            />
            <Stack.Screen
              name="MapaSupermercados"
              component={MapaSupermercadosScreen}
              options={{ headerShown: true, title: '¿Dónde comprar?', headerTintColor: Colors.primary }}
            />
            <Stack.Screen
              name="BAES"
              component={BAESScreen}
              options={{ headerShown: true, title: 'Beneficio BAES 🎓', headerTintColor: Colors.primary }}
            />
            <Stack.Screen
              name="PasilloCategoriaScreen"
              component={PasilloCategoriaScreen}
              options={({ route }) => ({
                headerShown: true,
                title: route.params.pasilloLabel,
                headerTintColor: Colors.primary,
              })}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

