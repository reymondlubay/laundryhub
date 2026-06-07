import React from "react";
import dayjs, { type Dayjs } from "dayjs";
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
import transactionService, { type Transaction } from "../../services/transactionService";
import addonsPricingService, {
  DEFAULT_ADDONS_PRICING,
  type AddonsPricing,
} from "../../services/addonsPricingService";
import expenseRecordService, {
  type ExpenseRecord,
} from "../../services/expenseRecordService";
import fixedMonthlyExpenseService, {
  getFixedMonthlyTotalForMonth,
  type FixedMonthlyExpense,
} from "../../services/fixedMonthlyExpenseService";
import {
  getTransactionAmountDue,
  getTransactionDiscount,
} from "../../utils/pricing";

const MONTHS_WINDOW = 24;

type TransactionLegacy = Transaction & {
  datereceived?: string;
  grandtotal?: number | string | null;
  loadsubtotal?: number | string | null;
  addonssubtotal?: number | string | null;
  isdeleted?: boolean;
};

const formatCurrency = (value: number): string =>
  `₱${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const toNumber = (value: unknown): number => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const getDateReceived = (transaction: Transaction): string | undefined => {
  const tx = transaction as TransactionLegacy;
  return transaction.dateReceived || tx.datereceived;
};

const getTransactionPrice = (
  transaction: Transaction,
  addonsPricing: AddonsPricing,
): number => {
  const tx = transaction as TransactionLegacy;
  return getTransactionAmountDue(
    {
      ...transaction,
      grandtotal: tx.grandtotal,
      loadsubtotal: tx.loadsubtotal,
      addonssubtotal: tx.addonssubtotal,
    },
    addonsPricing,
  );
};

type MonthlyPoint = {
  monthKey: string;
  monthLabel: string;
  grossSales: number;
  internalExpenses: number;
  netSales: number;
  /** Count of laundry transactions in this month (used to omit empty months). */
  transactionCount: number;
};

const buildMonthBuckets = (rangeStart: Dayjs): MonthlyPoint[] => {
  const months: MonthlyPoint[] = [];
  for (let i = 0; i < MONTHS_WINDOW; i++) {
    const m = rangeStart.add(i, "month");
    months.push({
      monthKey: m.format("YYYY-MM"),
      monthLabel: m.format("MMM YYYY"),
      grossSales: 0,
      internalExpenses: 0,
      netSales: 0,
      transactionCount: 0,
    });
  }
  return months;
};

const MultiSeriesLineChart: React.FC<{
  title: string;
  points: MonthlyPoint[];
  height?: number;
}> = ({ title, points, height = 380 }) => {
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const [pointer, setPointer] = React.useState<{
    clientX: number;
    clientY: number;
  } | null>(null);

  const padding = { top: 36, right: 24, bottom: 56, left: 64 };
  const w = 1000;
  const h = height;
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const { minY, maxY } = React.useMemo(() => {
    const vals: number[] = [0];
    for (const p of points) {
      vals.push(p.grossSales, p.internalExpenses, p.netSales);
    }
    const minRaw = Math.min(...vals);
    const maxRaw = Math.max(...vals);
    const pad = Math.max((maxRaw - minRaw) * 0.08, maxRaw * 0.04, 1);
    let min = minRaw - pad;
    let max = maxRaw + pad;
    if (minRaw >= 0 && min < 0) min = 0;
    if (max <= min) max = min + 1;
    return { minY: min, maxY: max };
  }, [points]);

  const xAt = (i: number) =>
    points.length <= 1
      ? padding.left + chartW / 2
      : padding.left + (chartW * i) / (points.length - 1);

  const yAt = (v: number) => {
    const t = (v - minY) / (maxY - minY);
    return padding.top + chartH * (1 - t);
  };

  const linePath = (values: number[]) =>
    values
      .map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`)
      .join(" ");

  const grossVals = points.map((p) => p.grossSales);
  const expVals = points.map((p) => p.internalExpenses);
  const netVals = points.map((p) => p.netSales);

  const series = [
    { key: "gross", label: "Total Sales (Gross)", color: "#5aa2ff", values: grossVals },
    {
      key: "exp",
      label: "Total Internal Expenses",
      color: "#f59e0b",
      values: expVals,
    },
    { key: "net", label: "Sales (Net)", color: "#34d399", values: netVals },
  ];

  const onSvgMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * w;
    if (relX < padding.left || relX > w - padding.right) {
      setHoverIdx(null);
      setPointer(null);
      return;
    }
    const t =
      points.length <= 1
        ? 0
        : (relX - padding.left) / chartW;
    const idx = Math.round(t * (points.length - 1));
    const clamped = Math.max(0, Math.min(points.length - 1, idx));
    setHoverIdx(clamped);
    setPointer({ clientX: e.clientX, clientY: e.clientY });
  };

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
          onMouseMove={onSvgMove}
          onMouseLeave={() => {
            setHoverIdx(null);
            setPointer(null);
          }}
        >
          <rect x={0} y={0} width={w} height={h} fill="#0f1318" />
          <text
            x={padding.left}
            y={24}
            fill="rgba(255,255,255,0.92)"
            fontSize="17"
            fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Arial"
            fontWeight={700}
          >
            {title}
          </text>

          {series.map((s, legIdx) => (
            <g
              key={s.key}
              transform={`translate(${w - 200}, ${padding.top + legIdx * 18})`}
            >
              <line x1={0} y1={6} x2={18} y2={6} stroke={s.color} strokeWidth={3} />
              <text
                x={24}
                y={10}
                fill="rgba(255,255,255,0.78)"
                fontSize="11"
                fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Arial"
              >
                {s.label}
              </text>
            </g>
          ))}

          {Array.from({ length: 5 }).map((_, i) => {
            const y = padding.top + (chartH / 4) * i;
            const v = minY + ((maxY - minY) * (4 - i)) / 4;
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
                  fill="rgba(255,255,255,0.55)"
                  fontSize="11"
                  textAnchor="end"
                  fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Arial"
                >
                  {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toLocaleString("en-US")}
                </text>
              </g>
            );
          })}

          {hoverIdx !== null ? (
            <line
              x1={xAt(hoverIdx)}
              x2={xAt(hoverIdx)}
              y1={padding.top}
              y2={padding.top + chartH}
              stroke="rgba(255,255,255,0.2)"
              strokeDasharray="4 4"
            />
          ) : null}

          {series.map((s) => (
            <path
              key={s.key}
              d={linePath(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth={2.4}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.95}
            />
          ))}

          {points.map((p, i) =>
            series.map((s) => (
              <circle
                key={`${p.monthKey}-${s.key}`}
                cx={xAt(i)}
                cy={yAt(s.values[i])}
                r={hoverIdx === i ? 5 : 3}
                fill={s.color}
                stroke="#0f1318"
                strokeWidth={1}
              />
            )),
          )}

          {points.map((p, i) => (
            <text
              key={`xl-${p.monthKey}`}
              x={xAt(i)}
              y={h - padding.bottom + 22}
              fill="rgba(255,255,255,0.65)"
              fontSize="10"
              textAnchor="middle"
              transform={`rotate(-40 ${xAt(i)} ${h - padding.bottom + 22})`}
              fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Arial"
            >
              {p.monthLabel}
            </text>
          ))}

          <text
            x={w / 2}
            y={h - 6}
            fill="rgba(255,255,255,0.5)"
            fontSize="11"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Arial"
          >
            Month
          </text>
          <text
            x={16}
            y={padding.top + chartH / 2}
            fill="rgba(255,255,255,0.5)"
            fontSize="11"
            textAnchor="middle"
            transform={`rotate(-90 16 ${padding.top + chartH / 2})`}
            fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Arial"
          >
            Amount (₱)
          </text>
        </svg>
      </Box>

      {hoverIdx !== null && pointer && points[hoverIdx] ? (
        <Box
          sx={{
            position: "fixed",
            left: pointer.clientX + 12,
            top: pointer.clientY + 12,
            zIndex: 2000,
            pointerEvents: "none",
            bgcolor: "rgba(15, 19, 24, 0.96)",
            color: "#f1f5f9",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 1,
            px: 1.25,
            py: 1,
            minWidth: 200,
            boxShadow: 3,
          }}
        >
          <Typography variant="caption" sx={{ display: "block", opacity: 0.75 }}>
            Month
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
            {points[hoverIdx].monthLabel}
          </Typography>
          <Typography variant="caption" sx={{ display: "block", opacity: 0.75, color: "#5aa2ff" }}>
            Total Sales (Gross)
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {formatCurrency(points[hoverIdx].grossSales)}
          </Typography>
          <Typography variant="caption" sx={{ display: "block", opacity: 0.75, color: "#f59e0b" }}>
            Total Internal Expenses
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {formatCurrency(points[hoverIdx].internalExpenses)}
          </Typography>
          <Typography variant="caption" sx={{ display: "block", opacity: 0.75, color: "#34d399" }}>
            Total Amount of Sales (Net)
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatCurrency(points[hoverIdx].netSales)}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
};

const SalesExpenseGraphReport: React.FC = () => {
  const rangeStart = React.useMemo(
    () => dayjs().startOf("month").subtract(MONTHS_WINDOW - 1, "month"),
    [],
  );
  const rangeEnd = React.useMemo(() => dayjs().endOf("month"), []);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [expenseRecords, setExpenseRecords] = React.useState<ExpenseRecord[]>(
    [],
  );
  const [addonsPricing, setAddonsPricing] = React.useState<AddonsPricing>(
    DEFAULT_ADDONS_PRICING,
  );
  const [fixedMonthlyItems, setFixedMonthlyItems] = React.useState<
    FixedMonthlyExpense[]
  >([]);
  const [fixedMonthlySnapshots, setFixedMonthlySnapshots] = React.useState<
    Record<string, number>
  >({});

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [txData, pricingData, records, fixedBundle] = await Promise.all([
          transactionService.getAll({
            fromDate: rangeStart.format("YYYY-MM-DD"),
            toDate: rangeEnd.format("YYYY-MM-DD"),
            includeDeleted: false,
          }),
          addonsPricingService.get(),
          expenseRecordService.getAll(),
          fixedMonthlyExpenseService.getAllWithSnapshots(),
        ]);
        setAddonsPricing(pricingData);
        setTransactions(
          txData.filter(
            (t) => !t.isDeleted && !(t as TransactionLegacy).isdeleted,
          ),
        );
        setExpenseRecords(records);
        setFixedMonthlyItems(fixedBundle.items);
        setFixedMonthlySnapshots(fixedBundle.monthSnapshots);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load sales and expense graph.",
        );
        setAddonsPricing(DEFAULT_ADDONS_PRICING);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [rangeEnd, rangeStart]);

  const monthlyPoints = React.useMemo<MonthlyPoint[]>(() => {
    const months = buildMonthBuckets(rangeStart);
    const index = new Map(months.map((m, i) => [m.monthKey, i]));

    for (const t of transactions) {
      const dateRaw = getDateReceived(t);
      if (!dateRaw) continue;
      const d = dayjs(dateRaw);
      if (!d.isValid()) continue;
      if (d.isBefore(rangeStart, "day") || d.isAfter(rangeEnd, "day")) continue;
      const key = d.format("YYYY-MM");
      const idx = index.get(key);
      if (idx === undefined) continue;
      months[idx].transactionCount += 1;
      months[idx].grossSales += getTransactionPrice(t, addonsPricing);
    }

    for (const r of expenseRecords) {
      if (r.isExternalUsage) continue;
      const dateRaw = typeof r.date === "string" ? r.date : "";
      if (!dateRaw) continue;
      const d = dayjs(dateRaw);
      if (!d.isValid()) continue;
      if (d.isBefore(rangeStart, "day") || d.isAfter(rangeEnd, "day")) continue;
      const key = d.format("YYYY-MM");
      const idx = index.get(key);
      if (idx === undefined) continue;
      months[idx].internalExpenses += r.amount == null ? 0 : toNumber(r.amount);
    }

    for (const m of months) {
      const fixedMonthlyTotal = getFixedMonthlyTotalForMonth(
        fixedMonthlyItems,
        m.monthKey,
        fixedMonthlySnapshots,
      );
      if (fixedMonthlyTotal > 0) {
        m.internalExpenses += fixedMonthlyTotal;
      }
    }

    for (const m of months) {
      m.netSales = m.grossSales - m.internalExpenses;
    }

    return months.filter((m) => m.transactionCount > 0);
  }, [
    addonsPricing,
    expenseRecords,
    fixedMonthlyItems,
    fixedMonthlySnapshots,
    rangeEnd,
    rangeStart,
    transactions,
  ]);

  const totals24m = React.useMemo(
    () => ({
      gross: monthlyPoints.reduce((s, p) => s + p.grossSales, 0),
      expenses: monthlyPoints.reduce((s, p) => s + p.internalExpenses, 0),
      net: monthlyPoints.reduce((s, p) => s + p.netSales, 0),
    }),
    [monthlyPoints],
  );

  const totalDiscountPeriod = React.useMemo(() => {
    let sum = 0;
    for (const t of transactions) {
      const dateRaw = getDateReceived(t);
      if (!dateRaw) continue;
      const d = dayjs(dateRaw);
      if (!d.isValid()) continue;
      if (d.isBefore(rangeStart, "day") || d.isAfter(rangeEnd, "day")) continue;
      sum += getTransactionDiscount(t);
    }
    return sum;
  }, [rangeEnd, rangeStart, transactions]);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Sales & Expense Graph
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Rolling window up to {MONTHS_WINDOW} months ({rangeStart.format("MMM YYYY")} –{" "}
          {rangeEnd.format("MMM YYYY")}), showing only months with at least one
          laundry transaction. Gross sales and net match the Sales Report: gross
          is transaction price (including add-ons), internal expenses include
          recorded internal items plus active fixed monthly amounts from Settings
          (once per shown month), and net is gross minus that total.
        </Typography>
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
      ) : monthlyPoints.length === 0 ? (
        <Alert severity="info">
          No months in this range have any laundry transactions yet.
        </Alert>
      ) : (
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <MultiSeriesLineChart
              title="Sales vs. internal expenses by month"
              points={monthlyPoints}
            />
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>
              Monthly totals ({monthlyPoints.length} month
              {monthlyPoints.length === 1 ? "" : "s"} with transactions)
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Month</TableCell>
                    <TableCell align="right">
                      Total Sales (Net of Discount)
                    </TableCell>
                    <TableCell align="right">Total Internal Expenses</TableCell>
                    <TableCell align="right">Sales (Net)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...monthlyPoints].reverse().map((m) => (
                    <TableRow key={m.monthKey}>
                      <TableCell>{m.monthLabel}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(m.grossSales)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(m.internalExpenses)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatCurrency(m.netSales)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Period totals</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      {formatCurrency(totals24m.gross)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      {formatCurrency(totals24m.expenses)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      {formatCurrency(totals24m.net)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            <Typography sx={{ mt: 1.5, fontWeight: 700, color: "#f44336" }}>
              Total Discount (period) - {formatCurrency(totalDiscountPeriod)}
            </Typography>
          </Paper>
        </Stack>
      )}
    </Box>
  );
};

export default SalesExpenseGraphReport;
