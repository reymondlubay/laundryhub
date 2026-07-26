import dayjs from "dayjs";
import type { AddonsPricing } from "../services/addonsPricingService";
import type { Transaction } from "../services/transactionService";
import { getTransactionAmountDue } from "./pricing";
import {
  getLatestPickup,
  getLoadsPickedUp,
  getTotalLoads,
  isFullyPickedUp,
} from "./transactionPickup";

export type PreviousBalanceItem = {
  transactionId: string;
  amount: number;
  balanceDate: string | null;
};

export type CustomerPreviousBalanceInfo = {
  amount: number;
  balanceDate: string | null;
  transactionIds: string[];
  items: PreviousBalanceItem[];
};

export type CarriedPreviousBalance = {
  amount: number;
  items: PreviousBalanceItem[];
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getCustomerId = (transaction: Transaction): string => {
  const row = transaction as Transaction & { customerid?: string };
  return String(
    transaction.customerId ||
      row.customerid ||
      transaction.customer?.id ||
      "",
  );
};

/** Fully picked up (including legacy datePickup-only rows) with remaining unpaid balance. */
export const isPreviousBalanceTransaction = (
  transaction: Transaction,
  addonsPricing: AddonsPricing,
): boolean => {
  if (transaction.isDeleted) return false;

  const totalLoads = getTotalLoads(transaction);
  if (totalLoads <= 0) return false;

  const fullyPicked =
    isFullyPickedUp(transaction) ||
    (getLoadsPickedUp(transaction) === 0 && Boolean(transaction.datePickup));

  if (!fullyPicked) return false;

  const loadDetails = transaction.loadDetails || [];
  const amountDue = getTransactionAmountDue(
    { ...transaction, loadDetails },
    addonsPricing,
  );
  const totalPaid = (transaction.paymentDetails || []).reduce(
    (sum, payment) => sum + toNumber(payment.amount),
    0,
  );
  return Math.max(amountDue - totalPaid, 0) > 0;
};

export const getPreviousBalanceDate = (
  transaction: Transaction,
): string | null => {
  const latestPickup = getLatestPickup(transaction);
  if (latestPickup?.pickupDate) return latestPickup.pickupDate;
  if (transaction.datePickup) return transaction.datePickup;
  return transaction.dateReceived || null;
};

export const getTransactionRemainingBalance = (
  transaction: Transaction,
  addonsPricing: AddonsPricing,
): number => {
  const loadDetails = transaction.loadDetails || [];
  const amountDue = getTransactionAmountDue(
    { ...transaction, loadDetails },
    addonsPricing,
  );
  const totalPaid = (transaction.paymentDetails || []).reduce(
    (sum, payment) => sum + toNumber(payment.amount),
    0,
  );
  return Math.max(amountDue - totalPaid, 0);
};

/**
 * Previous balance = all remaining balances on the customer's older
 * transactions that are fully picked up but not fully paid.
 */
export const getCustomerPreviousBalance = (
  transactions: Transaction[],
  customerId: string,
  addonsPricing: AddonsPricing,
  excludeTransactionId?: string | null,
): CustomerPreviousBalanceInfo | null => {
  if (!customerId) return null;

  const matching = transactions
    .filter((tx) => {
      if (excludeTransactionId && tx.id === excludeTransactionId) return false;
      if (getCustomerId(tx) !== String(customerId)) return false;
      return isPreviousBalanceTransaction(tx, addonsPricing);
    })
    .sort((a, b) => {
      const aDate = getPreviousBalanceDate(a);
      const bDate = getPreviousBalanceDate(b);
      return dayjs(bDate).valueOf() - dayjs(aDate).valueOf();
    });

  if (matching.length === 0) return null;

  const items: PreviousBalanceItem[] = matching.map((tx) => ({
    transactionId: tx.id,
    amount: getTransactionRemainingBalance(tx, addonsPricing),
    balanceDate: getPreviousBalanceDate(tx),
  }));

  const amount = items.reduce((sum, item) => sum + item.amount, 0);
  if (amount <= 0) return null;

  return {
    amount,
    balanceDate: items[0]?.balanceDate ?? null,
    transactionIds: items.map((item) => item.transactionId),
    items,
  };
};

export const formatPreviousBalanceDateTime = (
  value: string | null | undefined,
): string => {
  if (!value) return "a previous transaction";
  const parsed = dayjs(value);
  return parsed.isValid()
    ? parsed.format("MM-DD-YY h:mm A")
    : "a previous transaction";
};

export const formatPreviousBalanceAlertMessage = (
  customerName: string,
  info: CustomerPreviousBalanceInfo,
): string => {
  const name = customerName.trim() || "Customer";
  if (info.items.length <= 1) {
    return `${name} has a previous balance of ₱${info.amount.toFixed(2)} from ${formatPreviousBalanceDateTime(info.balanceDate)}.`;
  }

  const lines = info.items.map(
    (item) =>
      `• ₱${item.amount.toFixed(2)} from ${formatPreviousBalanceDateTime(item.balanceDate)}`,
  );
  return `${name} has a previous balance of ₱${info.amount.toFixed(2)}:\n${lines.join("\n")}`;
};

const getDateReceivedValue = (transaction: Transaction): number => {
  const tx = transaction as Transaction & { datereceived?: string };
  const raw = transaction.dateReceived || tx.datereceived || null;
  const parsed = raw ? dayjs(raw) : null;
  return parsed?.isValid() ? parsed.valueOf() : 0;
};

const isTransactionFullyPickedUp = (transaction: Transaction): boolean =>
  isFullyPickedUp(transaction) ||
  (getLoadsPickedUp(transaction) === 0 && Boolean(transaction.datePickup));

/** Fully paid and fully picked up — treat as a normal settled transaction. */
export const isTransactionFullyPaidAndPickedUp = (
  transaction: Transaction,
  addonsPricing: AddonsPricing,
): boolean =>
  getTransactionRemainingBalance(transaction, addonsPricing) <= 0 &&
  isTransactionFullyPickedUp(transaction);

/**
 * Map of transactionId → carried previous-balance (sum of all old balances).
 * Only the newest transaction that is newer than the customer's previous-balance
 * source records receives the carryover. Older history is left unchanged.
 * If that newest record is already fully paid and picked up, no carryover UI
 * is applied (it behaves like a normal paid transaction).
 */
export const buildCarriedPreviousBalanceByTransactionId = (
  transactions: Transaction[],
  addonsPricing: AddonsPricing,
): Record<string, CarriedPreviousBalance> => {
  const carriedByTransactionId: Record<string, CarriedPreviousBalance> = {};
  const customerIds = new Set(
    transactions
      .map((tx) => getCustomerId(tx))
      .filter((id): id is string => Boolean(id)),
  );

  for (const customerId of customerIds) {
    const previous = getCustomerPreviousBalance(
      transactions,
      customerId,
      addonsPricing,
    );
    if (!previous || previous.amount <= 0) continue;

    const sourceIds = new Set(previous.transactionIds);
    const latestSourceReceived = transactions
      .filter((tx) => sourceIds.has(tx.id))
      .reduce((max, tx) => Math.max(max, getDateReceivedValue(tx)), 0);

    const newestEligible = transactions
      .filter((tx) => {
        if (getCustomerId(tx) !== customerId) return false;
        if (sourceIds.has(tx.id)) return false;
        if (isPreviousBalanceTransaction(tx, addonsPricing)) return false;
        return getDateReceivedValue(tx) > latestSourceReceived;
      })
      .sort((a, b) => getDateReceivedValue(b) - getDateReceivedValue(a))[0];

    if (
      newestEligible &&
      !isTransactionFullyPaidAndPickedUp(newestEligible, addonsPricing)
    ) {
      carriedByTransactionId[newestEligible.id] = {
        amount: previous.amount,
        items: previous.items,
      };
    }
  }

  return carriedByTransactionId;
};
