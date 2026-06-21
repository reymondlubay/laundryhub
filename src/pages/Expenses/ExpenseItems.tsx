import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
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
import {
  TableHeaderSkeleton,
  TableSkeleton,
} from "../../components/Skeletons/SkeletonComponents";
import { API_ERRORS, UI_TEXT } from "../../constants/messages";
import { toTitleCaseWords } from "../../utils/stringUtils";
import expenseItemService, {
  type CreateExpenseItemPayload,
  type ExpenseItem,
  type UpdateExpenseItemPayload,
} from "../../services/expenseItemService";
import { ignoreBackdropClose } from "../../utils/muiDialogClose";

type ExpenseItemFormState = {
  name: string;
  description: string;
  notes: string;
  isAdminOnly: boolean;
  piecesRequired: boolean;
};

const emptyForm: ExpenseItemFormState = {
  name: "",
  description: "",
  notes: "",
  isAdminOnly: false,
  piecesRequired: false,
};

const ExpenseItemsPage: React.FC = () => {
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ExpenseItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseItemFormState>(emptyForm);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await expenseItemService.getAll();
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

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogError(null);
    setDialogOpen(true);
  };

  const openEdit = (item: ExpenseItem) => {
    setEditing(item);
    setForm({
      name: item.name || "",
      description: item.description || "",
      notes: item.notes || "",
      isAdminOnly: Boolean(item.isAdminOnly),
      piecesRequired: Boolean(item.piecesRequired),
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
    if (!form.name.trim()) return "Expense Name is required.";
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
        const payload: UpdateExpenseItemPayload = {
          name: toTitleCaseWords(form.name.trim()),
          description: form.description.trim() || undefined,
          notes: form.notes.trim() || undefined,
          isAdminOnly: form.isAdminOnly,
          piecesRequired: form.piecesRequired,
        };
        await expenseItemService.update(editing.id, payload);
      } else {
        const payload: CreateExpenseItemPayload = {
          name: toTitleCaseWords(form.name.trim()),
          description: form.description.trim() || undefined,
          notes: form.notes.trim() || undefined,
          isAdminOnly: form.isAdminOnly,
          piecesRequired: form.piecesRequired,
        };
        await expenseItemService.create(payload);
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
      await expenseItemService.delete(deleteId);
      setDeleteId(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : API_ERRORS.SAVE_FAILED);
      setDeleteId(null);
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
        <Typography variant="h6">Expense Items</Typography>
        <Button variant="contained" onClick={openCreate} disabled={loading}>
          Add Expense Item
        </Button>
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
              <TableHeaderSkeleton columns={6} />
              <TableSkeleton columns={6} rows={8} />
            </Table>
          </TableContainer>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: "calc(100vh - 260px)" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell>Visibility</TableCell>
                    <TableCell>Pieces Required</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No expense items.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.name || "-"}</TableCell>
                        <TableCell>{item.description || "-"}</TableCell>
                        <TableCell>{item.notes || "-"}</TableCell>
                        <TableCell>
                          {item.isAdminOnly ? (
                            <Chip
                              size="small"
                              color="warning"
                              label="Admin only"
                            />
                          ) : (
                            <Chip size="small" label="All users" />
                          )}
                        </TableCell>
                        <TableCell>
                          {item.piecesRequired ? (
                            <Chip size="small" color="error" label="Required" />
                          ) : (
                            <Chip size="small" label="Optional" />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            color="success"
                            onClick={() => openEdit(item)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => setDeleteId(item.id)}
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
              count={items.length}
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
        message="Are you sure you want to delete this expense item?"
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
          {editing ? "Edit Expense Item" : "Add Expense Item"}
        </DialogTitle>
        <DialogContent>
          {dialogError ? (
            <Alert severity="error" sx={{ mb: 1 }}>
              {dialogError}
            </Alert>
          ) : null}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                size="small"
                label="Name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                size="small"
                label="Description"
                multiline
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                size="small"
                label="Notes"
                multiline
                rows={3}
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
                    checked={form.isAdminOnly}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        isAdminOnly: e.target.checked,
                      }))
                    }
                  />
                }
                label="Admin only (hidden from non-admin users when logging expenses)"
              />
            </Grid>
            <Grid size={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.piecesRequired}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        piecesRequired: e.target.checked,
                      }))
                    }
                  />
                }
                label="Pieces required when recording this expense"
              />
            </Grid>
          </Grid>
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

export default ExpenseItemsPage;
