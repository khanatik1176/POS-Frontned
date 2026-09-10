'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGE_SIZE_OPTIONS } from '@/lib/usePagination';

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange, totalItems, pageSize, onPageSizeChange }: Props) {
  const from = totalItems !== undefined && pageSize ? (totalItems === 0 ? 0 : (page - 1) * pageSize + 1) : null;
  const to = totalItems !== undefined && pageSize ? Math.min(page * pageSize, totalItems) : null;

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1,
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200/60 px-1 pt-3 dark:border-neutral-800/60">
      <div className="flex items-center gap-3">
        {from !== null && to !== null && totalItems !== undefined && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Showing {from}–{to} of {totalItems}
          </p>
        )}
        {onPageSizeChange && pageSize !== undefined && (
          <label className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            Rows:
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-neutral-300 bg-white/80 px-1.5 py-1 text-xs text-neutral-700 outline-none dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-neutral-200"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {totalPages > 1 && (
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            aria-label="Previous page"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <ChevronLeft size={14} />
          </button>

          {pageNumbers.map((n, idx) => {
            const prev = pageNumbers[idx - 1];
            const showEllipsis = prev !== undefined && n - prev > 1;
            return (
              <span key={n} className="flex items-center gap-1">
                {showEllipsis && <span className="px-1 text-xs text-neutral-400">…</span>}
                <button
                  type="button"
                  onClick={() => onPageChange(n)}
                  className={`h-7 min-w-7 rounded-lg px-2 text-xs font-medium transition ${
                    n === page
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                      : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                  }`}
                >
                  {n}
                </button>
              </span>
            );
          })}

          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            aria-label="Next page"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
