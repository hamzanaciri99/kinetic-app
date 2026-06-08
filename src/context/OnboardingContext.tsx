import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'kinetic.hasSeenOnboarding';

type OnboardingContextValue = {
  visible: boolean;
  finishOnboarding: () => void;
  replayOnboarding: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!value) setVisible(true);
      })
      .catch(() => {});
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      visible,
      finishOnboarding: () => {
        setVisible(false);
        AsyncStorage.setItem(STORAGE_KEY, 'true').catch(() => {});
      },
      replayOnboarding: () => setVisible(true),
    }),
    [visible],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within an OnboardingProvider');
  return ctx;
}
