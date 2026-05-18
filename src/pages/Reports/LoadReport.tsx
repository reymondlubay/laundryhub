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
  TableRow,
  Typography,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import transactionService, { type Transaction } from "../../services/transactionService";
import ReportBarChart from "../../components/ReportBarChart/ReportBarChart";
import {
  filterTransactionsByDateLoaded,
  formatCount,
  formatKg,
  formatKgWithAvg,
  getDateLoaded,
  hasLoadActivity,
  sumLoadByType,
  type LoadTypeTotals,
} from "../../utils/loadReport";

type DailyLoadRow = LoadTypeTotals & {
  dateKey: string;
  label: string;
};

type MonthlyLoadRow = LoadTypeTotals & {
  monthKey: string;
  label: string;
};

const stickyHeadCellSx = {
  fontWeight: 700,
  bgcolor: "background.paper",
  borderBottom: 1,
  borderColor: "divider",
} as const;

const LoadMetricsTableHead: React.FC<{ periodLabel: string }> = ({
  periodLabel,
}) => (
  <TableHead>
    <TableRow>
      <TableCell sx={stickyHeadCellSx}>{periodLabel}</TableCell>
      <TableCell align="right" sx={stickyHeadCellSx}>
        Clothes Loads
      </TableCell>
      <TableCell align="right" sx={stickyHeadCellSx}>
        Clothes KG
      </TableCell>
      <TableCell align="right" sx={stickyHeadCellSx}>
        Beddings Loads
      </TableCell>
      <TableCell align="right" sx={stickyHeadCellSx}>
        Beddings KG
      </TableCell>
      <TableCell align="right" sx={stickyHeadCellSx}>
        Comforter
      </TableCell>
      <TableCell align="right" sx={stickyHeadCellSx}>
        Total KG
      </TableCell>
      <TableCell align="right" sx={stickyHeadCellSx}>
        Total Loads
      </TableCell>
    </TableRow>
  </TableHead>
);

const LoadSummaryBlock: React.FC<{
  label: string;
  totals: LoadTypeTotals;
}> = ({ label, totals }) => (
  <Box sx={{ mt: 2 }}>
    <Typography sx={{ fontWeight: 700, mb: 1 }}>{label}</Typography>
    <Typography sx={{ fontWeight: 700 }}>
      Total Loads — {formatCount(totals.totalLoads)}
    </Typography>
    <Typography sx={{ fontWeight: 700 }}>
      {formatKgWithAvg(
        "Total Clothes KG",
        totals.clothesKg,
        totals.clothesLoads,
        totals.clothesAvgKg,
      )}
    </Typography>
    <Typography sx={{ fontWeight: 700 }}>
      {formatKgWithAvg(
        "Total Beddings KG",
        totals.beddingsKg,
        totals.beddingsLoads,
        totals.beddingsAvgKg,
      )}
    </Typography>
    <Typography sx={{ fontWeight: 700 }}>
      Total Comforter — {formatCount(totals.comforterLoads)}
    </Typography>
    <Typography sx={{ fontWeight: 700 }}>
      {formatKgWithAvg(
        "Total KG Load",
        totals.totalKgLoad,
        totals.totalKgLoads,
        totals.totalKgLoadAvg,
      )}
    </Typography>
  </Box>
);

const LoadReport: React.FC = () => {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [dateFrom, setDateFrom] = React.useState<Dayjs>(() => dayjs());
  const [dateTo, setDateTo] = React.useState<Dayjs>(() => dayjs());
  const [loadMonth, setLoadMonth] = React.useState<Dayjs>(() =>
    dayjs().startOf("month"),
  );

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await transactionService.getAll();
        setTransactions(data.filter((t) => !t.isDeleted));
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load report data.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const rangeTransactions = React.useMemo(
    () => filterTransactionsByDateLoaded(transactions, dateFrom, dateTo),
    [transactions, dateFrom, dateTo],
  );

  const rangeTotals = React.useMemo(
    () => sumLoadByType(rangeTransactions),
    [rangeTransactions],
  );

  const monthStart = loadMonth.startOf("month");
  const monthEnd = loadMonth.endOf("month");
  const monthLabel = loadMonth.format("MMMM YYYY");

  const monthTransactions = React.useMemo(
    () => filterTransactionsByDateLoaded(transactions, monthStart, monthEnd),
    [transactions, monthStart, monthEnd],
  );

  const monthTotals = React.useMemo(
    () => sumLoadByType(monthTransactions),
    [monthTransactions],
  );

  const dailyRows = React.useMemo(() => {
    const days = loadMonth.daysInMonth();
    const rows: DailyLoadRow[] = [];

    for (let d = 1; d <= days; d++) {
      const day = loadMonth.date(d);
      const dateKey = day.format("YYYY-MM-DD");
      const dayTx = monthTransactions.filter(
        (t) => dayjs(getDateLoaded(t)).format("YYYY-MM-DD") === dateKey,
      );
      const totals = sumLoadByType(dayTx);
      rows.push({
        dateKey,
        label: day.format("MM/DD"),
        ...totals,
      });
    }

    return rows;
  }, [loadMonth, monthTransactions]);

  const dailyRowsWithData = React.useMemo(
    () => dailyRows.filter((row) => hasLoadActivity(row)),
    [dailyRows],
  );

  const dailyChartPoints = React.useMemo(
    () =>
      dailyRowsWithData.map((row) => ({
        label: row.label,
        value: row.totalLoads,
        tooltipTitle: dayjs(row.dateKey).format("MMM D, YYYY"),
        tooltipLines: [
          `Clothes: ${formatCount(row.clothesLoads)} loads, ${formatKg(row.clothesKg)} kg`,
          `Beddings: ${formatCount(row.beddingsLoads)} loads, ${formatKg(row.beddingsKg)} kg`,
          `Comforter: ${formatCount(row.comforterLoads)}`,
          `Total KG: ${formatKg(row.totalKgLoad)}`,
        ],
      })),
    [dailyRowsWithData],
  );

  const monthlyRows = React.useMemo(() => {
    const rows: MonthlyLoadRow[] = [];

    for (let i = 11; i >= 0; i--) {
      const month = loadMonth.subtract(i, "month").startOf("month");
      const from = month.startOf("month");
      const to = month.endOf("month");
      const monthTx = filterTransactionsByDateLoaded(transactions, from, to);
      const totals = sumLoadByType(monthTx);
      rows.push({
        monthKey: month.format("YYYY-MM"),
        label: month.format("MMM YY"),
        ...totals,
      });
    }

    return rows;
  }, [loadMonth, transactions]);

  const monthlyRowsWithData = React.useMemo(
    () => monthlyRows.filter((row) => hasLoadActivity(row)),
    [monthlyRows],
  );

  const monthlyChartPoints = React.useMemo(
    () =>
      monthlyRowsWithData.map((row) => ({
        label: row.label,
        value: row.totalLoads,
        tooltipTitle: dayjs(row.monthKey).format("MMMM YYYY"),
        tooltipLines: [
          `Clothes: ${formatCount(row.clothesLoads)} loads, ${formatKg(row.clothesKg)} kg`,
          `Beddings: ${formatCount(row.beddingsLoads)} loads, ${formatKg(row.beddingsKg)} kg`,
          `Comforter: ${formatCount(row.comforterLoads)}`,
          `Total KG: ${formatKg(row.totalKgLoad)}`,
        ],
      })),
    [monthlyRowsWithData],
  );

  const fromText = dateFrom.format("MM-DD-YYYY");
  const toText = dateTo.format("MM-DD-YYYY");

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Load Report
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
              Date loaded range
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Date Loaded From"
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
                    label="Date Loaded To"
                    value={dateTo}
                    onChange={(value) => setDateTo(value || dayjs())}
                    minDate={dateFrom}
                    maxDate={dayjs()}
                    slotProps={{ textField: { size: "small", fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
            </Grid>

            <Divider sx={{ my: 1 }} />
            <LoadSummaryBlock
              label={`Summary (${fromText} – ${toText})`}
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
                Daily loads
              </Typography>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Month"
                  views={["year", "month"]}
                  openTo="month"
                  value={loadMonth}
                  onChange={(value) =>
                    setLoadMonth(
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
                <LoadMetricsTableHead periodLabel="Date" />
                <TableBody>
                  {dailyRowsWithData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No loads in {monthLabel}.
                      </TableCell>
                    </TableRow>
                  ) : (
                    dailyRowsWithData.map((row) => (
                      <TableRow key={row.dateKey}>
                        <TableCell>
                          {dayjs(row.dateKey).format("MM-DD-YYYY")}
                        </TableCell>
                        <TableCell align="right">
                          {formatCount(row.clothesLoads)}
                        </TableCell>
                        <TableCell align="right">
                          {formatKg(row.clothesKg)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCount(row.beddingsLoads)}
                        </TableCell>
                        <TableCell align="right">
                          {formatKg(row.beddingsKg)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCount(row.comforterLoads)}
                        </TableCell>
                        <TableCell align="right">
                          {formatKg(row.totalKgLoad)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCount(row.totalLoads)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <LoadSummaryBlock
              label={`Daily loads total (${monthLabel})`}
              totals={monthTotals}
            />

            {dailyChartPoints.length > 0 ? (
              <Box sx={{ mt: 3 }}>
                <ReportBarChart
                  title={`Daily loads — ${monthLabel}`}
                  yAxisLabel="Loads"
                  points={dailyChartPoints}
                  formatValue={(v) => formatCount(v)}
                />
              </Box>
            ) : null}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={2}
              sx={{ mb: 2 }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Monthly loads
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Uses the same month filter above. Chart shows the last 12 months
                  with load data only.
                </Typography>
              </Box>
            </Stack>

            <TableContainer sx={{ maxHeight: 360, mb: 2 }}>
              <Table size="small" stickyHeader>
                <LoadMetricsTableHead periodLabel="Month" />
                <TableBody>
                  {monthlyRows.map((row) => (
                    <TableRow
                      key={row.monthKey}
                      selected={row.monthKey === loadMonth.format("YYYY-MM")}
                      sx={
                        row.monthKey === loadMonth.format("YYYY-MM")
                          ? { bgcolor: "action.selected" }
                          : undefined
                      }
                    >
                      <TableCell>
                        {dayjs(row.monthKey).format("MMMM YYYY")}
                      </TableCell>
                      <TableCell align="right">
                        {formatCount(row.clothesLoads)}
                      </TableCell>
                      <TableCell align="right">
                        {formatKg(row.clothesKg)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCount(row.beddingsLoads)}
                      </TableCell>
                      <TableCell align="right">
                        {formatKg(row.beddingsKg)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCount(row.comforterLoads)}
                      </TableCell>
                      <TableCell align="right">
                        {formatKg(row.totalKgLoad)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCount(row.totalLoads)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <LoadSummaryBlock
              label={`Monthly loads total (${monthLabel})`}
              totals={monthTotals}
            />

            {monthlyChartPoints.length > 0 ? (
              <Box sx={{ mt: 3 }}>
                <ReportBarChart
                  title="Monthly loads (last 12 months)"
                  yAxisLabel="Loads"
                  points={monthlyChartPoints}
                  formatValue={(v) => formatCount(v)}
                />
              </Box>
            ) : null}
          </Paper>
        </Stack>
      )}
    </Box>
  );
};

export default LoadReport;
