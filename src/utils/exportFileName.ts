import dayjs, { type Dayjs } from "dayjs";

/** e.g. June_8_2026_11_39_01_AM */
export function formatExportTimestamp(at: Dayjs = dayjs()): string {
  return [
    at.format("MMMM"),
    at.format("D"),
    at.format("YYYY"),
    at.format("h"),
    at.format("mm"),
    at.format("ss"),
    at.format("A"),
  ].join("_");
}

/** e.g. June_8_2026 */
export function formatExportDateLabel(at: Dayjs): string {
  return [at.format("MMMM"), at.format("D"), at.format("YYYY")].join("_");
}

/** e.g. June_2026 */
export function formatExportMonthLabel(at: Dayjs): string {
  return [at.format("MMMM"), at.format("YYYY")].join("_");
}

export function buildExportFileName(...segments: string[]): string {
  const body = segments.filter(Boolean).join("_");
  return `${body}_${formatExportTimestamp()}.csv`;
}
