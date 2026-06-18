import { useState } from 'react';

export type StrategyPicks = Record<string, string>;

export interface StrategyEntry {
  strategyKey: string;
  weight: number;
}

/** État partagé d'un choix de stratégies pondérées (cases à cocher + poids). */
export function useStrategyPicks() {
  const [picks, setPicks] = useState<StrategyPicks>({});

  function toggle(key: string): void {
    setPicks((current) =>
      key in current
        ? Object.fromEntries(Object.entries(current).filter(([k]) => k !== key))
        : { ...current, [key]: '1' },
    );
  }

  function setWeight(key: string, value: string): void {
    setPicks((current) => ({ ...current, [key]: value }));
  }

  function reset(): void {
    setPicks({});
  }

  /** Convertit les choix en entrées { strategyKey, weight } (poids ≤ 0 → 1). */
  function entries(): StrategyEntry[] {
    return Object.entries(picks).map(([strategyKey, raw]) => {
      const weight = Number(raw);
      return { strategyKey, weight: Number.isFinite(weight) && weight > 0 ? weight : 1 };
    });
  }

  return { picks, toggle, setWeight, reset, entries };
}

export interface StrategyPickerProps {
  strategies: string[];
  picks: StrategyPicks;
  onToggle: (key: string) => void;
  onWeight: (key: string, value: string) => void;
}

/** Liste de stratégies à cocher, chacune avec son poids. */
export function StrategyPicker({ strategies, picks, onToggle, onWeight }: StrategyPickerProps) {
  return (
    <div>
      <p className='mb-1 text-xs font-medium uppercase tracking-wide text-slate-500'>
        Stratégies & poids
      </p>
      <div className='grid grid-cols-1 gap-1 sm:grid-cols-2'>
        {strategies.map((key) => {
          const active = key in picks;
          return (
            <label
              key={key}
              className='flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-sm'
            >
              <input
                type='checkbox'
                checked={active}
                onChange={() => {
                  onToggle(key);
                }}
              />
              <span className='flex-1 text-slate-800'>{key}</span>
              <input
                value={active ? picks[key] : ''}
                onChange={(event) => {
                  onWeight(key, event.target.value);
                }}
                disabled={!active}
                inputMode='decimal'
                placeholder='poids'
                className='w-16 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-500 disabled:bg-slate-50 disabled:text-slate-400'
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
