import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Stack,
  Switch,
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
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import { usePaginatedTableScroll } from "../../hooks/usePaginatedTableScroll";
import {
  TableHeaderSkeleton,
  TableSkeleton,
} from "../../components/Skeletons/SkeletonComponents";
import { API_ERRORS, UI_TEXT } from "../../constants/messages";
import { toTitleCaseWords } from "../../utils/stringUtils";
import fixedMonthlyExpenseService, {
  type CreateFixedMonthlyExpensePayload,
  type FixedMonthlyExpense,
  type UpdateFixedMonthlyExpensePayload,
} from "../../services/fixedMonthlyExpenseService";
import { ignoreBackdropClose } from "../../utils/muiDialogClose";

const formatCurrency = (value: number): string =>
  `₱${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

type FormState = {
  name: string;
  monthlyAmount: string;
  isActive: boolean;
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  monthlyAmount: "",
  isActive: true,
  notes: "",
};

const FixedMonthlyExpensesPage: React.FC = () => {
  const [items, setItems] = useState<FixedMonthlyExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [editing, setEditing] = useState<FixedMonthlyExpense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const {
    tableContainerRef,
    onPageChange: makePageChange,
    onRowsPerPageChange: makeRowsChange,
  } = usePaginatedTableScroll();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fixedMonthlyExpenseService.getAll();
      setItems(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : API_ERRORS.SAVE_FAILED);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [items.length]);

  const pagedItems = useMemo(() => {
    return items.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [items, page, rowsPerPage]);

  const monthlyTotalActive = useMemo(
    () =>
      items
        .filter((i) => i.isActive)
        .reduce((s, i) => s + i.monthlyAmount, 0),
    [items],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogError(null);
    setDialogOpen(true);
  };

  const openEdit = (item: FixedMonthlyExpense) => {
    setEditing(item);
    setForm({
      name: item.name || "",
      monthlyAmount: String(item.monthlyAmount ?? ""),
      isActive: Boolean(item.isActive),
      notes: item.notes || "",
    });
    setDialogError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setDialogError(null);
  };

  const validateForm = (): string | null => {
    if (!form.name.trim()) return "Name is required.";
    const amt = Number(form.monthlyAmount);
    if (!Number.isFinite(amt) || amt < 0) return "Enter a valid monthly amount (0 or more).";
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setDialogError(validationError);
      return;
    }

    const amount = Number(form.monthlyAmount);

    try {
      setSubmitting(true);
      setDialogError(null);
      setError(null);

      if (editing) {
        const payload: UpdateFixedMonthlyExpensePayload = {
          name: toTitleCaseWords(form.name.trim()),
          monthlyAmount: amount,
          isActive: form.isActive,
          notes: form.notes.trim() || null,
        };
        await fixedMonthlyExpenseService.update(editing.id, payload);
      } else {
        const payload: CreateFixedMonthlyExpensePayload = {
          name: toTitleCaseWords(form.name.trim()),
          monthlyAmount: amount,
          isActive: form.isActive,
          notes: form.notes.trim() || undefined,
        };
        await fixedMonthlyExpenseService.create(payload);
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
      await fixedMonthlyExpenseService.delete(deleteId);
      setDeleteId(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : API_ERRORS.SAVE_FAILED);
      setDeleteId(null);
    }
  };

  const toggleActiveRow = async (item: FixedMonthlyExpense) => {
    try {
      setError(null);
      await fixedMonthlyExpenseService.update(item.id, {
        isActive: !item.isActive,
      });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : API_ERRORS.SAVE_FAILED);
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
      <Paper sx={{ p: { xs: 2, md: 3 }, maxWidth: 960 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          gap={2}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h6">Fixed monthly expenses</Typography>
            <Typography variant="body2" color="text.secondary">
              Recurring costs counted once per calendar month in Sales Report and
              the Sales & Expense Graph (e.g. house rental). Inactive lines are
              excluded from totals.
            </Typography>
          </Box>
          <Button variant="contained" onClick={openCreate} disabled={loading}>
            Add fixed expense
          </Button>
        </Stack>

        {!loading && items.length > 0 ? (
          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>Active total per month:</strong> {formatCurrency(monthlyTotalActive)}
          </Typography>
        ) : null}

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Stack spacing={1}>
            <TableHeaderSkeleton columns={6} />
            <TableSkeleton rows={6} columns={6} />
          </Stack>
        ) : (
          <>
            <TableContainer ref={tableContainerRef}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell align="right">Monthly amount</TableCell>
                    <TableCell>Active</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No fixed monthly expenses yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedItems.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.name}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(row.monthlyAmount)}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Switch
                              size="small"
                              checked={row.isActive}
                              onChange={() => void toggleActiveRow(row)}
                              inputProps={{ "aria-label": `Active ${row.name}` }}
                            />
                            <Chip
                              size="small"
                              label={row.isActive ? "On" : "Off"}
                              color={row.isActive ? "success" : "default"}
                              variant={row.isActive ? "filled" : "outlined"}
                            />
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 280 }}>
                          <Typography variant="body2" noWrap title={row.notes || ""}>
                            {row.notes || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => openEdit(row)}
                            aria-label="Edit"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteId(row.id)}
                            aria-label="Delete"
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
            {items.length > 0 ? (
              <TablePagination
                component="div"
                count={items.length}
                page={page}
                onPageChange={makePageChange(setPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={makeRowsChange(setRowsPerPage, setPage)}
                rowsPerPageOptions={[10, 25, 50]}
              />
            ) : null}
          </>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={ignoreBackdropClose(closeDialog)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit fixed expense" : "Add fixed expense"}</DialogTitle>
        <DialogContent>
          {dialogError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {dialogError}
            </Alert>
          ) : null}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                fullWidth
                required
                placeholder="e.g. House rental"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Monthly amount"
                type="number"
                value={form.monthlyAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, monthlyAmount: e.target.value }))
                }
                fullWidth
                required
                inputProps={{ min: 0, step: "0.01" }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex", alignItems: "center" }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isActive: e.target.checked }))
                    }
                  />
                }
                label="Active (count in monthly totals)"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                fullWidth
                multiline
                minRows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete fixed expense?"
        message="Remove this line from fixed monthly expenses?"
        confirmText={UI_TEXT.DELETE}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
      />
    </Box>
  );
};

export default FixedMonthlyExpensesPage;
