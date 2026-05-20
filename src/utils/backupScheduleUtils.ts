import dayjs, { type Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export const DEFAULT_BACKUP_SCHEDULE_TIMES = [
  "09:00",
  "12:00",
  "15:00",
  "18:00",
] as const;

export const DEFAULT_BACKUP_SCHEDULE_LABELS = [
  "09:00 AM",
  "12:00 PM",
  "03:00 PM",
  "06:00 PM",
] as const;

export const toApiScheduleTime = (value: Dayjs | null): string => {
  if (!value || !value.isValid()) return "";
  return value.format("HH:mm");
};

export const formatScheduleTimeDisplay = (apiTime: string): string => {
  const parts = (apiTime || "").trim().match(/^(\d{1,2}):(\d{2})/);
  if (!parts) return apiTime;
  const hours = Number.parseInt(parts[1], 10);
  const minutes = parts[2];
  const h12 = hours % 12 || 12;
  const ampm = hours >= 12 ? "PM" : "AM";
  return `${String(h12).padStart(2, "0")}:${minutes} ${ampm}`;
};

export const parseScheduleTimeToDayjs = (apiTime: string): Dayjs =>
  dayjs(apiTime, "HH:mm");
