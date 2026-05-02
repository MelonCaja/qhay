import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { LightColors, DarkColors, ColorPalette } from '../constants/colors';

export type { ColorPalette };

const ThemeContext = createContext<ColorPalette>(LightColors);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  return (
    <ThemeContext.Provider value={scheme === 'dark' ? DarkColors : LightColors}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useColors = (): ColorPalette => useContext(ThemeContext);
