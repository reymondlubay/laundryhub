import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  Checkbox,
  MenuItem,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { type Dayjs } from "dayjs";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import {
  TableHeaderSkeleton,
  TableSkeleton,
} from "../../components/Skeletons/SkeletonComponents";
import { API_ERRORS, UI_TEXT } from "../../constants/messages";
import inventoryItemService, {
  type InventoryItem,
} from "../../services/inventoryItemService";
import inventoryRecordService, {
  type InventoryRecord,
} from "../../services/inventoryRecordService";
import stockUsageService, {
  type CreateStockUsagePayload,
  type StockUsageRecord,
  type UpdateStockUsagePayload,
} from "../../services/stockUsageService";
import { computeFifoUsageCosts } from "../../utils/inventoryFifo";
import { ignoreBackdropClose } from "../../utils/muiDialogClose";

type FormState = {
  item: InventoryItem | null;
  date: Dayjs;
  pieces: string;
  isExternalUsage: boolean;
};

const emptyForm = (): FormState => ({
  item: null,
  date: dayjs(),
  pieces: "",
  isExternalUsage: false,
});

type UsageTypeFilter = "all" | "internal" | "external";

const StockUsagePage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [inventoryRecords, setInventoryRecords] = useState<InventoryRecord[]>([]);
  const [records, setRecords] = useState<StockUsageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [editing, setEditing] = useState<StockUsageRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [filterItemId, setFilterItemId] = useState<string>("");
  const [filterUsageType, setFilterUsageType] = useState<UsageTypeFilter>("all");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const itemById = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    items.forEach((i) => map.set(i.id, i));
    return map;
  }, [items]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [lookupItems, usageData, invData] = await Promise.all([
        inventoryItemService.getAllForLookup(),
        stockUsageService.getAll(),
        inventoryRecordService.getAll(),
      ]);
      setItems(lookupItems);
      setRecords(usageData);
      setInventoryRecords(invData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : API_ERRORS.SAVE_FAILED);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectedAvailablePieces = useMemo(() => {
    const itemId = form.item?.id;
    if (!itemId) return null;
    const purchased = inventoryRecords.reduce((sum, row) => {
      return row.itemId === itemId ? sum + (Number(row.pieces) || 0) : sum;
    }, 0);
    const used = records.reduce((sum, row) => {
      // When editing, don't count the current row twice.
      if (row.itemId !== itemId) return sum;
      if (editing && row.id === editing.id) return sum;
      return sum + (Number(row.pieces) || 0);
    }, 0);
    return Math.max(0, purchased - used);
  }, [editing, form.item?.id, inventoryRecords, records]);

  useEffect(() => {
    void load();
    const unsubscribe = inventoryItemService.subscribeToLookup((next) => {
      setItems(next);
    });
    return unsubscribe;
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [records.length]);

  const filteredRecords = useMemo(() => {
    const byItem = filterItemId
      ? records.filter((r) => r.itemId === filterItemId)
      : records;
    if (filterUsageType === "internal") {
      return byItem.filter((r) => !r.isExternalUsage);
    }
    if (filterUsageType === "external") {
      return byItem.filter((r) => Boolean(r.isExternalUsage));
    }
    return byItem;
  }, [filterItemId, filterUsageType, records]);

  const paged = useMemo(() => {
    return filteredRecords.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage,
    );
  }, [filteredRecords, page, rowsPerPage]);

  const usageCostsById = useMemo(() => {
    const { usageCostsById } = computeFifoUsageCosts({
      inventoryRecords,
      stockUsageRecords: records,
    });
    return usageCostsById;
  }, [inventoryRecords, records]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogError(null);
    setDialogOpen(true);
  };

  const openEdit = (record: StockUsageRecord) => {
    setEditing(record);
    setForm({
      item: itemById.get(record.itemId) || null,
      date: dayjs(record.date || new Date()),
      pieces: String(record.pieces ?? ""),
      isExternalUsage: Boolean(record.isExternalUsage),
    });
    setDialogError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm());
    setDialogError(null);
  };

  const validateForm = (): string | null => {
    if (!form.item?.id) return "Item is required.";
    const pieces = Number(form.pieces);
    if (!Number.isFinite(pieces) || pieces <= 0) return "Pieces must be 1 or more.";
    if (typeof selectedAvailablePieces === "number" && pieces > selectedAvailablePieces) {
      return `Pieces should not be greater than the available stocks (${selectedAvailablePieces}).`;
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setDialogError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setDialogError(null);
      setError(null);

      if (editing) {
        const payload: UpdateStockUsagePayload = {
          itemId: form.item?.id,
          date: form.date.toISOString(),
          pieces: Number(form.pieces),
          isExternalUsage: Boolean(form.isExternalUsage),
        };
        await stockUsageService.update(editing.id, payload);
      } else {
        const payload: CreateStockUsagePayload = {
          itemId: form.item!.id,
          date: form.date.toISOString(),
          pieces: Number(form.pieces),
          isExternalUsage: Boolean(form.isExternalUsage),
        };
        await stockUsageService.create(payload);
      }

      closeDialog();
      await load();
    } catch (err: unknown) {
      setDialogError(err instanceof Error ? err.message : API_ERRORS.SAVE_FAILED);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      setError(null);
      await stockUsageService.delete(deleteId);
      setDeleteId(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : API_ERRORS.SAVE_FAILED);
    }
  };

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
        <Typography variant="h6">Record Stock Usage</Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Autocomplete
            size="small"
            sx={{ minWidth: 220 }}
            options={items}
            value={items.find((i) => i.id === filterItemId) || null}
            onChange={(_, value) => setFilterItemId(value?.id || "")}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(option) => option.name || ""}
            renderInput={(params) => <TextField {...params} label="Item Filter" />}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="stock-usage-type-filter-label">Type</InputLabel>
            <Select
              labelId="stock-usage-type-filter-label"
              label="Type"
              value={filterUsageType}
              onChange={(e) => setFilterUsageType(e.target.value as UsageTypeFilter)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="internal">Internal</MenuItem>
              <MenuItem value="external">External</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" onClick={openCreate} disabled={loading}>
            Record Stock Usage
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper>
        {loading ? (
          <TableContainer sx={{ maxHeight: "calc(100vh - 260px)" }}>
            <Table size="small" stickyHeader>
              <TableHeaderSkeleton columns={5} />
              <TableSkeleton columns={5} rows={8} />
            </Table>
          </TableContainer>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: "calc(100vh - 260px)" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Pieces</TableCell>
                    <TableCell align="right">Total Price</TableCell>
                    <TableCell align="center">Is External Usage</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paged.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No stock usage records.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paged.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {itemById.get(record.itemId)?.name || "-"}
                        </TableCell>
                        <TableCell>
                          {dayjs(record.date).isValid()
                            ? dayjs(record.date).format("MM-DD-YY h:mm A")
                            : "-"}
                        </TableCell>
                        <TableCell align="right">{record.pieces}</TableCell>
                        <TableCell align="right">
                          {new Intl.NumberFormat("en-PH", {
                            style: "currency",
                            currency: "PHP",
                          }).format(usageCostsById.get(record.id)?.totalPrice || 0)}
                        </TableCell>
                        <TableCell align="center">
                          {record.isExternalUsage ? "Yes" : "No"}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            color="success"
                            onClick={() => openEdit(record)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => setDeleteId(record.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[25, 50, 100, 200]}
              component="div"
              count={records.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
            />
          </>
        )}
      </Paper>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Confirm Delete"
        message="Are you sure you want to delete this stock usage record?"
        confirmText={UI_TEXT.DELETE}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
      />

      <Dialog
        open={dialogOpen}
        onClose={ignoreBackdropClose(closeDialog)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ component: "form", autoComplete: "off" }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
            minWidth: 0,
            flexWrap: "wrap",
          }}
        >
          {editing ? "Edit Stock Usage" : "Add Stock Usage"}
          {typeof selectedAvailablePieces === "number" ? (
            <Chip
              label={`Available: ${selectedAvailablePieces}`}
              sx={(theme) => ({
                height: 34,
                px: 0.75,
                borderRadius: 0,
                fontWeight: 700,
                fontSize: "0.9rem",
                letterSpacing: 0.05,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor:
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.35)"
                    : theme.palette.primary.main,
                bgcolor:
                  theme.palette.mode === "dark"
                    ? "#000"
                    : "rgba(232, 238, 245, 0.95)",
                color:
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.95)"
                    : theme.palette.text.primary,
                "& .MuiChip-label": {
                  px: 1,
                  py: 0,
                },
              })}
            />
          ) : null}
        </DialogTitle>
        <DialogContent>
          {dialogError ? (
            <Alert severity="error" sx={{ mb: 1 }}>
              {dialogError}
            </Alert>
          ) : null}

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={12}>
                <Autocomplete
                  options={items}
                  value={form.item}
                  onChange={(_, value) =>
                    setForm((prev) => ({ ...prev, item: value, pieces: "" }))
                  }
                  getOptionLabel={(option) => option.name || ""}
                  renderInput={(params) => (
                    <TextField {...params} label="Item" size="small" />
                  )}
                />
              </Grid>

              <Grid size={12}>
                <DateTimePicker
                  label="Date"
                  value={form.date}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, date: value || dayjs() }))
                  }
                  slotProps={{
                    textField: { fullWidth: true, size: "small" },
                  }}
                />
              </Grid>

              <Grid size={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Pieces"
                  value={form.pieces}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, pieces: e.target.value }))
                  }
                  inputProps={{
                    min: 1,
                    ...(typeof selectedAvailablePieces === "number"
                      ? { max: selectedAvailablePieces }
                      : {}),
                  }}
                  error={
                    typeof selectedAvailablePieces === "number" &&
                    Number(form.pieces || 0) > selectedAvailablePieces
                  }
                  helperText={
                    typeof selectedAvailablePieces === "number" &&
                    Number(form.pieces || 0) > selectedAvailablePieces
                      ? `Cannot exceed available stocks (${selectedAvailablePieces}).`
                      : ""
                  }
                />
              </Grid>

              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.isExternalUsage}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          isExternalUsage: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Is not internal usage"
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={submitting}>
            {UI_TEXT.CANCEL}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? UI_TEXT.SAVING : UI_TEXT.SAVE}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StockUsagePage;

