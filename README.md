# UteDesk v2

A phone-first PWA a trade crew uses on site to size a job, check the takeoff, price an estimate and confirm a quote. One shell, four trades: Painter, Plumber, Roofer, Builder.

No backend, no accounts, no network calls at runtime. Everything is stored on the device.

## Run it

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

`npm run build` type-checks and writes a static site to `dist/`. Serve `dist/` over HTTPS for install and offline use. Hosting is not configured.

## Layout

```
src/core/     job model, money, storage, migrations, quote numbering, regeneration, geometry, speech parsing
src/ui/       screens and shared components; forms render from each trade's field schema
src/trades/   painter/ plumber/ roofer/ builder/ + registry.ts
src/config.ts enabledTrades
```

`core/` and `ui/` never branch on a trade id. To add a trade, add a folder under `src/trades/` that exports a `Trade`, add one line to `registry.ts`, and add its id to `enabledTrades`.

Decisions not covered by the build brief are in `ASSUMPTIONS.md`.
