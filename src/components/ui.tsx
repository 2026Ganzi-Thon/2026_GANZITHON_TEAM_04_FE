import { useEffect, useState, type ReactNode } from 'react';
import type { Weight } from '../api/types';
import { copy } from '../content/copy';

export function PrimaryButton(props: { children: ReactNode; onClick?: () => void; disabled?: boolean; busy?: boolean }) {
  return (
    <button type="button" className="primary" onClick={props.onClick} disabled={props.disabled || props.busy} aria-busy={props.busy}>
      {props.busy ? copy.common.loading : props.children}
    </button>
  );
}

/** 단일 선택 그룹. role=radiogroup으로 읽힌다 */
export function ChoiceGroup<T extends string>(props: {
  label: string;
  options: { value: T; label: string }[];
  value?: T;
  onChange: (v: T) => void;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div role="radiogroup" aria-label={props.label} className={props.className}>
      {props.options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={props.value === o.value}
          className={props.itemClassName ?? 'choice'}
          onClick={() => props.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function WeightScale({ value, onChange }: { value?: Weight; onChange: (w: Weight) => void }) {
  return (
    <div>
      <div role="radiogroup" aria-label={copy.situation.weightLabel} className="weight">
        {([1, 2, 3, 4, 5] as Weight[]).map((w) => (
          <button key={w} type="button" role="radio" aria-checked={value === w} onClick={() => onChange(w)}>
            {w}
          </button>
        ))}
      </div>
      <div className="weight-ends" aria-hidden>
        <span>{copy.situation.light}</span>
        <span>{copy.situation.heavy}</span>
      </div>
    </div>
  );
}

export function Modal(props: { title: string; body?: string; actions: { label: string; onClick: () => void; kind?: 'primary' | 'secondary' }[] }) {
  return (
    <div className="scrim" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label={props.title}>
        <h2>{props.title}</h2>
        {props.body && <p>{props.body}</p>}
        <div className="actions">
          {props.actions.map((a) => (
            <button key={a.label} type="button" className={a.kind === 'secondary' ? 'secondary' : 'primary'} onClick={a.onClick}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}

export function Spinner({ label = copy.common.loading }: { label?: string }) {
  return (
    <div role="status" aria-live="polite">
      <div className="spinner" />
      <p className="sub">{label}</p>
    </div>
  );
}

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  return { message, show: setMessage, clear: () => setMessage(null) };
}

export const BackIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
    <path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
