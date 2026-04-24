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
  loading: boolean;
  error: string | null;
  setSearchText: (value: string) => void;
  setSelectedMonth: (value: Dayjs | null) => void;
  search: () => Promise<void>;
  clearCustomerAndSearch: () => void;
  clearFilters: () => void;
  upsertTransaction: (next: Transaction) => void;
  removeTransaction: (id: string) => void;
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

export function useTransactionSearch(): TransactionSearchState {
  const [searchText, setSearchText] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<Dayjs | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
        const data = await transactionService.getAll(params);
        setTransactions(data);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        const message =
          err instanceof Error ? err.message : "Failed to load transactions";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Initial load using the last applied params (search/clear update appliedParamsRef).
  useEffect(() => {
    fetchTransactions(appliedParamsRef.current);
  }, [fetchTransactions]);

  const upsertTransaction = useCallback((next: Transaction) => {
    setTransactions((prev) => {
      const idx = prev.findIndex((t) => t.id === next.id);
      if (idx === -1) {
        return [next, ...prev];
      }
      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
  }, []);

  const removeTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Explicit search triggered by the Search button (returns when the list fetch finishes).
  const search = useCallback(async () => {
    const hasText = searchText.trim().length > 0;
    const hasMonth = !!selectedMonth;

    if (!hasText && !hasMonth) {
      const defaults = defaultParams();
      appliedParamsRef.current = defaults;
      await fetchTransactions(defaults);
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
    await fetchTransactions(params);
  }, [searchText, selectedMonth, fetchTransactions]);

  const clearCustomerAndSearch = useCallback(() => {
    setSearchText("");

    const hasMonth = !!selectedMonth;
    if (!hasMonth) {
      const defaults = defaultParams();
      appliedParamsRef.current = defaults;
      fetchTransactions(defaults);
      return;
    }

    const params: TransactionQueryParams = {
      customer: undefined,
      fromDate: selectedMonth.startOf("month").format("YYYY-MM-DD"),
      toDate: selectedMonth.endOf("month").format("YYYY-MM-DD"),
    };

    appliedParamsRef.current = params;
    fetchTransactions(params);
  }, [selectedMonth, fetchTransactions]);

  const clearFilters = useCallback(() => {
    setSearchText("");
    setSelectedMonth(null);
    const defaults = defaultParams();
    appliedParamsRef.current = defaults;
    fetchTransactions(defaults);
  }, [fetchTransactions]);

  return {
    searchText,
    selectedMonth,
    transactions,
    loading,
    error,
    setSearchText,
    setSelectedMonth,
    search,
    clearCustomerAndSearch,
    clearFilters,
    upsertTransaction,
    removeTransaction,
  };
}
