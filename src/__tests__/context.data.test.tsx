/**
 * Tests for DataContext: DataProvider, useDataReset, useClearOnReset.
 */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { DataProvider, useDataReset, useClearOnReset, type ClearableCategory } from '../context/DataContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return <DataProvider>{children}</DataProvider>;
}

describe('useDataReset', () => {
  it('provides initial reset tokens all set to 0', async () => {
    const { result } = await renderHook(() => useDataReset(), { wrapper });
    await waitFor(() => {
      expect(result.current.resetTokens.workouts).toBe(0);
      expect(result.current.resetTokens.meals).toBe(0);
      expect(result.current.resetTokens.gallery).toBe(0);
      expect(result.current.resetTokens.categories).toBe(0);
      expect(result.current.resetTokens.weight).toBe(0);
    });
  });

  it('clearCategory increments the token for the given category', async () => {
    const { result } = await renderHook(() => useDataReset(), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());
    await act(async () => result.current.clearCategory('workouts'));
    await waitFor(() => expect(result.current.resetTokens.workouts).toBe(1));
    expect(result.current.resetTokens.meals).toBe(0);
  });

  it('clearCategory can be called multiple times', async () => {
    const { result } = await renderHook(() => useDataReset(), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());
    await act(async () => result.current.clearCategory('meals'));
    await act(async () => result.current.clearCategory('meals'));
    await waitFor(() => expect(result.current.resetTokens.meals).toBe(2));
  });

  it('each category is incremented independently', async () => {
    const { result } = await renderHook(() => useDataReset(), { wrapper });
    await waitFor(() => expect(result.current).not.toBeNull());
    const categories: ClearableCategory[] = ['workouts', 'meals', 'gallery', 'categories', 'weight'];
    for (const cat of categories) {
      await act(async () => result.current.clearCategory(cat));
    }
    await waitFor(() => categories.forEach((cat) => expect(result.current.resetTokens[cat]).toBe(1)));
  });
});

describe('useClearOnReset', () => {
  it('does NOT call onReset on initial mount', async () => {
    const onReset = jest.fn();
    await renderHook(() => useClearOnReset('workouts', onReset), { wrapper });
    expect(onReset).not.toHaveBeenCalled();
  });

  it('calls onReset when the matching category is cleared', async () => {
    const onReset = jest.fn();
    const { result } = await renderHook(
      () => ({ data: useDataReset(), _: useClearOnReset('workouts', onReset) }),
      { wrapper },
    );
    await waitFor(() => expect(result.current).not.toBeNull());
    await act(async () => result.current.data.clearCategory('workouts'));
    await waitFor(() => expect(onReset).toHaveBeenCalledTimes(1));
  });

  it('does NOT call onReset when a different category is cleared', async () => {
    const onReset = jest.fn();
    const { result } = await renderHook(
      () => ({ data: useDataReset(), _: useClearOnReset('workouts', onReset) }),
      { wrapper },
    );
    await waitFor(() => expect(result.current).not.toBeNull());
    await act(async () => result.current.data.clearCategory('meals'));
    await waitFor(() => expect(result.current.data.resetTokens.meals).toBe(1));
    expect(onReset).not.toHaveBeenCalled();
  });

  it('calls onReset each time the category is cleared', async () => {
    const onReset = jest.fn();
    const { result } = await renderHook(
      () => ({ data: useDataReset(), _: useClearOnReset('gallery', onReset) }),
      { wrapper },
    );
    await waitFor(() => expect(result.current).not.toBeNull());
    await act(async () => result.current.data.clearCategory('gallery'));
    await waitFor(() => expect(onReset).toHaveBeenCalledTimes(1));
    await act(async () => result.current.data.clearCategory('gallery'));
    await waitFor(() => expect(onReset).toHaveBeenCalledTimes(2));
  });

  it('always calls the latest onReset reference (ref stability)', async () => {
    let callCount = 0;
    const { result, rerender } = await renderHook(
      ({ count }: { count: number }) => ({
        data: useDataReset(),
        _: useClearOnReset('weight', () => { callCount = count; }),
      }),
      { wrapper, initialProps: { count: 1 } },
    );
    await waitFor(() => expect(result.current).not.toBeNull());
    await rerender({ count: 42 });
    await act(async () => result.current.data.clearCategory('weight'));
    await waitFor(() => expect(callCount).toBe(42));
  });
});
