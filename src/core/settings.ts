import type { RateSet, Settings, Trade } from './types';

export const DEFAULT_TERMS =
  'This quote is valid for 30 days from the date above. Work outside the listed items is a variation and is priced before it starts.';

/** Rate set ids are namespaced by trade so two trades can both ship "value". */
export function seededRateSets(trade: Trade): RateSet[] {
  return trade.defaultRateSets.map((rs) => ({
    id: `${trade.id}:${rs.id}`,
    tradeId: trade.id,
    name: rs.name,
    rates: { ...rs.rates },
  }));
}

export function defaultSettings(trades: Trade[]): Settings {
  return withTradeDefaults(
    {
      businessName: '',
      phone: '',
      email: '',
      address: '',
      gstNumber: '',
      chargeGst: true,
      defaultTerms: DEFAULT_TERMS,
      rateSets: [],
      defaultRateSetId: {},
    },
    trades,
  );
}

/**
 * Make sure every trade has at least one rate set and a default. Runs on load,
 * so a trade added in a later release gets its rate sets without a migration.
 */
export function withTradeDefaults(settings: Settings, trades: Trade[]): Settings {
  const rateSets = [...settings.rateSets];
  const defaultRateSetId = { ...settings.defaultRateSetId };
  for (const trade of trades) {
    let own = rateSets.filter((r) => r.tradeId === trade.id);
    if (own.length === 0) {
      own = seededRateSets(trade);
      rateSets.push(...own);
    }
    const current = defaultRateSetId[trade.id];
    if (own.length > 0 && !own.some((r) => r.id === current)) {
      defaultRateSetId[trade.id] = own[0]!.id;
    }
  }
  return { ...settings, rateSets, defaultRateSetId };
}
