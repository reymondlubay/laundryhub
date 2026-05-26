/** Load total thresholds: &lt;20 red, 20–30 orange, 31–39 blue, 40+ green */
export const LOAD_COLOR_RED = "#d32f2f";
export const LOAD_COLOR_ORANGE = "#ed6c02";
export const LOAD_COLOR_BLUE = "#1976d2";
export const LOAD_COLOR_GREEN = "#2e7d32";

export const getLoadsThresholdColor = (loads: number): string => {
  const n = Math.round(Number(loads) || 0);
  if (n < 20) return LOAD_COLOR_RED;
  if (n <= 30) return LOAD_COLOR_ORANGE;
  if (n < 40) return LOAD_COLOR_BLUE;
  return LOAD_COLOR_GREEN;
};

export const DOW_WEEKEND_TEXT_COLOR = LOAD_COLOR_BLUE;

export const LOAD_THRESHOLD_LEGEND = [
  { label: "< 20", color: LOAD_COLOR_RED },
  { label: "20 – 30", color: LOAD_COLOR_ORANGE },
  { label: "31 – 39", color: LOAD_COLOR_BLUE },
  { label: "40+", color: LOAD_COLOR_GREEN },
] as const;
