import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface ThemeContextValue {
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [primaryColor, setPrimaryColorState] = useState(
    () => getComputedStyle(document.documentElement).getPropertyValue('--ts-primary').trim() || '#5E9CE6',
  );

  const setPrimaryColor = useCallback((color: string) => {
    document.documentElement.style.setProperty('--ts-primary', color);
    setPrimaryColorState(color);
  }, []);

  return (
    <ThemeContext.Provider value={{ primaryColor, setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
