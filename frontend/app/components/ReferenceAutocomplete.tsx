'use client';

import { ReactNode, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { ReferenceOption } from '@/lib/types';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: ReactNode;
}

export default function ReferenceAutocomplete({ label, value, onChange, placeholder, icon }: Props) {
  const [options, setOptions] = useState<ReferenceOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!value.trim()) {
        setOptions([]);
        return;
      }
      try {
        const data = await apiFetch<ReferenceOption[]>(`/references/?search=${encodeURIComponent(value)}`);
        setOptions(data);
      } catch {
        setOptions([]);
      }
    }, 250);

    return () => clearTimeout(delay);
  }, [value]);

  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">{label}</label>
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
            {icon}
          </div>
        )}
        <input
          className={`w-full rounded-xl border border-neutral-300 bg-white/80 py-3 pr-3.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-black/10 dark:border-neutral-700 dark:bg-neutral-950/80 dark:text-white dark:focus:border-white dark:focus:ring-white/15 ${icon ? 'pl-10' : 'pl-3.5'}`}
          value={value}
          placeholder={placeholder || 'Search or type reference'}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {open && options.length > 0 && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-10 max-h-[220px] overflow-auto rounded-xl border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            {options.map((option) => (
              <div
                key={option.id}
                className="cursor-pointer border-b border-neutral-300 px-3 py-2.5 text-sm last:border-b-0 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-700/40"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.value}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-300">
        If no match is found, the typed value will be created automatically.
      </div>
    </div>
  );
}
