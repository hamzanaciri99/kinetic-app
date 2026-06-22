import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSetting, setSetting } from '../storage/database';

const SETTING_KEY = 'onboarding_seen';

type OnboardingContextValue = {
  visible: boolean;
  finishOnboarding: () => void;
  replayOnboarding: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    getSetting(SETTING_KEY)
      .then((val) => {
        if (!val) setVisible(true);
      })
      .catch(() => setVisible(true));
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      visible,
      finishOnboarding: () => {
        setVisible(false);
        setSetting(SETTING_KEY, 'true').catch(() => {});
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
