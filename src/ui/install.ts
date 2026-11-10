import { useEffect, useState } from 'preact/hooks';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let pending: InstallEvent | null = null;
const listeners = new Set<() => void>();

// Chrome and Edge fire this when the app can be installed. Hold it for a button.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  pending = e as InstallEvent;
  listeners.forEach((l) => l());
});
window.addEventListener('appinstalled', () => {
  pending = null;
  listeners.forEach((l) => l());
});

export function isInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** `install` is set when the browser will show its own Add to Home Screen prompt. */
export function useInstall(): { install: (() => Promise<void>) | null; installed: boolean } {
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return {
    installed: isInstalled(),
    install: pending
      ? async () => {
          const e = pending!;
          pending = null;
          await e.prompt();
          await e.userChoice;
          listeners.forEach((l) => l());
        }
      : null,
  };
}
