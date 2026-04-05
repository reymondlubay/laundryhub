export type LaundryType = "Clothes" | "Beddings" | "Comforter";

export type LaundryItem = {
  type: LaundryType;
  kg: number;
  loads: number;
  price: number;
};

import {
  DEFAULT_PAYMENT_MODE as SHARED_DEFAULT_PAYMENT_MODE,
  PAYMENT_MODE_GCASH,
  PAYMENT_MODE_OPTIONS,
} from "../constants/payment";

export type PaymentMode = (typeof PAYMENT_MODE_OPTIONS)[number];

export const DEFAULT_PAYMENT_MODE: PaymentMode = SHARED_DEFAULT_PAYMENT_MODE;
export const PAYMENT_MODE_GCASH_VALUE: PaymentMode = PAYMENT_MODE_GCASH;

export type Payment = {
  id: string;
  paymentDate: Date;
  amount: number;
  mode: PaymentMode;
};
