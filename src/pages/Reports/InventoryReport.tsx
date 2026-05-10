import React from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
  Alert,
  Autocomplete,
  Box,
  CircularProgress,
  Grid,
  Paper,
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
import inventoryRecordService, {
  type InventoryRecord,
} from "../../services/inventoryRecordService";
import stockUsageService, {
  type StockUsageRecord,
} from "../../services/stockUsageService";
import { computeFifoUsageCosts } from "../../utils/inventoryFifo";

type ReportRow = {
  itemId: string;
  itemName: string;
  totalPiecesUsed: number;
  totalPriceUsed: number;
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

const InventoryReport: React.FC = () => {
  const [items, setItems] = React.useState<InventoryItem[]>([]);
  const [inventoryRecords, setInventoryRecords] = React.useState<InventoryRecord[]>(
    [],
  );
  const [usageRecords, setUsageRecords] = React.useState<StockUsageRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [selectedItemId, setSelectedItemId] = React.useState<string>("");
  const [dateFrom, setDateFrom] = React.useState<Dayjs>(dayjs().subtract(1, "month"));
  const [dateTo, setDateTo] = React.useState<Dayjs>(dayjs());

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [lookupItems, inv, usage] = await Promise.all([
          inventoryItemService.getAllForLookup(),
          inventoryRecordService.getAll(),
          stockUsageService.getAll(),
        ]);
        setItems(lookupItems);
        setInventoryRecords(inv);
        setUsageRecords(usage);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load inventory report.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const itemById = React.useMemo(() => {
    const map = new Map<string, InventoryItem>();
    items.forEach((i) => map.set(i.id, i));
    return map;
  }, [items]);

  const reportRows = React.useMemo<ReportRow[]>(() => {
    const range = normalizeRange(dateFrom, dateTo);

    // FIFO needs usages up to `to` (and before-from to prime the lot consumption).
    const usagesUpToTo = usageRecords.filter((u) =>
      isWithinRange(u.date, dayjs("1970-01-01"), range.to),
    );

    const { usageCostsById } = computeFifoUsageCosts({
      inventoryRecords,
      stockUsageRecords: usagesUpToTo,
    });

    const inRange = usageRecords.filter((u) =>
      isWithinRange(u.date, range.from, range.to),
    );

    const internalOnly = inRange.filter((u) => !u.isExternalUsage);
    const filtered = selectedItemId
      ? internalOnly.filter((u) => u.itemId === selectedItemId)
      : internalOnly;

    const agg = new Map<string, { pieces: number; price: number }>();
    filtered.forEach((u) => {
      const itemId = u.itemId;
      const pieces = Number(u.pieces) || 0;
      const cost = usageCostsById.get(u.id)?.totalPrice || 0;
      const prev = agg.get(itemId) || { pieces: 0, price: 0 };
      agg.set(itemId, { pieces: prev.pieces + pieces, price: prev.price + cost });
    });

    const rows: ReportRow[] = [];
    agg.forEach((value, itemId) => {
      rows.push({
        itemId,
        itemName: itemById.get(itemId)?.name || "Unknown Item",
        totalPiecesUsed: value.pieces,
        totalPriceUsed: value.price,
      });
    });

    rows.sort((a, b) => a.itemName.localeCompare(b.itemName));
    return rows;
  }, [dateFrom, dateTo, inventoryRecords, itemById, selectedItemId, usageRecords]);

  const externalReportRows = React.useMemo<ReportRow[]>(() => {
    const range = normalizeRange(dateFrom, dateTo);

    const usagesUpToTo = usageRecords.filter((u) =>
      isWithinRange(u.date, dayjs("1970-01-01"), range.to),
    );

    const { usageCostsById } = computeFifoUsageCosts({
      inventoryRecords,
      stockUsageRecords: usagesUpToTo,
    });

    const inRange = usageRecords.filter((u) =>
      isWithinRange(u.date, range.from, range.to),
    );

    const externalOnly = inRange.filter((u) => Boolean(u.isExternalUsage));
    const filtered = selectedItemId
      ? externalOnly.filter((u) => u.itemId === selectedItemId)
      : externalOnly;

    const agg = new Map<string, { pieces: number; price: number }>();
    filtered.forEach((u) => {
      const itemId = u.itemId;
      const pieces = Number(u.pieces) || 0;
      const cost = usageCostsById.get(u.id)?.totalPrice || 0;
      const prev = agg.get(itemId) || { pieces: 0, price: 0 };
      agg.set(itemId, { pieces: prev.pieces + pieces, price: prev.price + cost });
    });

    const rows: ReportRow[] = [];
    agg.forEach((value, itemId) => {
      rows.push({
        itemId,
        itemName: itemById.get(itemId)?.name || "Unknown Item",
        totalPiecesUsed: value.pieces,
        totalPriceUsed: value.price,
      });
    });

    rows.sort((a, b) => a.itemName.localeCompare(b.itemName));
    return rows;
  }, [dateFrom, dateTo, inventoryRecords, itemById, selectedItemId, usageRecords]);

  const totals = React.useMemo(() => {
    return reportRows.reduce(
      (acc, row) => ({
        pieces: acc.pieces + row.totalPiecesUsed,
        price: acc.price + row.totalPriceUsed,
      }),
      { pieces: 0, price: 0 },
    );
  }, [reportRows]);

  const externalTotals = React.useMemo(() => {
    return externalReportRows.reduce(
      (acc, row) => ({
        pieces: acc.pieces + row.totalPiecesUsed,
        price: acc.price + row.totalPriceUsed,
      }),
      { pieces: 0, price: 0 },
    );
  }, [externalReportRows]);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Inventory Report
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Autocomplete
              size="small"
              options={items}
              value={items.find((i) => i.id === selectedItemId) || null}
              onChange={(_, value) => setSelectedItemId(value?.id || "")}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) => option.name || ""}
              renderInput={(params) => (
                <TextField {...params} label="Item Filter" />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Date From"
                value={dateFrom}
                onChange={(value) => setDateFrom(value || dayjs().subtract(1, "month"))}
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
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </LocalizationProvider>
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
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
              Internal Usage Report
            </Typography>
            <TableContainer sx={{ maxHeight: 450 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell align="right">Total Pieces Used</TableCell>
                    <TableCell align="right">Total Price</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        No records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportRows.map((row) => (
                      <TableRow key={row.itemId}>
                        <TableCell>{row.itemName}</TableCell>
                        <TableCell align="right">{row.totalPiecesUsed}</TableCell>
                        <TableCell align="right">
                          {currency.format(row.totalPriceUsed)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontWeight: 700 }}>
                Total Pieces Used: {totals.pieces}
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>
                Total Price: {currency.format(totals.price)}
              </Typography>
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
              External Usage Report
            </Typography>
            <TableContainer sx={{ maxHeight: 450 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell align="right">Total Pieces Used</TableCell>
                    <TableCell align="right">Total Price</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {externalReportRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        No records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    externalReportRows.map((row) => (
                      <TableRow key={`external-${row.itemId}`}>
                        <TableCell>{row.itemName}</TableCell>
                        <TableCell align="right">{row.totalPiecesUsed}</TableCell>
                        <TableCell align="right">
                          {currency.format(row.totalPriceUsed)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontWeight: 700 }}>
                Total Pieces Used: {externalTotals.pieces}
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>
                Total Price: {currency.format(externalTotals.price)}
              </Typography>
            </Box>
          </Paper>
        </Stack>
      )}
    </Box>
  );
};

export default InventoryReport;

