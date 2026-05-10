import { useState, useEffect, useCallback, useRef } from "react";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import transactionService, {
  type Transaction,
} from "../../../services/transactionService";

export interface TransactionSearchState {
  searchText: string;
  dateFrom: Dayjs | null;
  dateTo: Dayjs | null;
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  setSearchText: (value: string) => void;
  setDateFrom: (value: Dayjs | null) => void;
  setDateTo: (value: Dayjs | null) => void;
  search: (overrides?: {
    searchText?: string;
    dateFrom?: Dayjs | null;
    dateTo?: Dayjs | null;
    useDefaultDateRange?: boolean;
  }) => Promise<void>;
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
  const [dateFrom, setDateFrom] = useState<Dayjs | null>(null);
  const [dateTo, setDateTo] = useState<Dayjs | null>(null);
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
  const search = useCallback(
    async (overrides?: {
      searchText?: string;
      dateFrom?: Dayjs | null;
      dateTo?: Dayjs | null;
      useDefaultDateRange?: boolean;
    }) => {
      const text =
        overrides?.searchText !== undefined ? overrides.searchText : searchText;
      const from =
        overrides?.dateFrom !== undefined ? overrides.dateFrom : dateFrom;
      const to = overrides?.dateTo !== undefined ? overrides.dateTo : dateTo;
      const useDefaultDateRange = overrides?.useDefaultDateRange ?? true;

      const hasText = text.trim().length > 0;
      const hasFrom = !!from;
      const hasTo = !!to;

      if (!hasText && !hasFrom && !hasTo) {
        if (!useDefaultDateRange) {
          const params: TransactionQueryParams = {};
          appliedParamsRef.current = params;
          await fetchTransactions(params);
          return;
        }

        const defaults = defaultParams();
        appliedParamsRef.current = defaults;
        await fetchTransactions(defaults);
        return;
      }

      const params: TransactionQueryParams = {
        customer: hasText ? text.trim() : undefined,
        fromDate: hasFrom ? from!.format("YYYY-MM-DD") : undefined,
        toDate: hasTo ? to!.format("YYYY-MM-DD") : undefined,
      };

      appliedParamsRef.current = params;
      await fetchTransactions(params);
    },
    [searchText, dateFrom, dateTo, fetchTransactions],
  );

  const clearCustomerAndSearch = useCallback(() => {
    setSearchText("");

    const hasFrom = !!dateFrom;
    const hasTo = !!dateTo;
    if (!hasFrom && !hasTo) {
      const defaults = defaultParams();
      appliedParamsRef.current = defaults;
      fetchTransactions(defaults);
      return;
    }

    const params: TransactionQueryParams = {
      customer: undefined,
      fromDate: hasFrom ? dateFrom!.format("YYYY-MM-DD") : undefined,
      toDate: hasTo ? dateTo!.format("YYYY-MM-DD") : undefined,
    };

    appliedParamsRef.current = params;
    fetchTransactions(params);
  }, [dateFrom, dateTo, fetchTransactions]);

  const clearFilters = useCallback(() => {
    setSearchText("");
    setDateFrom(null);
    setDateTo(null);
    const defaults = defaultParams();
    appliedParamsRef.current = defaults;
    fetchTransactions(defaults);
  }, [fetchTransactions]);

  return {
    searchText,
    dateFrom,
    dateTo,
    transactions,
    loading,
    error,
    setSearchText,
    setDateFrom,
    setDateTo,
    search,
    clearCustomerAndSearch,
    clearFilters,
    upsertTransaction,
    removeTransaction,
  };
}
