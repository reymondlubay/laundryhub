export const PAYMENT_MODE_CASH = "Cash" as const;
export const PAYMENT_MODE_GCASH = "GCash" as const;
export const PAYMENT_MODE_GCASH_BACKEND = "Gcash" as const;

/** Map UI or API payment mode to the value the backend Joi schema expects ("Cash" | "Gcash"). */
export function toBackendPaymentMode(mode: string | undefined | null): string {
  const m = String(mode ?? "").trim();
  if (m === PAYMENT_MODE_GCASH || m === PAYMENT_MODE_GCASH_BACKEND) {
    return PAYMENT_MODE_GCASH_BACKEND;
  }
  return PAYMENT_MODE_CASH;
}

export const PAYMENT_MODE_OPTIONS = [
  PAYMENT_MODE_CASH,
  PAYMENT_MODE_GCASH,
] as const;

export const DEFAULT_PAYMENT_MODE = PAYMENT_MODE_CASH;
