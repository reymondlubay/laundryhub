import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
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
import { API_ERRORS } from "../../constants/messages";
import inventoryItemService, {
  type InventoryItem,
} from "../../services/inventoryItemService";
import inventoryRecordService, {
  type InventoryRecord,
} from "../../services/inventoryRecordService";
import stockUsageService, {
  type StockUsageRecord,
} from "../../services/stockUsageService";
import expenseRecordService, {
  type ExpenseRecord,
} from "../../services/expenseRecordService";
import { computeFifoUsageCosts } from "../../utils/inventoryFifo";

type SummaryRow = {
  itemId: string;
  itemName: string;
  totalPieces: number;
  totalPrice: number;
};

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

const InventorySummaryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [usages, setUsages] = useState<StockUsageRecord[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [lookupItems, data, usageData, expenseData] = await Promise.all([
        inventoryItemService.getAllForLookup(),
        inventoryRecordService.getAll(),
        stockUsageService.getAll(),
        expenseRecordService.getAll(),
      ]);
      setItems(lookupItems);
      setRecords(data);
      setUsages(usageData);
      setExpenseRecords(expenseData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : API_ERRORS.SAVE_FAILED);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const unsubscribe = inventoryItemService.subscribeToLookup((next) => {
      setItems(next);
    });
    return unsubscribe;
  }, [load]);

  const itemById = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    items.forEach((i) => map.set(i.id, i));
    return map;
  }, [items]);

  const allConsumption = useMemo<StockUsageRecord[]>(() => {
    const fromExpenses: StockUsageRecord[] = expenseRecords
      .filter((r) => r.source === "inventory" && r.inventoryItemId)
      .map((r) => ({
        id: r.id,
        itemId: r.inventoryItemId as string,
        date: r.date,
        pieces: Number(r.pieces) || 0,
        isExternalUsage: Boolean(r.isExternalUsage),
      }));
    return [...usages, ...fromExpenses];
  }, [usages, expenseRecords]);

  const summary = useMemo<SummaryRow[]>(() => {
    const { remainingLotsByItemId } = computeFifoUsageCosts({
      inventoryRecords: records,
      stockUsageRecords: allConsumption,
    });

    const rows: SummaryRow[] = [];
    remainingLotsByItemId.forEach((lots, itemId) => {
      const totalPieces = lots.reduce((sum, l) => sum + (Number(l.remainingPieces) || 0), 0);
      const totalPrice = lots.reduce(
        (sum, l) =>
          sum +
          (Number(l.remainingPieces) || 0) * (Number(l.pricePerPiece) || 0),
        0,
      );

      rows.push({
        itemId,
        itemName: itemById.get(itemId)?.name || "Unknown Item",
        totalPieces,
        totalPrice,
      });
    });

    rows.sort((a, b) => a.itemName.localeCompare(b.itemName));
    return rows;
  }, [itemById, records, allConsumption]);

  const grandTotals = useMemo(() => {
    return summary.reduce(
      (totals, row) => ({
        pieces: totals.pieces + row.totalPieces,
        price: totals.price + row.totalPrice,
      }),
      { pieces: 0, price: 0 },
    );
  }, [summary]);

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        gap={2}
        flexWrap="wrap"
        sx={{ mb: 2 }}
      >
        <Typography variant="h6">Inventory Summary</Typography>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Total Pieces: {grandTotals.pieces} | Total Price:{" "}
          {currency.format(grandTotals.price)}
        </Typography>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper>
        <TableContainer sx={{ maxHeight: "calc(100vh - 260px)" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell align="right">Total Pieces</TableCell>
                <TableCell align="right">Total Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : summary.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No inventory records found.
                  </TableCell>
                </TableRow>
              ) : (
                summary.map((row) => (
                  <TableRow key={row.itemId}>
                    <TableCell>{row.itemName}</TableCell>
                    <TableCell align="right">{row.totalPieces}</TableCell>
                    <TableCell align="right">
                      {currency.format(row.totalPrice)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default InventorySummaryPage;

