# Assumptions

Decisions not covered by the build brief. Brief section 10 (items 1 to 7) was confirmed by Tim on 2026-11-10.

## Confirmed by Tim

- v2 lives in a new repo, `jobdone`, on branch `v2`. v1 is the `utedesk` repo and is read-only reference.
- Only the painter default rates are taken from v1. Default terms wording and the print layout are written fresh.

## Dependencies added beyond the brief's stack

- `fake-indexeddb` (dev only): Node has no IndexedDB, so the storage, migration and quote numbering tests need one. It is not in the shipped bundle.
- No Preact Vite preset. JSX is compiled by the bundler's automatic runtime, set in `tsconfig.json`.

## Phase 1: core

- `Line.orphaned?: boolean` is added to the brief's model. It is the flag for an edited takeoff line whose key the takeoff no longer produces.
- `Quote.siteName` is added. The snapshot carries the site name so a confirmed quote still reads correctly if the job is renamed or deleted.
- `Quote.gstNumber` is stored empty when GST is not charged, since the number prints only when GST is charged.
- `Trade.rateKeys` is added to the brief's interface (key, label, unit for each rate). The rate set editor needs it to list rates without branching on a trade.
- `TakeoffLine` is `{ key, label, qty, unit, rateKey, areaId? }`. A line is priced from its area's rate set if the area has one, otherwise the job's.
- Shipped rate set ids are namespaced `tradeId:id` when seeded into Settings.
- Amounts are computed on quantities taken to 3 decimals (matters only for hours, which are "as entered").
- Rounding is half away from zero, with a guard for binary float error (1.15 rounds to 1.2).
- The quote number uses the device's local calendar day. Past 999 quotes in a day the suffix grows to four digits rather than wrapping.
- After regeneration, lines are ordered: takeoff order (edited lines keep their place), then flagged edited lines, then manual lines.
- Job records are migrated when read. A record saved by a newer app version is refused, not guessed at.
- Photos are stored as blobs in their own IndexedDB store; the job holds `PhotoRef { id, name, addedAt }`.
- Default terms (fresh wording, edit in Settings): "This quote is valid for 30 days from the date above. Work outside the listed items is a variation and is priced before it starts."
- The quote number prefix stays `UD-` as the brief specifies, although the repo is now `jobdone`.

## Open, needs Tim

- Painter "Premium" rates. v1 has per-unit rates for one coating only (walls $18/m², ceiling $16/m², trim $8/lm, door $85, wallpaper strip $12/m², hang $18/m²). Its Premium differs only by paint price per litre (×1.25), which does not convert to a per-m² charge-out rate. v1 has no per-item window frame rate either.
