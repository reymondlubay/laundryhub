import React from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import transactionService, {
  type PaymentDetail,
  type Transaction,
} from "../../services/transactionService";
import { toPascalCase } from "../../utils/stringUtils";
import ReportBarChart from "../../components/ReportBarChart/ReportBarChart";

type PaymentWithLegacy = PaymentDetail & {
  paymentdate?: string;
};

type CollectionPaymentRow = {
  id: string;
  transactionId: string;
  customerName: string;
  paymentDate: string;
  mode: string;
  amount: number;
};

type ModeTotals = {
  cash: number;
  gcash: number;
  total: number;
};

const toNumber = (value: unknown): number => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const formatCurrency = (value: number): string =>
  `₱${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const normalizeRange = (from: Dayjs, to: Dayjs): { from: Dayjs; to: Dayjs } => {
  if (from.isAfter(to)) return { from: to, to: from };
  return { from, to };
};

const getPaymentDate = (payment: PaymentDetail): string | undefined => {
  const p = payment as PaymentWithLegacy;
  return payment.paymentDate || p.paymentdate;
};

const isWithinRange = (
  dateValue: string | undefined,
  from: Dayjs,
  to: Dayjs,
): boolean => {
  if (!dateValue) return false;
  const date = dayjs(dateValue);
  if (!date.isValid()) return false;
  return (
    !date.isBefore(from.startOf("day")) && !date.isAfter(to.endOf("day"))
  );
};

const isGcashMode = (mode: string): boolean =>
  mode.trim().toLowerCase() === "gcash";

const sumModeTotals = (rows: CollectionPaymentRow[]): ModeTotals => {
  return rows.reduce<ModeTotals>(
    (acc, row) => {
      acc.total += row.amount;
      if (isGcashMode(row.mode)) {
        acc.gcash += row.amount;
      } else {
        acc.cash += row.amount;
      }
      return acc;
    },
    { cash: 0, gcash: 0, total: 0 },
  );
};

const flattenPayments = (transactions: Transaction[]): CollectionPaymentRow[] => {
  const rows: CollectionPaymentRow[] = [];

  for (const transaction of transactions) {
    if (transaction.isDeleted) continue;

    const customerName = toPascalCase(transaction.customer?.name || "Unknown");

    for (const payment of transaction.paymentDetails || []) {
      const paymentDate = getPaymentDate(payment);
      if (!paymentDate) continue;

      rows.push({
        id: payment.id,
        transactionId: transaction.id,
        customerName,
        paymentDate,
        mode: String(payment.mode || "Cash"),
        amount: toNumber(payment.amount),
      });
    }
  }

  return rows;
};

const comparePaymentDateDesc = (a: CollectionPaymentRow, b: CollectionPaymentRow) =>
  dayjs(b.paymentDate).valueOf() - dayjs(a.paymentDate).valueOf();

const TotalsBlock: React.FC<{ label: string; totals: ModeTotals }> = ({
  label,
  totals,
}) => (
  <Box sx={{ mt: 2 }}>
    <Typography sx={{ fontWeight: 700, mb: 1 }}>{label}</Typography>
    <Typography>Total Payment Cash — {formatCurrency(totals.cash)}</Typography>
    <Typography>Total Payment Gcash — {formatCurrency(totals.gcash)}</Typography>
    <Typography sx={{ fontWeight: 700 }}>
      Grand Total — {formatCurrency(totals.total)}
    </Typography>
  </Box>
);

const CollectionReport: React.FC = () => {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [dateFrom, setDateFrom] = React.useState<Dayjs>(() => dayjs());
  const [dateTo, setDateTo] = React.useState<Dayjs>(() => dayjs());
  const [collectionMonth, setCollectionMonth] = React.useState<Dayjs>(() =>
    dayjs().startOf("month"),
  );

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);

  React.useEffect(() => {
    setPage(0);
  }, [dateFrom, dateTo]);

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await transactionService.getAll();
        setTransactions(data);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load collection data.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const allPayments = React.useMemo(
    () => flattenPayments(transactions),
    [transactions],
  );

  const rangePayments = React.useMemo(() => {
    const range = normalizeRange(dateFrom, dateTo);
    return allPayments
      .filter((row) => isWithinRange(row.paymentDate, range.from, range.to))
      .sort(comparePaymentDateDesc);
  }, [allPayments, dateFrom, dateTo]);

  const rangeTotals = React.useMemo(
    () => sumModeTotals(rangePayments),
    [rangePayments],
  );

  const paginatedRangePayments = React.useMemo(
    () =>
      rangePayments.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage,
      ),
    [rangePayments, page, rowsPerPage],
  );

  const monthStart = collectionMonth.startOf("month");
  const monthEnd = collectionMonth.endOf("month");

  const monthPayments = React.useMemo(
    () =>
      allPayments.filter((row) =>
        isWithinRange(row.paymentDate, monthStart, monthEnd),
      ),
    [allPayments, monthStart, monthEnd],
  );

  const monthTotals = React.useMemo(
    () => sumModeTotals(monthPayments),
    [monthPayments],
  );

  const dailyRows = React.useMemo(() => {
    const days = collectionMonth.daysInMonth();
    const rows: Array<{
      dateKey: string;
      label: string;
      cash: number;
      gcash: number;
      total: number;
    }> = [];

    for (let d = 1; d <= days; d++) {
      const day = collectionMonth.date(d);
      const dateKey = day.format("YYYY-MM-DD");
      const dayPayments = monthPayments.filter(
        (p) => dayjs(p.paymentDate).format("YYYY-MM-DD") === dateKey,
      );
      const totals = sumModeTotals(dayPayments);
      rows.push({
        dateKey,
        label: day.format("MM/DD"),
        cash: totals.cash,
        gcash: totals.gcash,
        total: totals.total,
      });
    }

    return rows;
  }, [collectionMonth, monthPayments]);

  const dailyChartPoints = React.useMemo(
    () =>
      dailyRows.map((row) => ({
        label: row.label,
        value: row.total,
        tooltipTitle: dayjs(row.dateKey).format("MMM D, YYYY"),
        tooltipLines: [
          `Cash: ${formatCurrency(row.cash)}`,
          `Gcash: ${formatCurrency(row.gcash)}`,
        ],
      })),
    [dailyRows],
  );

  const monthlyChartPoints = React.useMemo(() => {
    const points: Array<{
      monthKey: string;
      label: string;
      cash: number;
      gcash: number;
      total: number;
    }> = [];

    for (let i = 11; i >= 0; i--) {
      const month = collectionMonth.subtract(i, "month").startOf("month");
      const from = month.startOf("month");
      const to = month.endOf("month");
      const rows = allPayments.filter((p) =>
        isWithinRange(p.paymentDate, from, to),
      );
      const totals = sumModeTotals(rows);
      points.push({
        monthKey: month.format("YYYY-MM"),
        label: month.format("MMM YY"),
        cash: totals.cash,
        gcash: totals.gcash,
        total: totals.total,
      });
    }

    return points;
  }, [allPayments, collectionMonth]);

  const monthlyChartForDisplay = React.useMemo(
    () =>
      monthlyChartPoints.map((row) => ({
        label: row.label,
        value: row.total,
        tooltipTitle: dayjs(row.monthKey).format("MMMM YYYY"),
        tooltipLines: [
          `Cash: ${formatCurrency(row.cash)}`,
          `Gcash: ${formatCurrency(row.gcash)}`,
        ],
      })),
    [monthlyChartPoints],
  );

  const fromText = dateFrom.format("MM-DD-YYYY");
  const toText = dateTo.format("MM-DD-YYYY");
  const monthLabel = collectionMonth.format("MMMM YYYY");

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Collection Report
      </Typography>

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
        <Stack spacing={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
              Payments in range
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Date From"
                    value={dateFrom}
                    onChange={(value) => setDateFrom(value || dayjs())}
                    maxDate={dateTo}
                    slotProps={{ textField: { size: "small", fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Date To"
                    value={dateTo}
                    onChange={(value) => setDateTo(value || dayjs())}
                    minDate={dateFrom}
                    maxDate={dayjs()}
                    slotProps={{ textField: { size: "small", fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
            </Grid>

            <TableContainer sx={{ maxHeight: 420 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell>Date paid</TableCell>
                    <TableCell>Mode</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rangePayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No payments found for {fromText} – {toText}.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRangePayments.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.customerName}</TableCell>
                        <TableCell>
                          {dayjs(row.paymentDate).format("MM-DD-YY h:mm A")}
                        </TableCell>
                        <TableCell>{row.mode}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(row.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[25, 50, 100]}
              count={rangePayments.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />

            <Divider sx={{ my: 2 }} />
            <TotalsBlock
              label={`Total collections (${fromText} – ${toText})`}
              totals={rangeTotals}
            />
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={2}
              sx={{ mb: 2 }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Daily payment collection
              </Typography>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Month"
                  views={["year", "month"]}
                  openTo="month"
                  value={collectionMonth}
                  onChange={(value) =>
                    setCollectionMonth(
                      value ? value.startOf("month") : dayjs().startOf("month"),
                    )
                  }
                  slotProps={{
                    textField: { size: "small", sx: { minWidth: 200 } },
                  }}
                />
              </LocalizationProvider>
            </Stack>

            <TableContainer sx={{ maxHeight: 360, mb: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Cash</TableCell>
                    <TableCell align="right">Gcash</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dailyRows
                    .filter((row) => row.total > 0)
                    .map((row) => (
                      <TableRow key={row.dateKey}>
                        <TableCell>
                          {dayjs(row.dateKey).format("MM-DD-YYYY")}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(row.cash)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(row.gcash)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(row.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  {dailyRows.every((row) => row.total <= 0) ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No collections in {monthLabel}.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>

            <TotalsBlock
              label={`Daily collection total (${monthLabel})`}
              totals={monthTotals}
            />

            <Box sx={{ mt: 3 }}>
              <ReportBarChart
                title={`Daily collections — ${monthLabel}`}
                yAxisLabel="₱"
                points={dailyChartPoints}
                formatValue={(v) =>
                  v.toLocaleString("en-US", { maximumFractionDigits: 0 })
                }
              />
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Monthly payment collection
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Uses the same month filter above. Chart shows the last 12 months;
              totals below are for {monthLabel}.
            </Typography>

            <TableContainer sx={{ maxHeight: 280, mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Month</TableCell>
                    <TableCell align="right">Cash</TableCell>
                    <TableCell align="right">Gcash</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {monthlyChartPoints.map((row) => (
                    <TableRow
                      key={row.monthKey}
                      selected={row.monthKey === collectionMonth.format("YYYY-MM")}
                      sx={
                        row.monthKey === collectionMonth.format("YYYY-MM")
                          ? { bgcolor: "action.selected" }
                          : undefined
                      }
                    >
                      <TableCell>
                        {dayjs(row.monthKey).format("MMMM YYYY")}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(row.cash)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(row.gcash)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(row.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TotalsBlock
              label={`Monthly collection total (${monthLabel})`}
              totals={monthTotals}
            />

            <Box sx={{ mt: 3 }}>
              <ReportBarChart
                title="Monthly collections (last 12 months)"
                yAxisLabel="₱"
                points={monthlyChartForDisplay}
                formatValue={(v) =>
                  v.toLocaleString("en-US", { maximumFractionDigits: 0 })
                }
              />
            </Box>
          </Paper>
        </Stack>
      )}
    </Box>
  );
};

export default CollectionReport;
