import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import DevToggle from '@/modules/dev-toggle-native';

type OnboardingState = {
  /** `null` while the on-device flag is still being read. */
  complete: boolean | null;
  finish: () => Promise<void>;
  reset: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingState | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [complete, setComplete] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    DevToggle.getOnboardingComplete().then(value => {
      if (active) setComplete(value);
    });
    return () => {
      active = false;
    };
  }, []);

  const finish = useCallback(async () => {
    await DevToggle.setOnboardingComplete(true);
    setComplete(true);
  }, []);

  const reset = useCallback(async () => {
    await DevToggle.setOnboardingComplete(false);
    setComplete(false);
  }, []);

  const value = useMemo(() => ({ complete, finish, reset }), [complete, finish, reset]);
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return ctx;
}

