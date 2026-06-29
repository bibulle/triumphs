import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMobile } from '../hooks/useMobile';

describe('useMobile', () => {
  let listeners: Array<(e: MediaQueryListEvent) => void>;
  let currentMatches: boolean;

  beforeEach(() => {
    listeners = [];
    currentMatches = false;
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: currentMatches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_: string, cb: unknown) => {
        listeners.push(cb as (e: MediaQueryListEvent) => void);
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList);
  });

  it('returns false when viewport is wider than 760px', () => {
    currentMatches = false;
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(false);
  });

  it('returns true when viewport is 760px or less', () => {
    currentMatches = true;
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(true);
  });

  it('updates when media query changes', () => {
    currentMatches = false;
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(false);

    act(() => {
      listeners.forEach(cb => cb({ matches: true } as MediaQueryListEvent));
    });
    expect(result.current).toBe(true);
  });
});
