import { useState, useEffect, useCallback, useRef } from "react";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import transactionService, {
  type Transaction,
} from "../../../services/transactionService";

export interface TransactionSearchState {
  searchText: string;
  selectedMonth: Dayjs | null;
  transactions: Transaction[];
  page: number;
  rowsPerPage: number;
  totalCount: number;
  loading: boolean;
  error: string | null;
  setSearchText: (value: string) => void;
  setSelectedMonth: (value: Dayjs | null) => void;
  setPage: (value: number) => void;
  setRowsPerPage: (value: number) => void;
  search: () => void;
  clearCustomerAndSearch: () => void;
  clearFilters: () => void;
}

type TransactionQueryParams = {
  customer?: string;
  fromDate?: string;
  toDate?: string;
};

function defaultParams() {
  return {
    fromDate: dayjs().subtract(3, "month").format("YYYY-MM-DD"),
    toDate: dayjs().format("YYYY-MM-DD"),
  };
}

export function useTransactionSearch(refreshKey = 0): TransactionSearchState {
  const [searchText, setSearchText] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<Dayjs | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const appliedParamsRef = useRef<TransactionQueryParams>(defaultParams());

  const fetchTransactions = useCallback(
    async (params?: TransactionQueryParams) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      try {
        setLoading(true);
        setError(null);
        const result = await transactionService.getPage({
          ...params,
          page: page + 1,
          pageSize: rowsPerPage,
        });
        setTransactions(result.items);
        setTotalCount(result.total);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        const message =
          err instanceof Error ? err.message : "Failed to load transactions";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [page, rowsPerPage],
  );

  // Initial load and refreshKey-triggered reload using the last applied params.
  useEffect(() => {
    fetchTransactions(appliedParamsRef.current);
  }, [refreshKey, page, rowsPerPage, fetchTransactions]);

  // Explicit search triggered by the Search button
  const search = useCallback(() => {
    const hasText = searchText.trim().length > 0;
    const hasMonth = !!selectedMonth;

    if (!hasText && !hasMonth) {
      const defaults = defaultParams();
      appliedParamsRef.current = defaults;
      if (page === 0) {
        fetchTransactions(defaults);
      } else {
        setPage(0);
      }
      return;
    }

    const params: TransactionQueryParams = {
      customer: hasText ? searchText.trim() : undefined,
      fromDate: hasMonth
        ? selectedMonth!.startOf("month").format("YYYY-MM-DD")
        : undefined,
      toDate: hasMonth
        ? selectedMonth!.endOf("month").format("YYYY-MM-DD")
        : undefined,
    };

    appliedParamsRef.current = params;
    if (page === 0) {
      fetchTransactions(params);
    } else {
      setPage(0);
    }
  }, [searchText, selectedMonth, fetchTransactions, page]);

  const clearCustomerAndSearch = useCallback(() => {
    setSearchText("");

    const hasMonth = !!selectedMonth;
    if (!hasMonth) {
      const defaults = defaultParams();
      appliedParamsRef.current = defaults;
      if (page === 0) {
        fetchTransactions(defaults);
      } else {
        setPage(0);
      }
      return;
    }

    const params: TransactionQueryParams = {
      customer: undefined,
      fromDate: selectedMonth.startOf("month").format("YYYY-MM-DD"),
      toDate: selectedMonth.endOf("month").format("YYYY-MM-DD"),
    };

    appliedParamsRef.current = params;
    if (page === 0) {
      fetchTransactions(params);
    } else {
      setPage(0);
    }
  }, [selectedMonth, fetchTransactions, page]);

  const clearFilters = useCallback(() => {
    setSearchText("");
    setSelectedMonth(null);
    const defaults = defaultParams();
    appliedParamsRef.current = defaults;
    if (page === 0) {
      fetchTransactions(defaults);
    } else {
      setPage(0);
    }
  }, [fetchTransactions, page]);

  return {
    searchText,
    selectedMonth,
    transactions,
    page,
    rowsPerPage,
    totalCount,
    loading,
    error,
    setSearchText,
    setSelectedMonth,
    setPage,
    setRowsPerPage,
    search,
    clearCustomerAndSearch,
    clearFilters,
  };
}
