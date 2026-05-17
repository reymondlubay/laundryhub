import React from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
  Alert,
  Autocomplete,
  Box,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import inventoryItemService, {
  type InventoryItem,
} from "../../services/inventoryItemService";
import expenseItemService, {
  type ExpenseItem,
} from "../../services/expenseItemService";
import expenseRecordService, {
  type ExpenseRecord,
} from "../../services/expenseRecordService";

type FilterOption = {
  key: string;
  type: "inventory" | "expense";
  id: string;
  label: string;
};

type ReportRow = {
  id: string;
  expenseName: string;
  source: "inventory" | "expense";
  pieces: number | null;
  amount: number;
  notes: string;
  date: string;
  createdAt: string;
};

type UsageTypeFilter = "all" | "internal" | "external";

type ConsolidatedRow = {
  expenseName: string;
  totalPieces: number;
  totalAmount: number;
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return "-";
  const d = dayjs(value);
  return d.isValid() ? d.format("MM-DD-YY h:mm A") : "-";
};

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

const normalizeRange = (from: Dayjs, to: Dayjs): { from: Dayjs; to: Dayjs } => {
  if (from.isAfter(to)) return { from: to, to: from };
  return { from, to };
};

const sameOrAfter = (value: Dayjs, from: Dayjs) =>
  value.isSame(from.startOf("day")) || value.isAfter(from.startOf("day"));

const sameOrBefore = (value: Dayjs, to: Dayjs) =>
  value.isSame(to.endOf("day")) || value.isBefore(to.endOf("day"));

const isWithinRange = (dateValue: string | undefined, from: Dayjs, to: Dayjs) => {
  if (!dateValue) return false;
  const date = dayjs(dateValue);
  if (!date.isValid()) return false;
  return sameOrAfter(date, from) && sameOrBefore(date, to);
};

/**
 * Backdated = expense calendar day is strictly before the day the row was created.
 * Time-of-day on the expense timestamp is ignored for this rule.
 */
const isBackdatedByPastDateOnly = (
  expenseDateRaw: string,
  createdAtRaw: string,
): boolean => {
  const expenseAt = dayjs(expenseDateRaw);
  const recordedAt = dayjs(createdAtRaw);
  if (!expenseAt.isValid() || !recordedAt.isValid()) return false;
  return expenseAt.startOf("day").isBefore(recordedAt.startOf("day"));
};

const recordToReportRow = (
  r: ExpenseRecord,
  inventoryItemById: Map<string, InventoryItem>,
  expenseItemById: Map<string, ExpenseItem>,
): ReportRow => {
  let expenseName = "-";
  if (r.source === "inventory" && r.inventoryItemId) {
    const item = inventoryItemById.get(r.inventoryItemId);
    expenseName = `[Inventory] ${item?.name || "Unknown Item"}`;
  } else if (r.source === "expense" && r.expenseItemId) {
    const item = expenseItemById.get(r.expenseItemId);
    expenseName = `[Expense] ${item?.name || "Unknown Item"}`;
  }

  return {
    id: r.id,
    expenseName,
    source: r.source,
    pieces: r.pieces == null ? null : Number(r.pieces),
    amount: r.amount == null ? 0 : Number(r.amount),
    notes: r.notes || "",
    date: r.date ?? "",
    createdAt: r.createdAt ?? "",
  };
};

const ExpensesReport: React.FC = () => {
  const [inventoryItems, setInventoryItems] = React.useState<InventoryItem[]>(
    [],
  );
  const [expenseItems, setExpenseItems] = React.useState<ExpenseItem[]>([]);
  const [records, setRecords] = React.useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [selectedOption, setSelectedOption] =
    React.useState<FilterOption | null>(null);
  const [dateFrom, setDateFrom] = React.useState<Dayjs>(
    dayjs().subtract(1, "month"),
  );
  const [dateTo, setDateTo] = React.useState<Dayjs>(dayjs());
  const [usageType, setUsageType] = React.useState<UsageTypeFilter>("internal");

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [invItems, expItems, expRecords] = await Promise.all([
          inventoryItemService.getAllForLookup(),
          expenseItemService.getAllForLookup(),
          expenseRecordService.getAll(),
        ]);
        setInventoryItems(invItems);
        setExpenseItems(expItems);
        setRecords(expRecords);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load expenses report.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const inventoryItemById = React.useMemo(() => {
    const map = new Map<string, InventoryItem>();
    inventoryItems.forEach((i) => map.set(i.id, i));
    return map;
  }, [inventoryItems]);

  const expenseItemById = React.useMemo(() => {
    const map = new Map<string, ExpenseItem>();
    expenseItems.forEach((i) => map.set(i.id, i));
    return map;
  }, [expenseItems]);

  const filterOptions = React.useMemo<FilterOption[]>(() => {
    const inv: FilterOption[] = inventoryItems.map((it) => ({
      key: `inventory:${it.id}`,
      type: "inventory",
      id: it.id,
      label: `[Inventory] ${it.name || ""}`,
    }));
    const exp: FilterOption[] = expenseItems.map((it) => ({
      key: `expense:${it.id}`,
      type: "expense",
      id: it.id,
      label: `[Expense] ${it.name || ""}`,
    }));
    return [...inv, ...exp].sort((a, b) => a.label.localeCompare(b.label));
  }, [inventoryItems, expenseItems]);

  const reportRows = React.useMemo<ReportRow[]>(() => {
    const range = normalizeRange(dateFrom, dateTo);

    const inRange = records.filter((r) => isWithinRange(r.date, range.from, range.to));

    const byType =
      usageType === "internal"
        ? inRange.filter((r) => !r.isExternalUsage)
        : usageType === "external"
          ? inRange.filter((r) => Boolean(r.isExternalUsage))
          : inRange;

    const byItem = selectedOption
      ? byType.filter((r) => {
          if (selectedOption.type === "inventory") {
            return (
              r.source === "inventory" && r.inventoryItemId === selectedOption.id
            );
          }
          return (
            r.source === "expense" && r.expenseItemId === selectedOption.id
          );
        })
      : byType;

    const rows: ReportRow[] = byItem.map((r) =>
      recordToReportRow(r, inventoryItemById, expenseItemById),
    );

    rows.sort((a, b) => {
      const ta = dayjs(a.date).isValid() ? dayjs(a.date).valueOf() : 0;
      const tb = dayjs(b.date).isValid() ? dayjs(b.date).valueOf() : 0;
      if (ta !== tb) return tb - ta;
      return a.expenseName.localeCompare(b.expenseName);
    });

    return rows;
  }, [
    dateFrom,
    dateTo,
    records,
    selectedOption,
    usageType,
    inventoryItemById,
    expenseItemById,
  ]);

  const totalAmount = React.useMemo(() => {
    return reportRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  }, [reportRows]);

  const consolidatedRows = React.useMemo<ConsolidatedRow[]>(() => {
    const map = new Map<string, { pieces: number; amount: number }>();
    for (const row of reportRows) {
      const key = row.expenseName;
      const prev = map.get(key) ?? { pieces: 0, amount: 0 };
      map.set(key, {
        pieces: prev.pieces + (row.pieces ?? 0),
        amount: prev.amount + row.amount,
      });
    }
    return Array.from(map.entries())
      .map(([expenseName, agg]) => ({
        expenseName,
        totalPieces: agg.pieces,
        totalAmount: agg.amount,
      }))
      .sort((a, b) => a.expenseName.localeCompare(b.expenseName));
  }, [reportRows]);

  const backdatedRows = React.useMemo(() => {
    const range = normalizeRange(dateFrom, dateTo);

    const createdInRange = records.filter((r) =>
      isWithinRange(r.createdAt ?? "", range.from, range.to),
    );

    const scoped = selectedOption
      ? createdInRange.filter((r) => {
          if (selectedOption.type === "inventory") {
            return (
              r.source === "inventory" && r.inventoryItemId === selectedOption.id
            );
          }
          return (
            r.source === "expense" && r.expenseItemId === selectedOption.id
          );
        })
      : createdInRange;

    const rows = scoped
      .map((r) => recordToReportRow(r, inventoryItemById, expenseItemById))
      .filter((row) => isBackdatedByPastDateOnly(row.date, row.createdAt));

    rows.sort((a, b) => {
      const ta = dayjs(a.date).isValid() ? dayjs(a.date).valueOf() : 0;
      const tb = dayjs(b.date).isValid() ? dayjs(b.date).valueOf() : 0;
      if (ta !== tb) return tb - ta;
      return a.expenseName.localeCompare(b.expenseName);
    });

    return rows;
  }, [
    records,
    dateFrom,
    dateTo,
    selectedOption,
    inventoryItemById,
    expenseItemById,
  ]);

  const consolidatedTotals = React.useMemo(() => {
    return consolidatedRows.reduce(
      (acc, row) => ({
        pieces: acc.pieces + row.totalPieces,
        amount: acc.amount + row.totalAmount,
      }),
      { pieces: 0, amount: 0 },
    );
  }, [consolidatedRows]);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Expenses Report
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Autocomplete
              size="small"
              options={filterOptions}
              value={selectedOption}
              onChange={(_, value) => setSelectedOption(value)}
              isOptionEqualToValue={(option, value) => option.key === value.key}
              getOptionLabel={(option) => option.label || ""}
              groupBy={(option) =>
                option.type === "inventory" ? "Inventory" : "Expense"
              }
              renderInput={(params) => (
                <TextField {...params} label="Item Filter" />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Date From"
                value={dateFrom}
                onChange={(value) =>
                  setDateFrom(value || dayjs().subtract(1, "month"))
                }
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Date To"
                value={dateTo}
                onChange={(value) => setDateTo(value || dayjs())}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl size="small" fullWidth>
              <InputLabel id="expenses-report-type-label">Type</InputLabel>
              <Select
                labelId="expenses-report-type-label"
                label="Type"
                value={usageType}
                onChange={(e) => setUsageType(e.target.value as UsageTypeFilter)}
              >
                <MenuItem value="internal">Internal</MenuItem>
                <MenuItem value="external">External</MenuItem>
                <MenuItem value="all">All</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ py: 5, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={3}>
          <Paper sx={{ p: 2 }}>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Expense Name</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell align="right">Pieces</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.expenseName}</TableCell>
                        <TableCell>{formatDateTime(row.date)}</TableCell>
                        <TableCell>
                          {row.source === "inventory" ? "Inventory" : "Expense"}
                        </TableCell>
                        <TableCell align="right">
                          {row.pieces == null ? "" : row.pieces}
                        </TableCell>
                        <TableCell align="right">
                          {currency.format(row.amount)}
                        </TableCell>
                        <TableCell>{row.notes || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box
              sx={{
                mt: 2,
                display: "flex",
                justifyContent: "flex-end",
                gap: 3,
                flexWrap: "wrap",
              }}
            >
              <Typography sx={{ fontWeight: 700 }}>
                Total Amount: {currency.format(totalAmount)}
              </Typography>
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
              Consolidated Expenses
            </Typography>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Expense name</TableCell>
                    <TableCell align="right">Pieces</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {consolidatedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        No records to consolidate.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {consolidatedRows.map((row) => (
                        <TableRow key={row.expenseName}>
                          <TableCell>{row.expenseName}</TableCell>
                          <TableCell align="right">
                            {row.totalPieces === 0 ? "" : row.totalPieces}
                          </TableCell>
                          <TableCell align="right">
                            {currency.format(row.totalAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {consolidatedTotals.pieces === 0
                            ? ""
                            : consolidatedTotals.pieces}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {currency.format(consolidatedTotals.amount)}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
              Backdated entries
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Entries where the expense date (calendar day only) is before the calendar
              day the record was created. Here, Date From / To filters by when the row
              was recorded (creation time); the tables above filter by expense date
              instead. Item Filter still applies. Type (internal/external) does not
              filter this list.
            </Typography>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Expense Name</TableCell>
                    <TableCell>Expense date</TableCell>
                    <TableCell>Recorded at</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell align="right">Pieces</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backdatedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No backdated entries match the filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    backdatedRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.expenseName}</TableCell>
                        <TableCell>{formatDateTime(row.date)}</TableCell>
                        <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                        <TableCell>
                          {row.source === "inventory" ? "Inventory" : "Expense"}
                        </TableCell>
                        <TableCell align="right">
                          {row.pieces == null ? "" : row.pieces}
                        </TableCell>
                        <TableCell align="right">
                          {currency.format(row.amount)}
                        </TableCell>
                        <TableCell>{row.notes || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Stack>
      )}
    </Box>
  );
};

export default ExpensesReport;
