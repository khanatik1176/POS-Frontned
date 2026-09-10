import { LucideIcon } from 'lucide-react';

export type RankedItem = {
  key: string;
  label: string;
  value: number;
  icon?: LucideIcon;
};

interface Props {
  items: RankedItem[];
  emptyLabel?: string;
}

export default function RankedBarList({ items, emptyLabel = 'No data yet.' }: Props) {
  if (items.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">{emptyLabel}</p>;
  }

  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="grid gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.key} className="flex items-center gap-3">
            {Icon && (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                <Icon size={13} />
              </span>
            )}
            <span className="w-24 shrink-0 truncate text-xs text-neutral-600 dark:text-neutral-300">{item.label}</span>
            <div className="h-2.5 flex-1 rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                title={`${item.label}: ${item.value}`}
                className="h-full rounded-full bg-neutral-900 dark:bg-white"
                style={{ width: `${Math.max((item.value / max) * 100, 3)}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs font-medium text-neutral-800 dark:text-neutral-100">{item.value}</span>
          </div>
        );
      })}
    </div>
  );
}
