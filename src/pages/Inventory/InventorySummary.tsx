import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
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
import { buildExportFileName } from "../../utils/exportFileName";
import { API_ERRORS } from "../../constants/messages";
import inventoryItemService, {
  type InventoryItem,
} from "../../services/inventoryItemService";
import inventoryRecordService, {
  type InventoryRecord,
} from "../../services/inventoryRecordService";
import expenseRecordService, {
  type ExpenseRecord,
} from "../../services/expenseRecordService";
import {
  computeFifoUsageCosts,
  inventoryConsumptionFromExpenses,
} from "../../utils/inventoryFifo";

type SummaryRow = {
  itemId: string;
  itemName: string;
  totalPieces: number;
  totalPrice: number;
};

type PricingSummaryRow = {
  key: string;
  itemId: string;
  itemName: string;
  pricePerPiece: number;
  remainingPieces: number;
  totalPrice: number;
};

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

const InventorySummaryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [lookupItems, data, expenseData] = await Promise.all([
        inventoryItemService.getAllForLookup(),
        inventoryRecordService.getAll(),
        expenseRecordService.getAll(),
      ]);
      setItems(lookupItems);
      setRecords(data);
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

  const allConsumption = useMemo(
    () => inventoryConsumptionFromExpenses(expenseRecords),
    [expenseRecords],
  );

  const summary = useMemo<SummaryRow[]>(() => {
    const { remainingLotsByItemId } = computeFifoUsageCosts({
      inventoryRecords: records,
      consumptionRecords: allConsumption,
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

  const pricingSummary = useMemo<PricingSummaryRow[]>(() => {
    const { remainingLotsByItemId } = computeFifoUsageCosts({
      inventoryRecords: records,
      consumptionRecords: allConsumption,
    });

    const rows: PricingSummaryRow[] = [];

    remainingLotsByItemId.forEach((lots, itemId) => {
      const remainingByPrice = new Map<number, number>();

      lots.forEach((lot) => {
        const remaining = Number(lot.remainingPieces) || 0;
        if (remaining <= 0) return;
        const pricePerPiece = Number(lot.pricePerPiece) || 0;
        remainingByPrice.set(
          pricePerPiece,
          (remainingByPrice.get(pricePerPiece) || 0) + remaining,
        );
      });

      const itemName = itemById.get(itemId)?.name || "Unknown Item";

      remainingByPrice.forEach((remainingPieces, pricePerPiece) => {
        rows.push({
          key: `${itemId}:${pricePerPiece}`,
          itemId,
          itemName,
          pricePerPiece,
          remainingPieces,
          totalPrice: remainingPieces * pricePerPiece,
        });
      });
    });

    rows.sort((a, b) => {
      const byName = a.itemName.localeCompare(b.itemName);
      if (byName !== 0) return byName;
      return a.pricePerPiece - b.pricePerPiece;
    });

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

  const handleExportToExcel = useCallback(() => {
    if (summary.length === 0) return;

    const headers = ["Item", "Total Pieces"];

    const toCsvCell = (value: unknown): string => {
      const s = value == null ? "" : String(value);
      const needsQuotes = /[",\r\n]/.test(s);
      const escaped = s.replace(/"/g, '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    };

    const rows = summary.map((row) => [row.itemName, row.totalPieces]);

    const csvLines = [
      headers.map(toCsvCell).join(","),
      ...rows.map((r) => r.map(toCsvCell).join(",")),
    ];
    const csv = csvLines.join("\r\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    const fileName = buildExportFileName("Inventory_Summary");
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            p: 1.5,
            pb: 0,
          }}
        >
          <Button
            variant="outlined"
            size="small"
            onClick={handleExportToExcel}
            disabled={loading || summary.length === 0}
          >
            Export to excel
          </Button>
        </Box>
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

      <Paper sx={{ mt: 3 }}>
        <Typography variant="subtitle1" sx={{ p: 2, pb: 1, fontWeight: 700 }}>
          Summary By Pricing
        </Typography>
        <TableContainer sx={{ maxHeight: "calc(100vh - 260px)" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Remaining Pcs</TableCell>
                <TableCell align="right">Total Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : pricingSummary.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No remaining inventory by price.
                  </TableCell>
                </TableRow>
              ) : (
                pricingSummary.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.itemName}</TableCell>
                    <TableCell align="right">
                      {currency.format(row.pricePerPiece)}
                    </TableCell>
                    <TableCell align="right">{row.remainingPieces}</TableCell>
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
