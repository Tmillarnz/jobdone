import { render } from 'preact';
import { enabledTrades } from './config';
import { registry } from './trades/registry';
import { App } from './ui/app';
import { installSizing } from './ui/sizing';
import './ui/style.css';

const enabled = enabledTrades
  .map((id) => registry.find((t) => t.id === id))
  .filter((t) => t !== undefined);

installSizing();

render(<App registry={registry} enabled={enabled} />, document.getElementById('app')!);
