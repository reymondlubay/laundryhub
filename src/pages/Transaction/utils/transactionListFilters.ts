import dayjs from "dayjs";
import type { LaundryType } from "../../../services/apiTypes";
import {
  DEFAULT_ADDONS_PRICING,
  type AddonsPricing,
} from "../../../services/addonsPricingService";
import type { Transaction } from "../../../services/transactionService";
import { isFullyPickedUp } from "../../../utils/transactionPickup";
import { getTransactionAmountDue } from "../../../utils/pricing";

export type TransactionSortBy = "default" | "kg" | "loads" | "price";
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

export const parsePriceFilter = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount;
};

export const isTransactionDelivered = (transaction: Transaction): boolean => {
  const tx = transaction as Transaction & { isdelivered?: boolean };
  return Boolean(transaction.isDelivered ?? tx.isdelivered);
};

/** Delivery orders that have not been fully picked up yet. */
export const transactionMatchesDeliveryFilter = (
  transaction: Transaction,
): boolean =>
  isTransactionDelivered(transaction) && !isFullyPickedUp(transaction);

export const isTransactionUnpaid = (transaction: Transaction): boolean => {
  const payments = transaction.paymentDetails ?? [];
  if (payments.length === 0) return true;
  const totalPaid = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );
  return totalPaid === 0;
};

export const transactionMatchesPriceRange = (
  transaction: Transaction,
  priceMin: number | null,
  priceMax: number | null,
  addonsPricing: AddonsPricing = DEFAULT_ADDONS_PRICING,
): boolean => {
  if (priceMin == null && priceMax == null) return true;
  const total = getTransactionAmountDue(transaction, addonsPricing);
  if (priceMin != null && total < priceMin) return false;
  if (priceMax != null && total > priceMax) return false;
  return true;
};

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

const getEstimatedPickup = (transaction: Transaction): dayjs.Dayjs => {
  const tx = transaction as Transaction & { estimatedpickup?: string };
  return dayjs(transaction.estimatedPickup || tx.estimatedpickup);
};

/** Raw estimated pickup value from API row (camelCase or lowercase). */
export const getTransactionEstimatedPickupIso = (
  transaction: Transaction | null | undefined,
): string | null => {
  if (!transaction) return null;
  const tx = transaction as Transaction & { estimatedpickup?: string | null };
  const raw = transaction.estimatedPickup ?? tx.estimatedpickup ?? null;
  if (raw == null || String(raw).trim() === "") return null;
  const d = dayjs(raw);
  return d.isValid() ? String(raw) : null;
};

/** Scheduled pickup applies only to unloaded transactions with a valid estimate. */
export const hasScheduledPickup = (transaction: Transaction): boolean => {
  const tx = transaction as Transaction & { dateloaded?: string };
  if (transaction.dateLoaded || tx.dateloaded) return false;
  return getTransactionEstimatedPickupIso(transaction) != null;
};

export const isEstimatedPickupTomorrow = (
  estimatedPickup?: string | null,
): boolean => {
  const estimated = dayjs(estimatedPickup);
  if (!estimated.isValid()) return false;
  const tomorrow = dayjs().add(1, "day").startOf("day");
  return estimated.startOf("day").isSame(tomorrow, "day");
};

export type EstimatedPickupTooltipParts = {
  isTomorrow: boolean;
  timePart: string;
  datePart: string;
};

export const getEstimatedPickupTooltipParts = (
  estimatedPickup?: string | null,
): EstimatedPickupTooltipParts | null => {
  const estimated = dayjs(estimatedPickup);
  if (!estimated.isValid()) return null;
  return {
    isTomorrow: isEstimatedPickupTomorrow(estimatedPickup),
    timePart: estimated.format("h:mm A"),
    datePart: estimated.format("dddd, MMMM D, YYYY"),
  };
};

/** Unloaded rows scheduled for tomorrow are pinned to the top; later dates use receive-date order. */
const hasTomorrowPickupPriority = (transaction: Transaction): boolean => {
  const tx = transaction as Transaction & {
    dateloaded?: string;
    estimatedpickup?: string;
  };
  const loaded = Boolean(transaction.dateLoaded || tx.dateloaded);
  if (loaded) return false;
  return isEstimatedPickupTomorrow(
    transaction.estimatedPickup || tx.estimatedpickup,
  );
};

const compareDefault = (a: Transaction, b: Transaction): number => {
  const aTx = a as Transaction & {
    datereceived?: string;
    dateloaded?: string;
  };
  const bTx = b as Transaction & {
    datereceived?: string;
    dateloaded?: string;
  };

  const aEstimated = getEstimatedPickup(a);
  const bEstimated = getEstimatedPickup(b);
  const aPriority = hasTomorrowPickupPriority(a);
  const bPriority = hasTomorrowPickupPriority(b);

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

export const getTransactionPrice = (
  transaction: Transaction,
  addonsPricing: AddonsPricing = DEFAULT_ADDONS_PRICING,
): number => getTransactionAmountDue(transaction, addonsPricing);

export const sortTransactions = (
  transactions: Transaction[],
  sortBy: TransactionSortBy,
  sortDirection: TransactionSortDirection,
  addonsPricing: AddonsPricing = DEFAULT_ADDONS_PRICING,
): Transaction[] => {
  const list = [...transactions];

  list.sort((a, b) => {
    let result = 0;

    if (sortBy === "kg") {
      result = getTransactionTotalKg(a) - getTransactionTotalKg(b);
    } else if (sortBy === "loads") {
      result = getTransactionTotalLoads(a) - getTransactionTotalLoads(b);
    } else if (sortBy === "price") {
      result =
        getTransactionPrice(a, addonsPricing) -
        getTransactionPrice(b, addonsPricing);
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
    showUnpaidOnly: boolean;
    showDeliveryOnly: boolean;
    loadTypeFilter: TransactionLoadTypeFilter;
    priceMin: number | null;
    priceMax: number | null;
    addonsPricing: AddonsPricing;
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

      if (options.showPendingOnly && loadedDate) return false;
      if (
        options.showReadyForPickupOnly &&
        (!loadedDate || isFullyPickedUp(transaction))
      ) {
        return false;
      }

      return true;
    });
  }

  if (options.showUnpaidOnly) {
    list = list.filter((transaction) => isTransactionUnpaid(transaction));
  }

  if (options.showDeliveryOnly) {
    list = list.filter((transaction) =>
      transactionMatchesDeliveryFilter(transaction),
    );
  }

  if (options.loadTypeFilter) {
    list = list.filter((transaction) =>
      transactionMatchesLoadType(transaction, options.loadTypeFilter),
    );
  }

  if (options.priceMin != null || options.priceMax != null) {
    list = list.filter((transaction) =>
      transactionMatchesPriceRange(
        transaction,
        options.priceMin,
        options.priceMax,
        options.addonsPricing,
      ),
    );
  }

  return sortTransactions(
    list,
    options.sortBy,
    options.sortDirection,
    options.addonsPricing,
  );
};
