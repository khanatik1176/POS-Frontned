import { useEffect, useMemo, useState } from 'react';

export const PAGE_SIZE_OPTIONS = [20, 30, 50, 100] as const;

export function usePagination<T>(items: T[], initialPageSize: number = PAGE_SIZE_OPTIONS[0]) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const changePageSize = (nextSize: number) => {
    setPageSize(nextSize);
    setPage(1);
  };

  return { page, setPage, pageSize, setPageSize: changePageSize, totalPages, paged };
}
