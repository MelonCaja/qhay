import React from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/context/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { WebAlertHost } from './src/components/common/WebAlertHost';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppNavigator />
        {Platform.OS === 'web' && <WebAlertHost />}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
