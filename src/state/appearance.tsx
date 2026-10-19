import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import DevToggle, { type ThemePreference } from '@/modules/dev-toggle-native';

type ResolvedTheme = 'light' | 'dark';

type AppearanceContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => Promise<boolean>;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const systemTheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    DevToggle.getThemePreference()
      .then(saved => {
        if (active) setPreferenceState(saved);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, []);

  const setPreference = useCallback(async (nextPreference: ThemePreference) => {
    const previous = preference;
    setPreferenceState(nextPreference);
    try {
      const saved = await DevToggle.setThemePreference(nextPreference);
      if (!saved) setPreferenceState(previous);
      return saved;
    } catch {
      setPreferenceState(previous);
      return false;
    }
  }, [preference]);

  const resolvedTheme: ResolvedTheme = preference === 'system'
    ? systemTheme === 'dark' ? 'dark' : 'light'
    : preference;

  const value = useMemo(() => ({ preference, resolvedTheme, setPreference }), [preference, resolvedTheme, setPreference]);

  if (!ready) return null;
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error('useAppearance must be used inside AppearanceProvider.');
  return value;
}
