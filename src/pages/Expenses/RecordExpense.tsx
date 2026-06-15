import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
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
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  DatePicker,
  DateTimePicker,
  LocalizationProvider,
} from "@mui/x-date-pickers";
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
import expenseItemService, {
  type ExpenseItem,
} from "../../services/expenseItemService";
import expenseRecordService, {
  type CreateExpenseRecordPayload,
  type ExpenseRecord,
  type UpdateExpenseRecordPayload,
} from "../../services/expenseRecordService";
import { isAdmin } from "../../utils/roleAccess";
import { ignoreBackdropClose } from "../../utils/muiDialogClose";
import {
  computeInventoryExpenseAmount,
  inventoryConsumptionFromExpenses,
} from "../../utils/inventoryFifo";

type ExpenseOption = {
  key: string;
  type: "inventory" | "expense";
  id: string;
  name: string;
  label: string;
};

type FormState = {
  option: ExpenseOption | null;
  date: Dayjs;
  pieces: string;
  amount: string;
  isExternalUsage: boolean;
  notes: string;
};

const emptyForm = (): FormState => ({
  option: null,
  date: dayjs(),
  pieces: "",
  amount: "",
  isExternalUsage: false,
  notes: "",
});

type SourceFilter = "all" | "inventory" | "expense";
type UsageTypeFilter = "all" | "internal" | "external";

const phpFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

/**
 * Wrap disabled fields in a Box with this sx so hover shows not-allowed.
 * MUI sets pointer-events: none on disabled inputs, so cursor must live on the wrapper.
 */
const disabledFieldWrapSx: SxProps<Theme> = {
  cursor: "not-allowed",
  width: "100%",
  "& .MuiInputBase-root.Mui-disabled": {
    pointerEvents: "none",
    bgcolor: (theme) =>
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.07)",
    WebkitTextFillColor: (theme) => theme.palette.text.disabled,
  },
  "& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline": {
    borderColor: (theme) => theme.palette.action.disabled,
    borderStyle: "dashed",
    borderWidth: 1.5,
  },
  "& .MuiInputLabel-root.Mui-disabled": {
    color: (theme) => theme.palette.text.disabled,
  },
  "& .MuiIconButton-root.Mui-disabled": {
    pointerEvents: "none",
  },
};

const normalizeRange = (from: Dayjs, to: Dayjs): { from: Dayjs; to: Dayjs } => {
  if (from.isAfter(to)) return { from: to, to: from };
  return { from, to };
};

const isWithinDateRange = (
  dateValue: string | undefined,
  from: Dayjs,
  to: Dayjs,
): boolean => {
  if (!dateValue) return false;
  const date = dayjs(dateValue);
  if (!date.isValid()) return false;
  const range = normalizeRange(from, to);
  return (
    (date.isSame(range.from.startOf("day")) ||
      date.isAfter(range.from.startOf("day"))) &&
    (date.isSame(range.to.endOf("day")) || date.isBefore(range.to.endOf("day")))
  );
};

const RecordExpensePage: React.FC = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [inventoryRecords, setInventoryRecords] = useState<InventoryRecord[]>(
    [],
  );
  const [records, setRecords] = useState<ExpenseRecord[]>([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ExpenseRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [filterSource, setFilterSource] = useState<SourceFilter>("all");
  const [filterUsageType, setFilterUsageType] = useState<UsageTypeFilter>("all");
  const [filterNameOption, setFilterNameOption] = useState<ExpenseOption | null>(
    null,
  );
  const [filterDateFrom, setFilterDateFrom] = useState<Dayjs>(() => dayjs());
  const [filterDateTo, setFilterDateTo] = useState<Dayjs>(() => dayjs());

  const isCurrentUserAdmin = useMemo(() => isAdmin(), []);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const inventoryItemById = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    inventoryItems.forEach((i) => map.set(i.id, i));
    return map;
  }, [inventoryItems]);

  const expenseItemById = useMemo(() => {
    const map = new Map<string, ExpenseItem>();
    expenseItems.forEach((i) => map.set(i.id, i));
    return map;
  }, [expenseItems]);

  const inventoryConsumptionRecords = useMemo(
    () => inventoryConsumptionFromExpenses(records),
    [records],
  );

  const visibleExpenseItems = useMemo(() => {
    if (isCurrentUserAdmin) return expenseItems;
    return expenseItems.filter((it) => !it.isAdminOnly);
  }, [expenseItems, isCurrentUserAdmin]);

  const combinedOptions = useMemo<ExpenseOption[]>(() => {
    const invOptions: ExpenseOption[] = inventoryItems.map((it) => ({
      key: `inventory:${it.id}`,
      type: "inventory",
      id: it.id,
      name: it.name || "",
      label: `[Inventory] ${it.name || ""}`,
    }));
    const expOptions: ExpenseOption[] = visibleExpenseItems.map((it) => ({
      key: `expense:${it.id}`,
      type: "expense",
      id: it.id,
      name: it.name || "",
      label: `[Expense] ${it.name || ""}`,
    }));
    return [...invOptions, ...expOptions].sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [inventoryItems, visibleExpenseItems]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [invItems, expItems, invRecs, expRecs] = await Promise.all([
        inventoryItemService.getAllForLookup(),
        expenseItemService.getAllForLookup(),
        inventoryRecordService.getAll(),
        expenseRecordService.getAll(),
      ]);
      setInventoryItems(invItems);
      setExpenseItems(expItems);
      setInventoryRecords(invRecs);
      setRecords(expRecs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : API_ERRORS.SAVE_FAILED);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const unsubInv = inventoryItemService.subscribeToLookup((next) =>
      setInventoryItems(next),
    );
    const unsubExp = expenseItemService.subscribeToLookup((next) =>
      setExpenseItems(next),
    );
    return () => {
      unsubInv();
      unsubExp();
    };
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [
    records.length,
    filterSource,
    filterUsageType,
    filterNameOption,
    filterDateFrom,
    filterDateTo,
  ]);

  const selectedAvailablePieces = useMemo<number | null>(() => {
    if (form.option?.type !== "inventory") return null;
    const itemId = form.option.id;
    const purchased = inventoryRecords.reduce(
      (sum, row) =>
        row.itemId === itemId ? sum + (Number(row.pieces) || 0) : sum,
      0,
    );
    const expensed = records.reduce((sum, row) => {
      if (row.source !== "inventory") return sum;
      if (row.inventoryItemId !== itemId) return sum;
      // When editing, don't count the row currently being edited.
      if (editing && row.id === editing.id) return sum;
      return sum + (Number(row.pieces) || 0);
    }, 0);
    return Math.max(0, purchased - expensed);
  }, [editing, form.option, inventoryRecords, records]);

  const computedAmountPreview = useMemo<number | null>(() => {
    if (form.option?.type !== "inventory") return null;
    const pieces = Number(form.pieces);
    if (!Number.isFinite(pieces) || pieces <= 0) return null;
    return computeInventoryExpenseAmount({
      inventoryRecords,
      consumptionRecords: inventoryConsumptionRecords,
      inventoryItemId: form.option.id,
      pieces,
      expenseDate: form.date.toISOString(),
      expenseId: editing?.id,
      excludeExpenseId: editing?.id,
    });
  }, [
    editing?.id,
    form.date,
    form.option,
    form.pieces,
    inventoryConsumptionRecords,
    inventoryRecords,
  ]);

  const filteredRecords = useMemo(() => {
    const bySource =
      filterSource === "all"
        ? records
        : records.filter((r) => r.source === filterSource);
    const byUsage =
      filterUsageType === "internal"
        ? bySource.filter((r) => !r.isExternalUsage)
        : filterUsageType === "external"
          ? bySource.filter((r) => Boolean(r.isExternalUsage))
          : bySource;
    const byDate = byUsage.filter((r) =>
      isWithinDateRange(r.date, filterDateFrom, filterDateTo),
    );
    if (!filterNameOption) return byDate;
    return byDate.filter((r) => {
      if (filterNameOption.type === "inventory") {
        return (
          r.source === "inventory" && r.inventoryItemId === filterNameOption.id
        );
      }
      return r.source === "expense" && r.expenseItemId === filterNameOption.id;
    });
  }, [
    filterSource,
    filterUsageType,
    filterNameOption,
    filterDateFrom,
    filterDateTo,
    records,
  ]);

  const paged = useMemo(() => {
    return filteredRecords.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage,
    );
  }, [filteredRecords, page, rowsPerPage]);

  const renderExpenseName = (record: ExpenseRecord): string => {
    if (record.source === "inventory" && record.inventoryItemId) {
      const item = inventoryItemById.get(record.inventoryItemId);
      return `[Inventory] ${item?.name || "-"}`;
    }
    if (record.source === "expense" && record.expenseItemId) {
      const item = expenseItemById.get(record.expenseItemId);
      return `[Expense] ${item?.name || "-"}`;
    }
    return "-";
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogError(null);
    setDialogOpen(true);
  };

  const openEdit = (record: ExpenseRecord) => {
    let option: ExpenseOption | null = null;
    if (record.source === "inventory" && record.inventoryItemId) {
      const item = inventoryItemById.get(record.inventoryItemId);
      option = item
        ? {
            key: `inventory:${item.id}`,
            type: "inventory",
            id: item.id,
            name: item.name || "",
            label: `[Inventory] ${item.name || ""}`,
          }
        : null;
    } else if (record.source === "expense" && record.expenseItemId) {
      const item = expenseItemById.get(record.expenseItemId);
      option = item
        ? {
            key: `expense:${item.id}`,
            type: "expense",
            id: item.id,
            name: item.name || "",
            label: `[Expense] ${item.name || ""}`,
          }
        : null;
    }
    setEditing(record);
    setForm({
      option,
      date: dayjs(record.date || new Date()),
      pieces: record.pieces == null ? "" : String(record.pieces),
      amount: record.amount == null ? "" : String(record.amount),
      isExternalUsage: Boolean(record.isExternalUsage),
      notes: record.notes || "",
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
    if (!form.option) return "Expense Name is required.";
    if (!form.date || !form.date.isValid()) return "Date is required.";

    if (form.option.type === "inventory") {
      const pieces = Number(form.pieces);
      if (!Number.isFinite(pieces) || pieces <= 0) {
        return "Pieces must be 1 or more.";
      }
      if (
        typeof selectedAvailablePieces === "number" &&
        pieces > selectedAvailablePieces
      ) {
        return `Pieces should not be greater than the available stocks (${selectedAvailablePieces}).`;
      }
    } else {
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return "Amount must be greater than 0.";
      }
      if (form.pieces.trim()) {
        const p = Math.floor(Number(form.pieces));
        if (!Number.isFinite(p) || p < 1) {
          return "Pieces must be 1 or more when provided.";
        }
      }
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
        const payload: UpdateExpenseRecordPayload =
          form.option!.type === "inventory"
            ? {
                source: "inventory",
                inventoryItemId: form.option!.id,
                expenseItemId: null,
                date: form.date.toISOString(),
                pieces: Number(form.pieces),
                amount: null,
                isExternalUsage: Boolean(form.isExternalUsage),
                notes: form.notes.trim() || null,
              }
            : {
                source: "expense",
                inventoryItemId: null,
                expenseItemId: form.option!.id,
                date: form.date.toISOString(),
                pieces: form.pieces.trim()
                  ? Math.max(1, Math.floor(Number(form.pieces)))
                  : null,
                amount: Number(form.amount),
                isExternalUsage: Boolean(form.isExternalUsage),
                notes: form.notes.trim() || null,
              };
        await expenseRecordService.update(editing.id, payload);
      } else {
        const payload: CreateExpenseRecordPayload =
          form.option!.type === "inventory"
            ? {
                source: "inventory",
                inventoryItemId: form.option!.id,
                date: form.date.toISOString(),
                pieces: Number(form.pieces),
                isExternalUsage: Boolean(form.isExternalUsage),
                notes: form.notes.trim() || undefined,
              }
            : {
                source: "expense",
                expenseItemId: form.option!.id,
                date: form.date.toISOString(),
                amount: Number(form.amount),
                ...(form.pieces.trim()
                  ? {
                      pieces: Math.max(1, Math.floor(Number(form.pieces))),
                    }
                  : {}),
                isExternalUsage: Boolean(form.isExternalUsage),
                notes: form.notes.trim() || undefined,
              };
        await expenseRecordService.create(payload);
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
      await expenseRecordService.delete(deleteId);
      setDeleteId(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : API_ERRORS.SAVE_FAILED);
      setDeleteId(null);
    }
  };

  const sourceType = form.option?.type ?? null;
  const isInventory = sourceType === "inventory";
  const isExpense = sourceType === "expense";

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
        <Typography variant="h6">Record Expense</Typography>
        <Button variant="contained" onClick={openCreate} disabled={loading}>
          Record Expense
        </Button>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <Autocomplete
                size="small"
                fullWidth
                options={combinedOptions}
                value={filterNameOption}
                onChange={(_, value) => setFilterNameOption(value)}
                isOptionEqualToValue={(option, value) =>
                  option.key === value.key
                }
                getOptionLabel={(option) => option.label}
                renderInput={(params) => (
                  <TextField {...params} label="Expense Name" fullWidth />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <DatePicker
                label="Date From"
                value={filterDateFrom}
                onChange={(value) => setFilterDateFrom(value || dayjs())}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <DatePicker
                label="Date To"
                value={filterDateTo}
                onChange={(value) => setFilterDateTo(value || dayjs())}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl size="small" fullWidth>
                <InputLabel id="expense-source-filter-label">Source</InputLabel>
                <Select
                  labelId="expense-source-filter-label"
                  label="Source"
                  value={filterSource}
                  onChange={(e) =>
                    setFilterSource(e.target.value as SourceFilter)
                  }
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="inventory">Inventory</MenuItem>
                  <MenuItem value="expense">Expense</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl size="small" fullWidth>
                <InputLabel id="expense-type-filter-label">Type</InputLabel>
                <Select
                  labelId="expense-type-filter-label"
                  label="Type"
                  value={filterUsageType}
                  onChange={(e) =>
                    setFilterUsageType(e.target.value as UsageTypeFilter)
                  }
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="internal">Internal</MenuItem>
                  <MenuItem value="external">External</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </LocalizationProvider>
      </Paper>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper>
        {loading ? (
          <TableContainer sx={{ maxHeight: "calc(100vh - 340px)" }}>
            <Table size="small" stickyHeader>
              <TableHeaderSkeleton columns={7} />
              <TableSkeleton columns={7} rows={8} />
            </Table>
          </TableContainer>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: "calc(100vh - 340px)" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Expense Name</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Pieces</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="center">Not internal usage</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paged.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No expense records.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paged.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{renderExpenseName(record)}</TableCell>
                        <TableCell>
                          {dayjs(record.date).isValid()
                            ? dayjs(record.date).format("MM-DD-YY h:mm A")
                            : "-"}
                        </TableCell>
                        <TableCell align="right">
                          {record.pieces != null ? record.pieces : "-"}
                        </TableCell>
                        <TableCell align="right">
                          {record.amount == null
                            ? "-"
                            : record.source === "expense"
                              ? phpFormatter.format(Number(record.amount))
                              : isCurrentUserAdmin
                                ? phpFormatter.format(Number(record.amount))
                                : "-"}
                        </TableCell>
                        <TableCell align="center">
                          {record.isExternalUsage ? "Yes" : "No"}
                        </TableCell>
                        <TableCell>{record.notes || "-"}</TableCell>
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
              count={filteredRecords.length}
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
        message="Are you sure you want to delete this expense record?"
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
          {editing ? "Edit Expense Record" : "Add Expense Record"}
          {isInventory && typeof selectedAvailablePieces === "number" ? (
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
                  options={combinedOptions}
                  value={form.option}
                  onChange={(_, value) => {
                    let pieces = "";
                    if (value?.type === "inventory") {
                      const item = inventoryItemById.get(value.id);
                      const dp = item?.defaultPieces;
                      if (
                        dp != null &&
                        Number.isFinite(Number(dp)) &&
                        Number(dp) >= 1
                      ) {
                        pieces = String(Math.floor(Number(dp)));
                      }
                    }
                    setForm((prev) => ({
                      ...prev,
                      option: value,
                      pieces,
                      amount: "",
                    }));
                  }}
                  isOptionEqualToValue={(option, value) =>
                    option.key === value.key
                  }
                  getOptionLabel={(option) => option.label || ""}
                  groupBy={(option) =>
                    option.type === "inventory" ? "Inventory" : "Expense"
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Expense Name" size="small" />
                  )}
                />
              </Grid>

              <Grid size={12}>
                <Box sx={!form.option ? disabledFieldWrapSx : { width: "100%" }}>
                  <DateTimePicker
                    label="Date"
                    value={form.date}
                    maxDateTime={dayjs()}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, date: value || dayjs() }))
                    }
                    disabled={!form.option}
                    slotProps={{
                      textField: { fullWidth: true, size: "small" },
                      actionBar: { actions: ["today", "cancel", "accept"] },
                    }}
                  />
                </Box>
              </Grid>

              <Grid size={12}>
                <Box sx={!form.option ? disabledFieldWrapSx : { width: "100%" }}>
                <TextField
                  fullWidth
                  size="small"
                  label={
                    isExpense
                      ? "Pieces (optional)"
                      : isInventory
                        ? "Pieces"
                        : "Pieces"
                  }
                  value={form.option ? form.pieces : ""}
                  disabled={!form.option}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, pieces: e.target.value }))
                  }
                  inputProps={{
                    min: 1,
                    ...(typeof selectedAvailablePieces === "number" && isInventory
                      ? { max: selectedAvailablePieces }
                      : {}),
                  }}
                  error={
                    isInventory &&
                    typeof selectedAvailablePieces === "number" &&
                    Number(form.pieces || 0) > selectedAvailablePieces
                  }
                  helperText={
                    isInventory &&
                    typeof selectedAvailablePieces === "number" &&
                    Number(form.pieces || 0) > selectedAvailablePieces
                      ? `Cannot exceed available stocks (${selectedAvailablePieces}).`
                      : isInventory &&
                          computedAmountPreview != null &&
                          isCurrentUserAdmin
                        ? `Amount preview: ${phpFormatter.format(
                            computedAmountPreview,
                          )} (FIFO cost, auto-calculated on save)`
                        : isInventory &&
                            isCurrentUserAdmin &&
                            computedAmountPreview == null
                          ? "Amount is auto-calculated from oldest inventory stock (FIFO) on save."
                          : ""
                  }
                />
                </Box>
              </Grid>

              <Grid size={12}>
                <Box sx={!isExpense ? disabledFieldWrapSx : { width: "100%" }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Amount"
                  value={isExpense ? form.amount : ""}
                  disabled={!isExpense}
                  helperText={
                    !isExpense && form.option
                      ? "Amount is auto-calculated for inventory items."
                      : undefined
                  }
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  inputProps={{ min: 0.01, step: "0.01" }}
                />
                </Box>
              </Grid>

              <Grid size={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Notes"
                  multiline
                  rows={2}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, notes: e.target.value }))
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

export default RecordExpensePage;
