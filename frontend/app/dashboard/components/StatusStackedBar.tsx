export type StatusSegment = {
  key: string;
  label: string;
  value: number;
  colorClass: string;
};

interface Props {
  segments: StatusSegment[];
  total: number;
}

export default function StatusStackedBar({ segments, total }: Props) {
  const visible = segments.filter((s) => s.value > 0);

  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        {total === 0 ? (
          <div className="h-full w-full" />
        ) : (
          visible.map((segment) => (
            <div
              key={segment.key}
              title={`${segment.label}: ${segment.value} (${Math.round((segment.value / total) * 100)}%)`}
              className={segment.colorClass}
              style={{ width: `${(segment.value / total) * 100}%` }}
            />
          ))
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((segment) => (
          <div key={segment.key} className="flex items-center gap-1.5 text-xs">
            <span className={`h-2 w-2 shrink-0 rounded-full ${segment.colorClass}`} />
            <span className="text-neutral-500 dark:text-neutral-400">{segment.label}</span>
            <span className="font-medium text-neutral-800 dark:text-neutral-100">{segment.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
