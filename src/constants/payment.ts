export const PAYMENT_MODE_CASH = "Cash" as const;
export const PAYMENT_MODE_GCASH = "GCash" as const;
export const PAYMENT_MODE_GCASH_BACKEND = "Gcash" as const;

export const PAYMENT_MODE_OPTIONS = [
  PAYMENT_MODE_CASH,
  PAYMENT_MODE_GCASH,
] as const;

export const DEFAULT_PAYMENT_MODE = PAYMENT_MODE_CASH;
