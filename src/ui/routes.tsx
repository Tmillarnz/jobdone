import type { ComponentChildren } from 'preact';
import { AreaEditor } from './screens/AreaEditor';
import { Check } from './screens/Check';
import { Estimate } from './screens/Estimate';
import { HowTo } from './screens/HowTo';
import { Home } from './screens/Home';
import { JobScreen } from './screens/JobScreen';
import { Jobs } from './screens/Jobs';
import { NewJob } from './screens/NewJob';
import { QuoteScreen } from './screens/Quote';
import { Quotes } from './screens/Quotes';
import { SettingsScreen } from './screens/Settings';

type P = Record<string, string>;
export const routes: { pattern: string; render(p: P): ComponentChildren }[] = [
  { pattern: '/', render: () => <Home /> },
  { pattern: '/new', render: () => <NewJob /> },
  { pattern: '/jobs', render: () => <Jobs /> },
  { pattern: '/job/:id', render: (p) => <JobScreen key={p.id} id={p.id!} /> },
  { pattern: '/job/:id/area/:areaId', render: (p) => <AreaEditor key={p.areaId} id={p.id!} areaId={p.areaId!} /> },
  { pattern: '/job/:id/check', render: (p) => <Check key={p.id} id={p.id!} /> },
  { pattern: '/job/:id/estimate', render: (p) => <Estimate key={p.id} id={p.id!} /> },
  { pattern: '/quotes', render: () => <Quotes /> },
  { pattern: '/quote/:id', render: (p) => <QuoteScreen key={p.id} id={p.id!} /> },
  { pattern: '/howto', render: () => <HowTo /> },
  { pattern: '/settings', render: () => <SettingsScreen /> },
];
