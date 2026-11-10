import { useRef, useState } from 'preact/hooks';
import { isVisible } from '../../core/fields';
import { parseSpoken } from '../../core/speech';
import type { FieldValue } from '../../core/types';
import type { SizerProps } from '../slots';

interface Recogniser {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecogniserCtor = new () => Recogniser;

function recogniser(): RecogniserCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecogniserCtor; webkitSpeechRecognition?: RecogniserCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function Talk({ kind, area, onChange }: SizerProps) {
  const Ctor = recogniser();
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const [problem, setProblem] = useState('');
  const rec = useRef<Recogniser | null>(null);
  if (!Ctor) return null; // No speech on this device: Type is always there.

  const listen = () => {
    setProblem('');
    setHeard(null);
    const r = new Ctor();
    r.lang = 'en-NZ';
    r.interimResults = false;
    r.continuous = false;
    let text = '';
    r.onresult = (e) => {
      text = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? '')
        .join(' ');
    };
    r.onerror = (e) =>
      setProblem(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'The microphone is blocked for this app. Type the numbers below.'
          : e.error === 'network'
            ? 'Talk needs a connection on this device and there is none. Type the numbers below.'
            : 'Nothing was heard. Try again, or type the numbers below.',
      );
    r.onend = () => {
      setListening(false);
      if (text.trim()) setHeard(text.trim());
    };
    rec.current = r;
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
      setProblem('Talk would not start. Type the numbers below.');
    }
  };

  const values: Record<string, FieldValue> = heard ? parseSpoken(heard, kind).values : {};
  const got = kind.fields.filter((f) => f.key in values);
  const merged = { ...area.fields, ...values };
  const missed = kind.fields.filter(
    (f) => f.type === 'number' && f.default === undefined && isVisible(f, merged) && !(typeof merged[f.key] === 'number'),
  );
  const show = (v: FieldValue | undefined, unit?: string) => (v === true ? 'yes' : `${String(v)}${unit ? ` ${unit}` : ''}`);

  return (
    <section class="card">
      <div class="card-head">
        <h2>Talk</h2>
        {listening ? (
          <button class="btn small" onClick={() => rec.current?.stop()}>
            Stop
          </button>
        ) : (
          <button class="btn small" onClick={listen}>
            {heard ? 'Say it again' : 'Say the sizes'}
          </button>
        )}
      </div>
      {!heard && !listening && !problem && <p class="help">For example: "4 by 3.6 by 2.4, one door". Nothing is saved until you confirm what was heard.</p>}
      <p role="status" class="help">
        {listening ? 'Listening…' : problem}
      </p>
      {heard && (
        <>
          <p class="heard">Heard: "{heard}"</p>
          {got.length > 0 ? (
            <dl class="pairs">
              {got.map((f) => (
                <div key={f.key}>
                  <dt>{f.label}</dt>
                  <dd>{show(values[f.key], f.unit)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p class="notice warn">No numbers were picked up from that. Type them below.</p>
          )}
          {got.length > 0 && missed.length > 0 && <p class="notice warn">Not heard: {missed.map((f) => f.label).join(', ')}. Type {missed.length === 1 ? 'it' : 'them'} below.</p>}
          <div class="actions">
            <button class="btn" onClick={() => setHeard(null)}>
              Discard
            </button>
            {got.length > 0 && (
              <button
                class="btn primary"
                onClick={() => {
                  onChange({ ...area, fields: merged });
                  setHeard(null);
                }}
              >
                Use these numbers
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
