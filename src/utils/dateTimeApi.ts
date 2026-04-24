import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

type ApiDateTimeInput = Dayjs | Date | string | number | null | undefined;

/**
 * Naive wall-clock string for API + PostgreSQL TIMESTAMP (no timezone).
 * Matches TransactionModal / backend storage: what the user picked is what gets stored.
 * Do not use Date#toISOString() for these fields — it sends UTC and shifts AM/PM vs PH.
 */
export function toApiDateTimeString(
  value: ApiDateTimeInput,
): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  const d = dayjs.isDayjs(value) ? value : dayjs(value);
  if (!d.isValid()) return undefined;
  return d.format("YYYY-MM-DDTHH:mm:ss");
}
