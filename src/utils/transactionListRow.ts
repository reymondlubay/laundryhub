import dayjs from "dayjs";
import type { Transaction } from "../services/transactionService";
import type { AddonsPricing } from "../services/addonsPricingService";
import { toPascalCase } from "./stringUtils";
import { getTransactionAmountDue } from "./pricing";

export interface TransactionListRow {
  id: string;
  dateReceived: string | null;
  customer: string;
  kg: number;
  loads: number;
  price: number;
  dateLoaded: string | null;
  datePaid: string | null;
  datePickup: string | null;
  deletedDate: string | null;
}

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "-";
  const d = dayjs(value);
  return d.isValid() ? d.format("MM-DD-YY h:mm A") : "-";
};

const formatPrice = (value: number): string =>
  `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const buildTransactionListRow = (
  transaction: Transaction,
  addonsPricing: AddonsPricing,
): TransactionListRow => {
  const tx = transaction as Transaction & {
    datereceived?: string;
    dateloaded?: string;
    datepickup?: string;
    deleteddate?: string;
  };

  const loadDetails = transaction.loadDetails || [];
  const totalKg = loadDetails.reduce(
    (sum, load) => sum + Number(load.kg || 0),
    0,
  );
  const totalLoads = loadDetails.reduce(
    (sum, load) => sum + Number(load.loads || 0),
    0,
  );

  const payments = transaction.paymentDetails || [];
  const datePaid =
    payments.length > 0 ? payments[payments.length - 1].paymentDate : null;

  const txRecord = transaction as unknown as Record<string, unknown>;
  const totalPrice = getTransactionAmountDue(
    { ...transaction, loadDetails },
    addonsPricing,
  );

  const deletedDateRaw =
    transaction.deletedDate ??
    tx.deleteddate ??
    (txRecord.deleteddate as string | undefined) ??
    (txRecord.deletedDate as string | undefined) ??
    null;

  return {
    id: transaction.id,
    dateReceived: tx.dateReceived || tx.datereceived || null,
    customer: toPascalCase(transaction.customer?.name || "Unknown"),
    kg: totalKg,
    loads: totalLoads,
    price: totalPrice,
    dateLoaded: tx.dateLoaded || tx.dateloaded || null,
    datePaid,
    datePickup: tx.datePickup || tx.datepickup || null,
    deletedDate: deletedDateRaw,
  };
};

export const formatTransactionListCell = (
  field: keyof TransactionListRow,
  row: TransactionListRow,
): string => {
  switch (field) {
    case "dateReceived":
    case "dateLoaded":
    case "datePaid":
    case "datePickup":
    case "deletedDate":
      return formatDateTime(row[field]);
    case "price":
      return formatPrice(row.price);
    case "kg":
      return row.kg > 0 ? String(row.kg) : "-";
    case "loads":
      return row.loads > 0 ? String(row.loads) : "-";
    default:
      return String(row[field] ?? "-");
  }
};
