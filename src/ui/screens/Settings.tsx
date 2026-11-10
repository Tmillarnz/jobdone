import { uid } from '../../core/id';
import { unitLabel } from '../../core/money';
import { gstNumberMissing } from '../../core/quote';
import type { RateSet, Settings, Trade } from '../../core/types';
import { useApp } from '../app';
import { Labelled, MoneyInput, Screen } from '../components';

export function SettingsScreen() {
  const { settings, saveSettings, trades } = useApp();
  const set = (patch: Partial<Settings>) => void saveSettings({ ...settings, ...patch });
  const text = (key: 'businessName' | 'phone' | 'email' | 'address' | 'gstNumber', label: string, mode: 'text' | 'tel' | 'email' = 'text', help?: string) => (
    <Labelled label={label} for={`s-${key}`} help={help}>
      <input id={`s-${key}`} type="text" inputMode={mode} autocomplete="off" value={settings[key]} onInput={(e) => set({ [key]: e.currentTarget.value })} />
    </Labelled>
  );

  return (
    <Screen title="Settings" back="/">
      <fieldset class="card">
        <legend>Business</legend>
        {text('businessName', 'Business name')}
        {text('phone', 'Phone', 'tel')}
        {text('email', 'Email', 'email')}
        {text('address', 'Address')}
      </fieldset>

      <fieldset class="card">
        <legend>GST</legend>
        <label class="check">
          <input type="checkbox" checked={settings.chargeGst} onChange={(e) => set({ chargeGst: e.currentTarget.checked })} />
          <span>Charge GST (15%)</span>
        </label>
        {text('gstNumber', 'GST number', 'text', 'Prints on estimates and quotes when GST is charged.')}
        {gstNumberMissing(settings) && <p class="notice warn">GST is on and there is no GST number.</p>}
      </fieldset>

      <fieldset class="card">
        <legend>On the quote</legend>
        <Labelled label="Terms" for="s-terms">
          <textarea id="s-terms" rows={5} value={settings.defaultTerms} onInput={(e) => set({ defaultTerms: e.currentTarget.value })} />
        </Labelled>
        <Labelled label="Bank line" for="s-bank" help="Optional. For example: Pay to 12-3456-7890123-00.">
          <input id="s-bank" type="text" autocomplete="off" value={settings.bankLine ?? ''} onInput={(e) => set({ bankLine: e.currentTarget.value })} />
        </Labelled>
      </fieldset>

      <h2>Rates</h2>
      <p class="lead">Charge-out rates, excluding GST. A rate left empty shows "set rate" on the estimate.</p>
      {trades.map((t) => (
        <TradeRates key={t.id} trade={t} showName={trades.length > 1} />
      ))}
    </Screen>
  );
}

function TradeRates({ trade, showName }: { trade: Trade; showName: boolean }) {
  const { settings, saveSettings } = useApp();
  const sets = settings.rateSets.filter((r) => r.tradeId === trade.id);
  const noun = trade.rateSetNoun.toLowerCase();
  const put = (next: RateSet) => void saveSettings({ ...settings, rateSets: settings.rateSets.map((r) => (r.id === next.id ? next : r)) });
  const add = () =>
    void saveSettings({
      ...settings,
      rateSets: [...settings.rateSets, { id: uid(), tradeId: trade.id, name: `New ${noun}`, rates: {} }],
    });
  const remove = (rs: RateSet) => {
    if (!confirm(`Delete ${rs.name}? Jobs using it will show "set rate" until you pick another ${noun}.`)) return;
    void saveSettings({ ...settings, rateSets: settings.rateSets.filter((r) => r.id !== rs.id) });
  };

  return (
    <section>
      <h3 class="section-head">{showName ? `${trade.name}: ${noun}s` : `${trade.rateSetNoun}s`}</h3>
      {sets.map((rs) => {
        const isDefault = settings.defaultRateSetId[trade.id] === rs.id;
        const missing = trade.rateKeys.filter((k) => !(rs.rates[k.key]! > 0)).length;
        return (
          <details class="card rates" key={rs.id}>
            <summary>
              <strong>{rs.name}</strong>
              <span>
                {isDefault && <span class="tag">Default</span>}
                {missing > 0 && <span class="tag warn">{missing} not set</span>}
              </span>
            </summary>
            <Labelled label="Name" for={`rs-${rs.id}`}>
              <input id={`rs-${rs.id}`} type="text" value={rs.name} onInput={(e) => put({ ...rs, name: e.currentTarget.value })} />
            </Labelled>
            <div class="rate-grid">
              {trade.rateKeys.map((k) => (
                <div class="rate" key={k.key}>
                  <label for={`r-${rs.id}-${k.key}`}>
                    {k.label} <span class="unit">per {unitLabel(k.unit)}</span>
                  </label>
                  <MoneyInput id={`r-${rs.id}-${k.key}`} cents={rs.rates[k.key] ?? 0} placeholder="set rate" onChange={(c) => put({ ...rs, rates: { ...rs.rates, [k.key]: c } })} />
                </div>
              ))}
            </div>
            <div class="actions">
              <button class="btn small" disabled={isDefault} onClick={() => void saveSettings({ ...settings, defaultRateSetId: { ...settings.defaultRateSetId, [trade.id]: rs.id } })}>
                {isDefault ? 'Default for new jobs' : 'Make default'}
              </button>
              {sets.length > 1 && (
                <button class="btn small danger" onClick={() => remove(rs)}>
                  Delete
                </button>
              )}
            </div>
          </details>
        );
      })}
      <button class="btn" onClick={add}>
        Add a {noun}
      </button>
    </section>
  );
}
