import { gstNumberMissing } from '../../core/quote';
import { nav, useApp } from '../app';
import { Screen } from '../components';

export const homeLinks: { label: string; hint: string; to: string; primary?: boolean }[] = [
  { label: 'New job', hint: 'Size it, check it, price it', to: '/new', primary: true },
  { label: 'List jobs', hint: 'Open a job on this device', to: '/jobs' },
  { label: 'Settings', hint: 'Business details, GST, rates', to: '/settings' },
];

export function Home() {
  const { settings } = useApp();
  return (
    <Screen title={settings.businessName || 'Quotes for the trades'}>
      {gstNumberMissing(settings) && (
        <p class="notice warn">
          GST is being charged but there is no GST number. <a href="#/settings">Add it in Settings.</a>
        </p>
      )}
      <nav class="menu">
        {homeLinks.map((l) => (
          <button key={l.to} class={`menu-item${l.primary ? ' primary' : ''}`} onClick={() => nav(l.to)}>
            <strong>{l.label}</strong>
            <span>{l.hint}</span>
          </button>
        ))}
      </nav>
      <p class="foot">Everything stays on this device. The app never sends anything. You send the quote.</p>
    </Screen>
  );
}
