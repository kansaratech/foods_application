'use client';

import { useEffect, useRef } from 'react';

/**
 * Registers the PWA service worker (public/sw.js) in production only.
 * Navigations are network-first, so a new deploy is always picked up.
 */
export default function PwaRegister() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;
    done.current = true;

    const register = () =>
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}
