import React from "react";
import dayjs, { Dayjs } from "dayjs";
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import transactionService, {
  type Transaction,
} from "../../services/transactionService";

type TransactionWithLegacyFields = Transaction & {
  datereceived?: string;
  loaddetails?: Array<{
    loads?: number | string | null;
    price?: number | string | null;
  }>;
  load_details?: Array<{
    loads?: number | string | null;
    price?: number | string | null;
  }>;
  grandtotal?: number | string | null;
  isdeleted?: boolean;
};

const toNumber = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const getTransactionDate = (t: Transaction): string | undefined => {
  const tx = t as TransactionWithLegacyFields;
  return t.dateReceived || tx.datereceived;
};

const getLoadDetails = (
  t: Transaction,
): Array<{ loads?: unknown; price?: unknown }> => {
  const tx = t as TransactionWithLegacyFields;
  if (Array.isArray(t.loadDetails) && t.loadDetails.length > 0)
    return t.loadDetails;
  if (Array.isArray(tx.loaddetails) && tx.loaddetails.length > 0)
    return tx.loaddetails;
  if (Array.isArray(tx.load_details) && tx.load_details.length > 0)
    return tx.load_details;
  return [];
};

const getTotalLoads = (t: Transaction): number =>
  getLoadDetails(t).reduce((sum, row) => sum + toNumber(row.loads), 0);

const getTotalPrice = (t: Transaction): number =>
  getLoadDetails(t).reduce((sum, row) => sum + toNumber(row.price), 0);

const getTransactionAmount = (t: Transaction): number => {
  const tx = t as TransactionWithLegacyFields;
  const explicit = toNumber(t.grandTotal ?? tx.grandtotal ?? 0);
  return explicit > 0 ? explicit : getTotalPrice(t);
};

const formatCurrency = (value: number): string =>
  `₱${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatNumber = (value: number): string =>
  Number.isFinite(value) ? value.toLocaleString("en-US") : "0";

type DailyRow = {
  date: string;
  dow: string;
  loads: number;
  amount: number;
};

type MonthlyRow = {
  monthKey: string;
  monthLabel: string;
  loads: number;
  amount: number;
};

type BarChartPoint = {
  label: string;
  value: number;
  /** First line label, e.g. "Date" or "Month" */
  headingLabel: string;
  /** Value shown next to heading (full date or month) */
  headingValue: string;
  totalLoad: number;
  totalAmount: number;
};

const isFriSatSun = (dateKey: string): boolean => {
  const d = dayjs(dateKey).day();
  return d === 5 || d === 6 || d === 0;
};

/**
 * Tier text colors only (no cell fill): &lt;20 red, 20–30 orange, 31–40 green,
 * &gt;40 blue.
 */
const getLoadTextColor = (loads: number): string => {
  const v = Math.round(loads);
  if (v < 20) return "#7f1d1d";
  if (v <= 30) return "#92400e";
  if (v <= 40) return "#166534";
  return "#1d4ed8";
};

const BarChart: React.FC<{
  title: string;
  yAxisLabel: string;
  xAxisLabel: string;
  points: BarChartPoint[];
  height?: number;
}> = ({ title, yAxisLabel, xAxisLabel, points, height = 320 }) => {
  const [hover, setHover] = React.useState<{
    clientX: number;
    clientY: number;
    point: BarChartPoint;
  } | null>(null);

  const padding = { top: 30, right: 16, bottom: 50, left: 44 };
  const max = Math.max(1, ...points.map((p) => p.value));
  const w = 1000;
  const h = height;
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const gap =
    points.length > 1
      ? Math.max(2, Math.min(10, chartW / points.length / 6))
      : 0;
  const barW =
    points.length > 0 ? (chartW - gap * (points.length - 1)) / points.length : 0;

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "#0f1318",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <svg
          viewBox={`0 0 ${w} ${h}`}
          width="100%"
          height={height}
          role="img"
          aria-label={title}
        >
          <rect x={0} y={0} width={w} height={h} fill="#0f1318" />
          <text
            x={padding.left}
            y={22}
            fill="rgba(255,255,255,0.92)"
            fontSize="18"
            fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Arial"
            fontWeight={700}
          >
            {title}
          </text>

          {Array.from({ length: 5 }).map((_, i) => {
            const y = padding.top + (chartH / 4) * i;
            const v = Math.round((max * (4 - i)) / 4);
            return (
              <g key={`grid-${i}`}>
                <line
                  x1={padding.left}
                  x2={w - padding.right}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.08)"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  fill="rgba(255,255,255,0.6)"
                  fontSize="12"
                  textAnchor="end"
                  fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Arial"
                >
                  {v}
                </text>
              </g>
            );
          })}

          {points.map((p, idx) => {
            const x = padding.left + idx * (barW + gap);
            const barH = Math.round((p.value / max) * chartH);
            const y = padding.top + (chartH - barH);
            return (
              <g key={`${p.label}-${idx}`}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx={4}
                  fill="#5aa2ff"
                  opacity={0.92}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={(e) =>
                    setHover({
                      clientX: e.clientX,
                      clientY: e.clientY,
                      point: p,
                    })
                  }
                  onMouseMove={(e) =>
                    setHover({
                      clientX: e.clientX,
                      clientY: e.clientY,
                      point: p,
                    })
                  }
                  onMouseLeave={() => setHover(null)}
                />
                <text
                  x={x + barW / 2}
                  y={h - padding.bottom + 28}
                  fill="rgba(255,255,255,0.7)"
                  fontSize="11"
                  textAnchor="middle"
                  transform={`rotate(35 ${x + barW / 2} ${h - padding.bottom + 28})`}
                  fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Arial"
                >
                  {p.label}
                </text>
              </g>
            );
          })}

          <text
            x={w / 2}
            y={h - 8}
            fill="rgba(255,255,255,0.55)"
            fontSize="12"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Arial"
          >
            {xAxisLabel}
          </text>
          <text
            x={18}
            y={padding.top + chartH / 2}
            fill="rgba(255,255,255,0.55)"
            fontSize="12"
            textAnchor="middle"
            transform={`rotate(-90 18 ${padding.top + chartH / 2})`}
            fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Arial"
          >
            {yAxisLabel}
          </text>
        </svg>
      </Box>

      {hover ? (
        <Box
          sx={{
            position: "fixed",
            left: hover.clientX + 12,
            top: hover.clientY + 12,
            zIndex: 2000,
            pointerEvents: "none",
            bgcolor: "rgba(15, 19, 24, 0.96)",
            color: "#f1f5f9",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 1,
            px: 1.25,
            py: 1,
            minWidth: 160,
            boxShadow: 3,
          }}
        >
          <Typography variant="caption" sx={{ display: "block", opacity: 0.75 }}>
            {hover.point.headingLabel}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
            {hover.point.headingValue}
          </Typography>
          <Typography variant="caption" sx={{ display: "block", opacity: 0.75 }}>
            Total Load
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {Math.round(hover.point.totalLoad).toLocaleString("en-US")}
          </Typography>
          <Typography variant="caption" sx={{ display: "block", opacity: 0.75 }}>
            Total Amount
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatCurrency(hover.point.totalAmount)}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
};

const MONTHS_WINDOW = 12;

const TransactionGraphSummary: React.FC = () => {
  const rangeStart = React.useMemo(
    () => dayjs().startOf("month").subtract(MONTHS_WINDOW - 1, "month"),
    [],
  );
  const rangeEnd = React.useMemo(() => dayjs().endOf("month"), []);

  const [selectedMonth, setSelectedMonth] = React.useState<Dayjs>(() =>
    dayjs().startOf("month"),
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await transactionService.getAll({
          fromDate: rangeStart.format("YYYY-MM-DD"),
          toDate: rangeEnd.format("YYYY-MM-DD"),
          includeDeleted: false,
        });
        setTransactions(
          data.filter(
            (t) =>
              !t.isDeleted && !(t as TransactionWithLegacyFields).isdeleted,
          ),
        );
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load transaction graph summary.",
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [rangeEnd, rangeStart]);

  const dailyRows = React.useMemo<DailyRow[]>(() => {
    const monthStart = selectedMonth.startOf("month");
    const monthEnd = selectedMonth.endOf("month");

    const map = new Map<string, { loads: number; amount: number }>();
    for (const t of transactions) {
      const dateRaw = getTransactionDate(t);
      if (!dateRaw) continue;
      const d = dayjs(dateRaw);
      if (!d.isValid()) continue;
      if (d.isBefore(monthStart, "day") || d.isAfter(monthEnd, "day")) continue;

      const key = d.format("YYYY-MM-DD");
      const prev = map.get(key) ?? { loads: 0, amount: 0 };
      prev.loads += getTotalLoads(t);
      prev.amount += getTransactionAmount(t);
      map.set(key, prev);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([date, v]) => ({
        date,
        dow: dayjs(date).format("dddd"),
        loads: v.loads,
        amount: v.amount,
      }));
  }, [selectedMonth, transactions]);

  const dailySummary = React.useMemo(() => {
    const days = dailyRows.length;
    const totalLoads = dailyRows.reduce((sum, r) => sum + r.loads, 0);
    const totalAmount = dailyRows.reduce((sum, r) => sum + r.amount, 0);
    return {
      days,
      totalLoads,
      totalAmount,
      avgLoads: days > 0 ? totalLoads / days : 0,
      avgAmount: days > 0 ? totalAmount / days : 0,
    };
  }, [dailyRows]);

  const monthlyRows = React.useMemo<MonthlyRow[]>(() => {
    const months: MonthlyRow[] = [];
    const monthStart = dayjs().startOf("month").subtract(MONTHS_WINDOW - 1, "month");
    for (let i = 0; i < MONTHS_WINDOW; i++) {
      const m = monthStart.add(i, "month");
      months.push({
        monthKey: m.format("YYYY-MM"),
        monthLabel: m.format("MMM YYYY"),
        loads: 0,
        amount: 0,
      });
    }

    const index = new Map(months.map((m, i) => [m.monthKey, i]));
    const daysByMonth = new Map<string, Set<string>>();
    for (const t of transactions) {
      const dateRaw = getTransactionDate(t);
      if (!dateRaw) continue;
      const d = dayjs(dateRaw);
      if (!d.isValid()) continue;
      const key = d.format("YYYY-MM");
      const idx = index.get(key);
      if (idx === undefined) continue;
      months[idx].loads += getTotalLoads(t);
      months[idx].amount += getTransactionAmount(t);

      const dayKey = d.format("YYYY-MM-DD");
      const set = daysByMonth.get(key) ?? new Set<string>();
      set.add(dayKey);
      daysByMonth.set(key, set);
    }

    // Attach transaction-day counts (for consistent averages vs Daily table)
    return months.map((m) => {
      const txDays = daysByMonth.get(m.monthKey)?.size ?? 0;
      return { ...m, txDays } as MonthlyRow & { txDays: number };
    });
  }, [transactions]);

  const dailyChartPoints = React.useMemo<BarChartPoint[]>(
    () =>
      dailyRows.map((r) => ({
        label: dayjs(r.date).format("MM/DD"),
        value: r.loads,
        headingLabel: "Date",
        headingValue: dayjs(r.date).format("M/D/YYYY"),
        totalLoad: r.loads,
        totalAmount: r.amount,
      })),
    [dailyRows],
  );

  const monthlyChartPoints = React.useMemo<BarChartPoint[]>(
    () =>
      monthlyRows.map((m) => ({
        label: m.monthLabel,
        value: m.loads,
        headingLabel: "Month",
        headingValue: m.monthLabel,
        totalLoad: m.loads,
        totalAmount: m.amount,
      })),
    [monthlyRows],
  );

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Transaction Graph Summary
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Select Month"
              value={selectedMonth}
              views={["year", "month"]}
              onChange={(value) =>
                setSelectedMonth((value || dayjs()).startOf("month"))
              }
              minDate={rangeStart}
              maxDate={dayjs().endOf("month")}
              slotProps={{ textField: { size: "small" } }}
            />
          </LocalizationProvider>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Showing daily totals for {selectedMonth.format("MMMM YYYY")}
          </Typography>
        </Stack>
      </Paper>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>
              Daily Summary
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>DOW</TableCell>
                    <TableCell align="right">Sum of Load</TableCell>
                    <TableCell align="right">Sum of Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dailyRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No records found for this month.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {dailyRows.map((r) => {
                        const loadColor = getLoadTextColor(r.loads);
                        const weekendDow = isFriSatSun(r.date);
                        return (
                          <TableRow key={r.date}>
                            <TableCell>
                              {dayjs(r.date).format("M/D/YYYY")}
                            </TableCell>
                            <TableCell
                              sx={
                                weekendDow
                                  ? {
                                      color: "#9f1239",
                                      fontWeight: 600,
                                    }
                                  : undefined
                              }
                            >
                              {r.dow}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                color: loadColor,
                                fontWeight: 600,
                              }}
                            >
                              {formatNumber(Math.round(r.loads))}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(r.amount)}
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      <TableRow>
                        <TableCell colSpan={2} sx={{ fontWeight: 800 }}>
                          Summary (Totals)
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                          {formatNumber(Math.round(dailySummary.totalLoads))}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                          {formatCurrency(dailySummary.totalAmount)}
                        </TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell colSpan={2} sx={{ fontWeight: 700 }}>
                          Summary (Averages per day • {dailySummary.days} day
                          {dailySummary.days === 1 ? "" : "s"})
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {formatNumber(Number(dailySummary.avgLoads.toFixed(2)))}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {formatCurrency(dailySummary.avgAmount)}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <BarChart
              title="SUM of Load vs. Date"
              yAxisLabel="Sum of Load"
              xAxisLabel="Date"
              points={dailyChartPoints}
            />
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>
              Monthly Summary (last {MONTHS_WINDOW} months)
            </Typography>
            <TableContainer sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Month</TableCell>
                    <TableCell align="right">Sum of Load</TableCell>
                    <TableCell align="right">Sum of Amount</TableCell>
                    <TableCell align="right">Average Load</TableCell>
                    <TableCell align="right">Average Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {monthlyRows.map((m) => {
                    const row = m as MonthlyRow & { txDays?: number };
                    const txDays = row.txDays ?? 0;
                    const avgLoads = txDays > 0 ? m.loads / txDays : 0;
                    const avgAmount = txDays > 0 ? m.amount / txDays : 0;
                    return (
                      <TableRow key={m.monthKey}>
                        <TableCell>{m.monthLabel}</TableCell>
                        <TableCell align="right">
                          {formatNumber(Math.round(m.loads))}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(m.amount)}
                        </TableCell>
                        <TableCell align="right">
                          {formatNumber(Number(avgLoads.toFixed(2)))}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(avgAmount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <BarChart
              title="SUM of Load vs. Month"
              yAxisLabel="Sum of Load"
              xAxisLabel="Month"
              points={monthlyChartPoints}
              height={300}
            />
          </Paper>
        </Stack>
      )}
    </Box>
  );
};

export default TransactionGraphSummary;
