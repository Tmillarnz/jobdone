import { createContext, type ComponentChildren } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import { defaultSettings, withTradeDefaults } from '../core/settings';
import { openStorage, type Storage } from '../core/storage';
import type { Settings, Trade } from '../core/types';
import { routes } from './routes';

export interface AppCtx {
  db: Storage;
  settings: Settings;
  saveSettings(next: Settings): Promise<void>;
  /** Trades offered for new jobs. */
  trades: Trade[];
  /** Any registered trade, so an old job still opens if its trade is later switched off. */
  tradeOf(id: string): Trade | undefined;
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('App context missing');
  return c;
}

export function nav(path: string, replace = false): void {
  if (replace) location.replace(`#${path}`);
  else location.hash = path;
}

function useHashPath(): string {
  const read = () => location.hash.replace(/^#/, '') || '/';
  const [path, setPath] = useState(read);
  useEffect(() => {
    const on = () => {
      setPath(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}

export function App({ registry, enabled }: { registry: Trade[]; enabled: Trade[] }) {
  const [db, setDb] = useState<Storage | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState('');
  const path = useHashPath();

  useEffect(() => {
    (async () => {
      const store = await openStorage();
      const saved = await store.getSettings();
      // Seed rate sets for every registered trade so old jobs keep their prices.
      const s = withTradeDefaults(saved ?? defaultSettings(registry), registry);
      if (!saved) await store.saveSettings(s);
      setDb(store);
      setSettings(s);
    })().catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) {
    return (
      <Shell>
        <p class="notice warn">This device would not open the app's storage, so nothing can be saved. {error}</p>
      </Shell>
    );
  }
  if (!db || !settings) return <Shell>{null}</Shell>;

  const ctx: AppCtx = {
    db,
    settings,
    async saveSettings(next) {
      const fixed = withTradeDefaults(next, registry);
      setSettings(fixed);
      await db.saveSettings(fixed);
    },
    trades: enabled,
    tradeOf: (id) => registry.find((t) => t.id === id),
  };

  const parts = path.split('/').filter(Boolean);
  let screen: ComponentChildren = null;
  for (const r of routes) {
    const params = match(r.pattern, parts);
    if (params) {
      screen = r.render(params);
      break;
    }
  }
  return <Ctx.Provider value={ctx}>{screen ?? routes[0]!.render({})}</Ctx.Provider>;
}

function match(pattern: string, parts: string[]): Record<string, string> | null {
  const want = pattern.split('/').filter(Boolean);
  if (want.length !== parts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < want.length; i++) {
    const w = want[i]!;
    if (w.startsWith(':')) params[w.slice(1)] = decodeURIComponent(parts[i]!);
    else if (w !== parts[i]) return null;
  }
  return params;
}

function Shell({ children }: { children: ComponentChildren }) {
  return <main class="screen">{children}</main>;
}
