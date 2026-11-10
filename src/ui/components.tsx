import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { centsToInput, parseMoney } from '../core/money';
import { touch } from '../core/job';
import type { Job } from '../core/types';
import { nav, useApp } from './app';

export function Screen(props: { title: string; back?: string; sub?: string; children: ComponentChildren }) {
  return (
    <>
      <header class="bar no-print">
        {props.back !== undefined ? (
          <button class="back" onClick={() => nav(props.back!)} aria-label="Back">
            ‹ Back
          </button>
        ) : (
          <span class="brand">UteDesk</span>
        )}
        <div class="bar-title">
          <h1>{props.title}</h1>
          {props.sub && <p>{props.sub}</p>}
        </div>
      </header>
      <main class="screen">{props.children}</main>
    </>
  );
}

function parseNumber(text: string): number | undefined {
  const t = text.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Text input with the decimal keypad. Keeps what was typed; reports a number or undefined. */
export function NumberInput(props: {
  value: number | undefined;
  onChange(v: number | undefined): void;
  id?: string;
  label?: string;
  placeholder?: string;
  class?: string;
}) {
  const show = (v: number | undefined) => (v === undefined ? '' : String(v));
  const [text, setText] = useState(show(props.value));
  useEffect(() => {
    if (parseNumber(text) !== props.value) setText(show(props.value));
  }, [props.value]);
  const bad = text.trim() !== '' && parseNumber(text) === undefined;
  return (
    <input
      id={props.id}
      class={`${props.class ?? ''}${bad ? ' bad' : ''}`}
      type="text"
      inputMode="decimal"
      autocomplete="off"
      aria-label={props.label}
      aria-invalid={bad}
      placeholder={props.placeholder}
      value={text}
      onInput={(e) => {
        const t = e.currentTarget.value;
        setText(t);
        props.onChange(parseNumber(t));
      }}
    />
  );
}

/** Dollars in, cents out. Empty or zero shows the placeholder. */
export function MoneyInput(props: { cents: number; onChange(cents: number): void; label?: string; placeholder?: string; id?: string }) {
  const show = (c: number) => (c > 0 ? centsToInput(c) : '');
  const [text, setText] = useState(show(props.cents));
  useEffect(() => {
    if ((parseMoney(text) ?? 0) !== props.cents) setText(show(props.cents));
  }, [props.cents]);
  return (
    <span class="money-input">
      <span aria-hidden="true">$</span>
      <input
        id={props.id}
        type="text"
        inputMode="decimal"
        autocomplete="off"
        aria-label={props.label}
        placeholder={props.placeholder ?? '0.00'}
        value={text}
        onInput={(e) => {
          const t = e.currentTarget.value;
          setText(t);
          const c = parseMoney(t);
          props.onChange(c !== null && c > 0 ? c : 0);
        }}
        onBlur={() => setText(show(props.cents))}
      />
    </span>
  );
}

export function Labelled(props: { label: string; for?: string; help?: string; children: ComponentChildren }) {
  return (
    <div class="field">
      <label for={props.for}>{props.label}</label>
      {props.children}
      {props.help && <p class="help">{props.help}</p>}
    </div>
  );
}

/** Load a job and get a saver. `save` stamps updatedAt and writes to the device. */
export function useJob(id: string): { job: Job | null | undefined; save(next: Job): Promise<void> } {
  const { db } = useApp();
  const [job, setJob] = useState<Job | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    db.getJob(id).then(
      (j) => live && setJob(j ?? null),
      () => live && setJob(null),
    );
    return () => {
      live = false;
    };
  }, [id]);
  return {
    job,
    async save(next) {
      const stamped = touch(next);
      setJob(stamped);
      await db.saveJob(stamped);
    },
  };
}

export function Missing({ what }: { what: string }) {
  return (
    <Screen title="Not found" back="/">
      <p class="notice">That {what} is not on this device.</p>
    </Screen>
  );
}
