'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const applyTheme = (theme: 'light' | 'dark') => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as 'light' | 'dark' | null) || 'light';
    setTheme(saved);
    applyTheme(saved);
  }, []);

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    applyTheme(next);
  };

  return (
    <button
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white/70 px-3.5 py-3 text-sm font-semibold text-neutral-900 transition hover:-translate-y-0.5 sm:w-auto dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-white"
      type="button"
      onClick={toggle}
    >
      <span className="inline-flex items-center justify-center gap-2">
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        {theme === 'light' ? 'Mono Dark' : 'Mono Light'}
      </span>
    </button>
  );
}
