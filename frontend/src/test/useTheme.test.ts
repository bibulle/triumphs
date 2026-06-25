import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '../hooks/useTheme';

const themeStore: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((k: string) => themeStore[k] ?? null),
  setItem: vi.fn((k: string, v: string) => { themeStore[k] = v }),
  removeItem: vi.fn((k: string) => { delete themeStore[k] }),
  clear: vi.fn(() => { Object.keys(themeStore).forEach(k => delete themeStore[k]) }),
};

beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageMock);
  localStorageMock.clear();
  vi.clearAllMocks();
  document.documentElement.removeAttribute('data-theme');
});

describe('useTheme', () => {
  it('defaults to dark theme', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('reads saved theme from localStorage', () => {
    localStorage.setItem('motTheme', 'light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
  });

  it('toggle switches from dark to light', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggle switches from light to dark', () => {
    localStorage.setItem('motTheme', 'light');
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('persists theme in localStorage after toggle', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(localStorage.getItem('motTheme')).toBe('light');
  });
});
