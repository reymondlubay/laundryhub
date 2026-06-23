import { useCallback, useRef } from "react";

export function usePaginatedTableScroll() {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const scrollTableToTop = useCallback(() => {
    tableContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const onPageChange = useCallback(
    (setPage: (page: number) => void) =>
      (_: unknown, newPage: number) => {
        setPage(newPage);
        scrollTableToTop();
      },
    [scrollTableToTop],
  );

  const onRowsPerPageChange = useCallback(
    (
      setRowsPerPage: (rows: number) => void,
      setPage: (page: number) => void,
    ) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
        scrollTableToTop();
      },
    [scrollTableToTop],
  );

  return {
    tableContainerRef,
    scrollTableToTop,
    onPageChange,
    onRowsPerPageChange,
  };
}
