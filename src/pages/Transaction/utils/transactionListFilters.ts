import dayjs from "dayjs";
import type { LaundryType } from "../../../services/apiTypes";
import type { Transaction } from "../../../services/transactionService";

export type TransactionSortBy = "default" | "kg" | "loads";
export type TransactionSortDirection = "asc" | "desc";
export type TransactionLoadTypeFilter = "" | LaundryType;

const LOAD_TYPE_ALIASES: Record<string, LaundryType> = {
  clothes: "Clothes",
  bedding: "Beddings",
  beddings: "Beddings",
  comforter: "Comforter",
};

export const normalizeLoadType = (type?: string | null): LaundryType => {
  const key = (type || "Clothes").trim().toLowerCase();
  return LOAD_TYPE_ALIASES[key] ?? "Clothes";
};

export const getTransactionLoadDetails = (
  transaction: Transaction,
): Array<{ type?: string; kg?: number; loads?: number }> => {
  const tx = transaction as Transaction & { loaddetails?: typeof transaction.loadDetails };
  return transaction.loadDetails?.length
    ? transaction.loadDetails
    : tx.loaddetails ?? [];
};

export const getTransactionTotalKg = (transaction: Transaction): number =>
  getTransactionLoadDetails(transaction).reduce(
    (sum, load) => sum + Number(load.kg ?? 0),
    0,
  );

export const getTransactionTotalLoads = (transaction: Transaction): number =>
  getTransactionLoadDetails(transaction).reduce(
    (sum, load) => sum + Number(load.loads ?? 0),
    0,
  );

export const transactionMatchesLoadType = (
  transaction: Transaction,
  filter: TransactionLoadTypeFilter,
): boolean => {
  if (!filter) return true;
  const loads = getTransactionLoadDetails(transaction);
  if (loads.length === 0) return false;
  return loads.some(
    (load) => normalizeLoadType(load.type) === filter,
  );
};

const compareDefault = (a: Transaction, b: Transaction): number => {
  const aTx = a as Transaction & {
    datereceived?: string;
    dateloaded?: string;
    estimatedpickup?: string;
  };
  const bTx = b as Transaction & {
    datereceived?: string;
    dateloaded?: string;
    estimatedpickup?: string;
  };

  const aEstimated = dayjs(a.estimatedPickup || aTx.estimatedpickup);
  const bEstimated = dayjs(b.estimatedPickup || bTx.estimatedpickup);
  const aLoaded = Boolean(a.dateLoaded || aTx.dateloaded);
  const bLoaded = Boolean(b.dateLoaded || bTx.dateloaded);
  const aPriority = !aLoaded && aEstimated.isValid();
  const bPriority = !bLoaded && bEstimated.isValid();

  if (aPriority && !bPriority) return -1;
  if (!aPriority && bPriority) return 1;

  if (aPriority && bPriority) {
    const pickupDiff = aEstimated.valueOf() - bEstimated.valueOf();
    if (pickupDiff !== 0) return pickupDiff;
  }

  const aDate = dayjs(a.dateReceived || aTx.datereceived);
  const bDate = dayjs(b.dateReceived || bTx.datereceived);

  if (!aDate.isValid() && !bDate.isValid()) return 0;
  if (!aDate.isValid()) return 1;
  if (!bDate.isValid()) return -1;

  return bDate.valueOf() - aDate.valueOf();
};

export const sortTransactions = (
  transactions: Transaction[],
  sortBy: TransactionSortBy,
  sortDirection: TransactionSortDirection,
): Transaction[] => {
  const list = [...transactions];

  list.sort((a, b) => {
    let result = 0;

    if (sortBy === "kg") {
      result = getTransactionTotalKg(a) - getTransactionTotalKg(b);
    } else if (sortBy === "loads") {
      result = getTransactionTotalLoads(a) - getTransactionTotalLoads(b);
    } else {
      result = compareDefault(a, b);
      return sortDirection === "asc" ? -result : result;
    }

    if (result === 0) {
      result = compareDefault(a, b);
      return sortDirection === "asc" ? -result : result;
    }

    return sortDirection === "asc" ? result : -result;
  });

  return list;
};

export const filterAndSortTransactions = (
  transactions: Transaction[],
  options: {
    showPendingOnly: boolean;
    showReadyForPickupOnly: boolean;
    loadTypeFilter: TransactionLoadTypeFilter;
    sortBy: TransactionSortBy;
    sortDirection: TransactionSortDirection;
  },
): Transaction[] => {
  let list = transactions;

  if (options.showPendingOnly || options.showReadyForPickupOnly) {
    list = list.filter((transaction) => {
      const tx = transaction as Transaction & {
        dateloaded?: string | null;
        datepickup?: string | null;
      };
      const loadedDate = transaction.dateLoaded || tx.dateloaded || null;
      const pickupDate = transaction.datePickup || tx.datepickup || null;

      if (options.showPendingOnly && loadedDate) return false;
      if (options.showReadyForPickupOnly && (!loadedDate || pickupDate)) {
        return false;
      }

      return true;
    });
  }

  if (options.loadTypeFilter) {
    list = list.filter((transaction) =>
      transactionMatchesLoadType(transaction, options.loadTypeFilter),
    );
  }

  return sortTransactions(list, options.sortBy, options.sortDirection);
};
