export type TrendPoint = {
  label: string;
  value: number;
};

interface Props {
  points: TrendPoint[];
}

export default function TrendBars({ points }: Props) {
  const max = Math.max(...points.map((p) => p.value), 1);
  const peakIndex = points.reduce((best, p, i) => (p.value > points[best].value ? i : best), 0);

  return (
    <div className="flex h-32 items-end gap-2 sm:gap-3">
      {points.map((point, i) => (
        <div key={`${point.label}-${i}`} className="flex flex-1 flex-col items-center gap-1.5">
          <span className={`text-[11px] font-medium ${i === peakIndex && point.value > 0 ? 'text-neutral-800 dark:text-neutral-100' : 'text-transparent'}`}>
            {point.value}
          </span>
          <div className="flex h-full w-full items-end">
            <div
              title={`${point.label}: ${point.value}`}
              className="w-full rounded-t-[4px] bg-neutral-900 dark:bg-white"
              style={{ height: `${Math.max((point.value / max) * 100, point.value > 0 ? 4 : 0)}%` }}
            />
          </div>
          <span className="text-[11px] text-neutral-400">{point.label}</span>
        </div>
      ))}
    </div>
  );
}
