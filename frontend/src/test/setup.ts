import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Provide a working localStorage stub for all tests (happy-dom doesn't implement it).
// Tests that need French UI strings rely on this defaulting to 'fr'.
const _store: Record<string, string> = {};
const localStorageStub = {
  getItem: (k: string) => _store[k] ?? null,
  setItem: (k: string, v: string) => { _store[k] = v },
  removeItem: (k: string) => { delete _store[k] },
  clear: () => { Object.keys(_store).forEach(k => delete _store[k]) },
};
vi.stubGlobal('localStorage', localStorageStub);

beforeEach(() => {
  localStorageStub.clear();
  localStorageStub.setItem('triumph-locale', 'fr');
});
