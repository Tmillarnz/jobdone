import type { AreaKind, FieldValue } from './types';

const UNITS: Record<string, number> = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const UNIT_WORDS = new Set(['m', 'metre', 'meter', 'square', 'squared', 'lineal']);
const FILLER = new Set(['is', 'of', 'are', 'equal', 'at', 'about', 'the', 'a', 'and', 'to']);

type Tok = { num: number; used: boolean } | { word: string; used: boolean };
const isNum = (t: Tok | undefined): t is { num: number; used: boolean } => t !== undefined && 'num' in t;

/** Strip a plural "s" so "doors" matches "door". Applied to both sides of every comparison. */
const stem = (w: string) => (w.length > 2 && w.endsWith('s') ? w.slice(0, -1) : w);

/**
 * `countWords` are the words that follow a count ("door" in "one door"), so that
 * "two point four one door" reads as 2.4 and 1 door, not 2.41.
 */
function tokenise(text: string, countWords: Set<string>): Tok[] {
  const raw = text
    .toLowerCase()
    .replace(/(\d)\s*[x×]\s*(?=\d)/g, '$1 by ')
    .replace(/(\d)(m|metres?|meters?)\b/g, '$1 ')
    .replace(/,/g, ' , ')
    .replace(/[^a-z0-9.,\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^\.+|\.+$/g, ''))
    .filter(Boolean);

  const out: Tok[] = [];
  let i = 0;
  while (i < raw.length) {
    const w = raw[i]!;
    let value: number | undefined;
    if (/^\d+(\.\d+)?$/.test(w)) {
      value = Number(w);
      i += 1;
    } else if (w in TENS) {
      value = TENS[w]!;
      i += 1;
      const next = raw[i];
      if (next !== undefined && next in UNITS && UNITS[next]! > 0 && UNITS[next]! < 10) {
        value += UNITS[next]!;
        i += 1;
      }
    } else if (w in UNITS && !(w === 'oh')) {
      value = UNITS[w]!;
      i += 1;
    }
    if (value === undefined) {
      if (w === ',') {
        // A pause only matters for ending a run of decimal digits.
      } else if (w === 'x' || w === 'times') out.push({ word: 'by', used: false });
      else if (!UNIT_WORDS.has(stem(w))) out.push({ word: stem(w), used: false });
      i += 1;
      continue;
    }
    // "two point four", "3 point 65"
    if (raw[i] === 'point') {
      let digits = '';
      let j = i + 1;
      while (j < raw.length && (/^\d+$/.test(raw[j]!) || (raw[j]! in UNITS && UNITS[raw[j]!]! < 10))) {
        const after = raw[j + 1];
        if (digits && after !== undefined && countWords.has(stem(after))) break;
        digits += /^\d+$/.test(raw[j]!) ? raw[j]! : String(UNITS[raw[j]!]!);
        j += 1;
      }
      if (digits) {
        value = Number(`${value}.${digits}`);
        i = j;
      }
    } else if (raw[i] === 'and' && raw[i + 1] === 'a' && raw[i + 2] === 'half') {
      value += 0.5;
      i += 3;
    }
    out.push({ num: value, used: false });
  }
  return out;
}

export interface Spoken {
  /** Field values that were heard. Nothing is guessed. */
  values: Record<string, FieldValue>;
}

/**
 * Pull field values out of a spoken sentence using only the kind's schema:
 * field labels, their `say` words and the "4 by 3.6 by 2.4" order.
 */
export function parseSpoken(text: string, kind: AreaKind): Spoken {
  const countWords = new Set(
    kind.fields
      .filter((f) => f.type === 'integer')
      .flatMap((f) => [f.label, ...(f.say ?? [])])
      .map((a) => stem(a.toLowerCase().split(/\s+/)[0] ?? '')),
  );
  const toks = tokenise(text, countWords);
  const values: Record<string, FieldValue> = {};

  const dims = kind.spokenDims ?? [];
  for (let i = 0; i < toks.length && dims.length > 0; i++) {
    const run: number[] = [];
    let j = i;
    while (isNum(toks[j])) {
      run.push(j);
      const by = toks[j + 1];
      if (by && 'word' in by && by.word === 'by' && isNum(toks[j + 2])) j += 2;
      else break;
    }
    if (run.length >= 2) {
      run.slice(0, dims.length).forEach((idx, n) => {
        const t = toks[idx]!;
        if (isNum(t)) {
          values[dims[n]!] = t.num;
          t.used = true;
        }
      });
      break;
    }
  }

  const aliases = kind.fields
    .filter((f) => f.type === 'number' || f.type === 'integer' || f.type === 'boolean')
    .flatMap((f) => [
      { field: f, words: f.label.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).map(stem), spoken: false },
      ...(f.say ?? []).map((s) => ({ field: f, words: s.toLowerCase().split(/\s+/).map(stem), spoken: true })),
    ])
    .sort((a, b) => b.words.length - a.words.length);

  for (const a of aliases) {
    for (let i = 0; i + a.words.length <= toks.length; i++) {
      const hit = a.words.every((w, n) => {
        const t = toks[i + n]!;
        return 'word' in t && !t.used && t.word === w;
      });
      if (!hit) continue;
      for (let n = 0; n < a.words.length; n++) toks[i + n]!.used = true;
      if (a.field.key in values) continue;
      if (a.field.type === 'boolean') {
        values[a.field.key] = true;
        continue;
      }
      let after = i + a.words.length;
      while (toks[after] && 'word' in toks[after]! && FILLER.has((toks[after] as { word: string }).word)) after += 1;
      const next = toks[after];
      const prev = toks[i - 1];
      const free = (t: Tok | undefined): t is { num: number; used: boolean } => isNum(t) && !t.used;
      // "two doors" and "4 long" put the number first; "height 2.4" puts it after.
      const beforeFirst = a.field.type === 'integer' || a.spoken;
      const pick = beforeFirst ? (free(prev) ? prev : free(next) ? next : undefined) : free(next) ? next : free(prev) ? prev : undefined;
      if (!pick) continue;
      pick.used = true;
      values[a.field.key] = a.field.type === 'integer' ? Math.round(pick.num) : pick.num;
    }
  }
  return { values };
}
