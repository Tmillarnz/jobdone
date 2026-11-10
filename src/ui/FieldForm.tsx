import { isVisible } from '../core/fields';
import type { AreaKind, FieldDef, FieldValue } from '../core/types';
import { useState } from 'preact/hooks';
import { NumberInput } from './components';

type Fields = Record<string, FieldValue>;

/** Renders a trade's field schema. Knows field types, nothing about any trade. */
export function FieldForm(props: { kind: AreaKind; fields: Fields; onChange(next: Fields): void }) {
  const { kind, fields } = props;
  const set = (key: string, v: FieldValue | undefined) => {
    const next = { ...fields };
    if (v === undefined) delete next[key];
    else next[key] = v;
    props.onChange(next);
  };

  const groups: { name: string; defs: FieldDef[] }[] = [];
  for (const f of kind.fields) {
    if (!isVisible(f, fields)) continue;
    const name = f.group ?? '';
    const g = groups.find((x) => x.name === name);
    if (g) g.defs.push(f);
    else groups.push({ name, defs: [f] });
  }

  return (
    <>
      {groups.map((g) => (
        <fieldset class="card" key={g.name}>
          {g.name && <legend>{g.name}</legend>}
          <div class="field-grid">
            {g.defs.map((f) => (
              <FieldInput key={f.key} def={f} value={fields[f.key]} onChange={(v) => set(f.key, v)} />
            ))}
          </div>
        </fieldset>
      ))}
    </>
  );
}

function FieldInput({ def, value, onChange }: { def: FieldDef; value: FieldValue | undefined; onChange(v: FieldValue | undefined): void }) {
  const id = `f-${def.key}`;
  if (def.type === 'boolean') {
    return (
      <div class="field wide">
        <label class="check">
          <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.currentTarget.checked)} />
          <span>{def.label}</span>
        </label>
        {def.help && <p class="help">{def.help}</p>}
      </div>
    );
  }
  if (def.type === 'select') {
    return (
      <div class="field wide">
        <label for={id}>{def.label}</label>
        <select id={id} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.currentTarget.value)}>
          {(def.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {def.help && <p class="help">{def.help}</p>}
      </div>
    );
  }
  if (def.type === 'numberList') {
    return (
      <div class="field wide">
        <label>
          {def.label}
          {def.unit && <span class="unit"> ({def.unit})</span>}
        </label>
        <NumberList label={def.label} value={typeof value === 'string' ? value : ''} onChange={onChange} />
        {def.help && <p class="help">{def.help}</p>}
      </div>
    );
  }
  const wide = def.type === 'text';
  return (
    <div class={`field${wide ? ' wide' : ''}`}>
      <label for={id}>
        {def.label}
        {def.unit && <span class="unit"> ({def.unit})</span>}
      </label>
      {def.type === 'number' || def.type === 'integer' ? (
        <NumberInput
          id={id}
          value={typeof value === 'number' ? value : undefined}
          onChange={(v) => onChange(v === undefined ? undefined : def.type === 'integer' ? Math.round(v) : v)}
        />
      ) : (
        <input
          id={id}
          type="text"
          autocomplete="off"
          value={typeof value === 'string' ? value : ''}
          onInput={(e) => onChange(e.currentTarget.value)}
        />
      )}
      {def.help && <p class="help">{def.help}</p>}
    </div>
  );
}

/** One decimal-keypad box per number, stored as a space-separated string. */
function NumberList({ label, value, onChange }: { label: string; value: string; onChange(v: string): void }) {
  const parse = (v: string) => v.split(/[\s,;+]+/).filter(Boolean).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  const [items, setItems] = useState<(number | undefined)[]>(() => {
    const got: (number | undefined)[] = parse(value);
    return got.length ? got : [undefined, undefined, undefined, undefined];
  });
  const update = (next: (number | undefined)[]) => {
    setItems(next);
    onChange(next.filter((n) => n !== undefined && n > 0).join(' '));
  };
  return (
    <div class="number-list">
      {items.map((n, i) => (
        <NumberInput key={i} label={`${label} ${i + 1}`} placeholder={String(i + 1)} value={n} onChange={(v) => update(items.map((x, j) => (j === i ? v : x)))} />
      ))}
      <button type="button" class="btn small" onClick={() => update([...items, undefined])}>
        Add
      </button>
      {items.length > 1 && (
        <button type="button" class="btn small" onClick={() => update(items.slice(0, -1))}>
          Remove last
        </button>
      )}
    </div>
  );
}
