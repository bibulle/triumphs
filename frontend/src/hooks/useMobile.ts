import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 760;

export function useMobile(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mql.addEventListener('change', handler);
    setMobile(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return mobile;
}
