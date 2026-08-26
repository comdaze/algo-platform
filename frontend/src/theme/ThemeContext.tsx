import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { applyMode, Mode } from '@cloudscape-design/global-styles';

const STORAGE_KEY = 'algo-theme';

// Default to LIGHT (MLflow has no dark theme, so a light platform stays
// consistent with the embedded MLflow UI). The toggle still lets users switch.
export function getInitialMode(): Mode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? Mode.Dark : Mode.Light;
  } catch {
    return Mode.Light;
  }
}

// Apply eagerly at module load so there is no light flash before React mounts.
applyMode(getInitialMode());

interface ThemeCtx {
  mode: Mode;
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx>({ mode: Mode.Light, isDark: false, toggle: () => {} });

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<Mode>(getInitialMode);

  useEffect(() => {
    applyMode(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode === Mode.Dark ? 'dark' : 'light');
    } catch {
      /* ignore storage errors */
    }
  }, [mode]);

  const toggle = useCallback(() => setMode((m) => (m === Mode.Dark ? Mode.Light : Mode.Dark)), []);

  const value = useMemo(() => ({ mode, isDark: mode === Mode.Dark, toggle }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
