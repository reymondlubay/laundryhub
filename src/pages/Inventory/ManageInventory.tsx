import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
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
import { usePaginatedTableScroll } from "../../hooks/usePaginatedTableScroll";
import {
  TableHeaderSkeleton,
  TableSkeleton,
} from "../../components/Skeletons/SkeletonComponents";
import { API_ERRORS, UI_TEXT } from "../../constants/messages";
import inventoryItemService, {
  type InventoryItem,
} from "../../services/inventoryItemService";
import inventoryRecordService, {
  type CreateInventoryRecordPayload,
  type InventoryRecord,
  type UpdateInventoryRecordPayload,
} from "../../services/inventoryRecordService";
import expenseRecordService, {
  type ExpenseRecord,
} from "../../services/expenseRecordService";
import {
  getLotConsumptionByRecordId,
  inventoryConsumptionFromExpenses,
} from "../../utils/inventoryFifo";
import { ignoreBackdropClose } from "../../utils/muiDialogClose";

type FormState = {
  item: InventoryItem | null;
  date: Dayjs;
  pieces: string;
  pricePerPiece: string;
  dateOfPrice: Dayjs;
};

type UsageFilter = "all" | "used" | "unused";

const USAGE_FILTER_OPTIONS: Array<{ value: UsageFilter; label: string }> = [
  { value: "all", label: "All entries" },
  { value: "used", label: "Already used" },
  { value: "unused", label: "Not yet used" },
];

const emptyForm = (): FormState => ({
  item: null,
  date: dayjs(),
  pieces: "",
  pricePerPiece: "",
  dateOfPrice: dayjs(),
});

const ManageInventoryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [editing, setEditing] = useState<InventoryRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const {
    tableContainerRef,
    onPageChange: makePageChange,
    onRowsPerPageChange: makeRowsChange,
  } = usePaginatedTableScroll();

  const [filterItem, setFilterItem] = useState<InventoryItem | null>(null);
  const [filterFrom, setFilterFrom] = useState<Dayjs | null>(null);
  const [filterTo, setFilterTo] = useState<Dayjs | null>(null);
  const [filterUsage, setFilterUsage] = useState<UsageFilter>("all");

  const itemById = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    items.forEach((i) => map.set(i.id, i));
    return map;
  }, [items]);

  const lotConsumptionByRecordId = useMemo(
    () =>
      getLotConsumptionByRecordId({
        inventoryRecords: records,
        consumptionRecords: inventoryConsumptionFromExpenses(expenseRecords),
      }),
    [expenseRecords, records],
  );

  const isRecordLockedByUsage = useCallback(
    (recordId: string): boolean =>
      (lotConsumptionByRecordId.get(recordId)?.consumedPieces ?? 0) >= 1,
    [lotConsumptionByRecordId],
  );

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (filterItem && record.itemId !== filterItem.id) return false;

      const recordDate = dayjs(record.date);
      if (filterFrom && filterFrom.isValid()) {
        if (
          !recordDate.isValid() ||
          recordDate.isBefore(filterFrom.startOf("day"))
        ) {
          return false;
        }
      }
      if (filterTo && filterTo.isValid()) {
        if (
          !recordDate.isValid() ||
          recordDate.isAfter(filterTo.endOf("day"))
        ) {
          return false;
        }
      }

      if (filterUsage !== "all") {
        const used =
          (lotConsumptionByRecordId.get(record.id)?.consumedPieces ?? 0) >= 1;
        if (filterUsage === "used" && !used) return false;
        if (filterUsage === "unused" && used) return false;
      }

      return true;
    });
  }, [
    records,
    filterItem,
    filterFrom,
    filterTo,
    filterUsage,
    lotConsumptionByRecordId,
  ]);

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

  useEffect(() => {
    setPage(0);
  }, [records.length]);

  useEffect(() => {
    setPage(0);
  }, [filterItem, filterFrom, filterTo, filterUsage]);

  const paged = useMemo(() => {
    return filteredRecords.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage,
    );
  }, [filteredRecords, page, rowsPerPage]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogError(null);
    setDialogOpen(true);
  };

  const openEdit = (record: InventoryRecord) => {
    if (isRecordLockedByUsage(record.id)) return;
    setEditing(record);
    setForm({
      item: itemById.get(record.itemId) || null,
      date: dayjs(record.date || new Date()),
      pieces: String(record.pieces ?? ""),
      pricePerPiece: String(record.pricePerPiece ?? ""),
      dateOfPrice: dayjs(record.dateOfPrice || new Date()),
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
    if (!Number.isFinite(pieces) || pieces < 0) return "Pieces must be 0 or more.";
    const price = Number(form.pricePerPiece);
    if (!Number.isFinite(price) || price < 0)
      return "Price per piece must be 0 or more.";
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
        const payload: UpdateInventoryRecordPayload = {
          itemId: form.item?.id,
          date: form.date.toISOString(),
          pieces: Number(form.pieces),
          pricePerPiece: Number(form.pricePerPiece),
          dateOfPrice: form.dateOfPrice.toISOString(),
        };
        await inventoryRecordService.update(editing.id, payload);
      } else {
        const payload: CreateInventoryRecordPayload = {
          itemId: form.item!.id,
          date: form.date.toISOString(),
          pieces: Number(form.pieces),
          pricePerPiece: Number(form.pricePerPiece),
          dateOfPrice: form.dateOfPrice.toISOString(),
        };
        await inventoryRecordService.create(payload);
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
      await inventoryRecordService.delete(deleteId);
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
        <Typography variant="h6">Manage Inventory</Typography>
        <Button variant="contained" onClick={openCreate} disabled={loading}>
          Add Inventory Record
        </Button>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2, mb: 2 }}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
            flexWrap="wrap"
            useFlexGap
          >
            <Autocomplete
              options={items}
              value={filterItem}
              onChange={(_, value) => setFilterItem(value)}
              getOptionLabel={(option) => option.name || ""}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              sx={{ minWidth: 220 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Filter Item"
                  size="small"
                  placeholder="All items"
                />
              )}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="usage-filter-label">Usage</InputLabel>
              <Select
                labelId="usage-filter-label"
                label="Usage"
                value={filterUsage}
                onChange={(e) => setFilterUsage(e.target.value as UsageFilter)}
              >
                {USAGE_FILTER_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <DatePicker
              label="From Date"
              value={filterFrom}
              onChange={(value) => setFilterFrom(value)}
              slotProps={{
                textField: { size: "small", sx: { width: { xs: "100%", sm: 180 } } },
                field: { clearable: true, onClear: () => setFilterFrom(null) },
              }}
            />
            <DatePicker
              label="To Date"
              value={filterTo}
              onChange={(value) => setFilterTo(value)}
              minDate={filterFrom ?? undefined}
              slotProps={{
                textField: { size: "small", sx: { width: { xs: "100%", sm: 180 } } },
                field: { clearable: true, onClear: () => setFilterTo(null) },
              }}
            />
            {filterItem || filterFrom || filterTo || filterUsage !== "all" ? (
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setFilterItem(null);
                  setFilterFrom(null);
                  setFilterTo(null);
                  setFilterUsage("all");
                }}
              >
                {UI_TEXT.CLEAR}
              </Button>
            ) : null}
          </Stack>
        </LocalizationProvider>
      </Paper>

      <Paper>
        {loading ? (
          <TableContainer
            ref={tableContainerRef}
            sx={{ maxHeight: "calc(100vh - 260px)" }}
          >
            <Table size="small" stickyHeader>
              <TableHeaderSkeleton columns={6} />
              <TableSkeleton columns={6} rows={8} />
            </Table>
          </TableContainer>
        ) : (
          <>
            <TableContainer
              ref={tableContainerRef}
              sx={{ maxHeight: "calc(100vh - 260px)" }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Pieces</TableCell>
                    <TableCell align="right">Remaining pcs</TableCell>
                    <TableCell align="right">Price / piece</TableCell>
                    <TableCell align="right">Total Price</TableCell>
                    <TableCell>Date of Price</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paged.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No inventory records.
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
                          {lotConsumptionByRecordId.get(record.id)
                            ?.remainingPieces ?? record.pieces}
                        </TableCell>
                        <TableCell align="right">
                          {new Intl.NumberFormat("en-PH", {
                            style: "currency",
                            currency: "PHP",
                          }).format(Number(record.pricePerPiece) || 0)}
                        </TableCell>
                        <TableCell align="right">
                          {new Intl.NumberFormat("en-PH", {
                            style: "currency",
                            currency: "PHP",
                          }).format(
                            (Number(record.pieces) || 0) *
                              (Number(record.pricePerPiece) || 0),
                          )}
                        </TableCell>
                        <TableCell>
                          {dayjs(record.dateOfPrice).isValid()
                            ? dayjs(record.dateOfPrice).format("MM-DD-YY h:mm A")
                            : "-"}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            color="success"
                            onClick={() => openEdit(record)}
                            disabled={isRecordLockedByUsage(record.id)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => setDeleteId(record.id)}
                            disabled={isRecordLockedByUsage(record.id)}
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
              onPageChange={makePageChange(setPage)}
              onRowsPerPageChange={makeRowsChange(setRowsPerPage, setPage)}
            />
          </>
        )}
      </Paper>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Confirm Delete"
        message="Are you sure you want to delete this inventory record?"
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
        <DialogTitle>
          {editing ? "Edit Inventory Record" : "Add Inventory Record"}
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
                  onChange={(_, value) => setForm((prev) => ({ ...prev, item: value }))}
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
                />
              </Grid>

              <Grid size={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Price per piece"
                  value={form.pricePerPiece}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      pricePerPiece: e.target.value,
                    }))
                  }
                />
              </Grid>

              <Grid size={12}>
                <DateTimePicker
                  label="Date of Price"
                  value={form.dateOfPrice}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, dateOfPrice: value || dayjs() }))
                  }
                  slotProps={{
                    textField: { fullWidth: true, size: "small" },
                  }}
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

export default ManageInventoryPage;

