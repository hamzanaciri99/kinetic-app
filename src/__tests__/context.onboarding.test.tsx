/**
 * Tests for OnboardingContext.
 */
jest.mock('../storage/database');

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as db from '../storage/database';
import { OnboardingProvider, useOnboarding } from '../context/OnboardingContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return <OnboardingProvider>{children}</OnboardingProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  (db.getSetting as jest.Mock).mockResolvedValue(null);
  (db.setSetting as jest.Mock).mockResolvedValue(undefined);
});

describe('useOnboarding', () => {
  it('shows onboarding when setting is not found (first run)', async () => {
    const { result } = await renderHook(() => useOnboarding(), { wrapper });
    await waitFor(() => expect(result.current.visible).toBe(true));
  });

  it('hides onboarding when setting is already set', async () => {
    (db.getSetting as jest.Mock).mockResolvedValue('true');
    const { result } = await renderHook(() => useOnboarding(), { wrapper });
    await waitFor(() => expect(result.current.visible).toBe(false));
  });

  it('shows onboarding when getSetting throws', async () => {
    (db.getSetting as jest.Mock).mockRejectedValue(new Error('DB error'));
    const { result } = await renderHook(() => useOnboarding(), { wrapper });
    await waitFor(() => expect(result.current.visible).toBe(true));
  });

  it('finishOnboarding hides the onboarding and writes to DB', async () => {
    const { result } = await renderHook(() => useOnboarding(), { wrapper });
    await waitFor(() => expect(result.current.visible).toBe(true));

    await act(async () => result.current.finishOnboarding());
    await waitFor(() => expect(result.current.visible).toBe(false));
    expect(db.setSetting).toHaveBeenCalledWith('onboarding_seen', 'true');
  });

  it('replayOnboarding shows onboarding again', async () => {
    (db.getSetting as jest.Mock).mockResolvedValue('true');
    const { result } = await renderHook(() => useOnboarding(), { wrapper });
    await waitFor(() => expect(result.current.visible).toBe(false));

    await act(async () => result.current.replayOnboarding());
    await waitFor(() => expect(result.current.visible).toBe(true));
  });
});
