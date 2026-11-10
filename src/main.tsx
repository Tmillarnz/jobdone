import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { enabledTrades } from './config';
import { registry } from './trades/registry';
import { App } from './ui/app';
import { installSizing } from './ui/sizing';
import './ui/install';
import './ui/style.css';

const enabled = enabledTrades
  .map((id) => registry.find((t) => t.id === id))
  .filter((t) => t !== undefined);

installSizing();
registerSW({ immediate: true });

render(<App registry={registry} enabled={enabled} />, document.getElementById('app')!);
