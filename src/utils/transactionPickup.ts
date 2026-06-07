import dayjs from "dayjs";
import type {
  Transaction,
  TransactionPickup,
} from "../services/transactionService";

const toNumber = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getPickupDetails = (transaction: Transaction): TransactionPickup[] =>
  transaction.pickupDetails ?? [];

export const getTotalLoads = (transaction: Transaction): number => {
  const details = transaction.loadDetails ?? [];
  return details.reduce((sum, load) => sum + toNumber(load.loads), 0);
};

export const getLoadsPickedUp = (transaction: Transaction): number =>
  getPickupDetails(transaction).reduce(
    (sum, pickup) => sum + toNumber(pickup.loadsCount),
    0,
  );

export const getRemainingLoads = (transaction: Transaction): number =>
  Math.max(0, getTotalLoads(transaction) - getLoadsPickedUp(transaction));

export const isFullyPickedUp = (transaction: Transaction): boolean => {
  const total = getTotalLoads(transaction);
  return total > 0 && getLoadsPickedUp(transaction) >= total;
};

export const hasPartialPickup = (transaction: Transaction): boolean => {
  const picked = getLoadsPickedUp(transaction);
  const total = getTotalLoads(transaction);
  return picked > 0 && picked < total;
};

export const hasAnyPickup = (transaction: Transaction): boolean =>
  getLoadsPickedUp(transaction) > 0 ||
  Boolean(transaction.datePickup);

export const getLatestPickup = (
  transaction: Transaction,
): TransactionPickup | null => {
  const details = getPickupDetails(transaction);
  if (details.length === 0) return null;
  return details[details.length - 1] ?? null;
};

export const clampPickupLoadsValue = (raw: string, max: number): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || raw.trim() === "") return 1;
  return Math.max(1, Math.min(max, Math.floor(parsed)));
};

const formatPickupEmployeeName = (pickup: TransactionPickup): string => {
  const name = [pickup.releasedByUser?.firstName, pickup.releasedByUser?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || pickup.releasedByUser?.userName || "—";
};

export const getPickupHistoryLines = (transaction: Transaction): string[] => {
  const details = getPickupDetails(transaction);
  if (details.length === 0) return ["No pickup history"];

  return details.map((pickup) => {
    const date =
      pickup.pickupDate && dayjs(pickup.pickupDate).isValid()
        ? dayjs(pickup.pickupDate).format("MM-DD-YY h:mm A")
        : "—";
    return `${date} — ${pickup.loadsCount} load(s) — ${formatPickupEmployeeName(pickup)}`;
  });
};

export const formatPickupHistoryTooltip = (
  transaction: Transaction,
): string => getPickupHistoryLines(transaction).join("\n");

export const getPickupLoadsOnDate = (
  transaction: Transaction,
  isOnDate: (value: string) => boolean,
): number => {
  const details = getPickupDetails(transaction);
  if (details.length > 0) {
    return details
      .filter((pickup) => pickup.pickupDate && isOnDate(pickup.pickupDate))
      .reduce((sum, pickup) => sum + toNumber(pickup.loadsCount), 0);
  }

  if (transaction.datePickup && isOnDate(transaction.datePickup)) {
    return getTotalLoads(transaction);
  }

  return 0;
};

export const transactionHadPickupOnDate = (
  transaction: Transaction,
  isOnDate: (value: string) => boolean,
): boolean => getPickupLoadsOnDate(transaction, isOnDate) > 0;

export const getLatestPickupDateOnDate = (
  transaction: Transaction,
  isOnDate: (value: string) => boolean,
): string | null => {
  const details = getPickupDetails(transaction);
  const matching = details.filter(
    (pickup) => pickup.pickupDate && isOnDate(pickup.pickupDate),
  );
  if (matching.length > 0) {
    return matching[matching.length - 1]?.pickupDate ?? null;
  }

  if (transaction.datePickup && isOnDate(transaction.datePickup)) {
    return transaction.datePickup;
  }

  return null;
};
