import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import inventoryItemService, {
  type CreateInventoryItemPayload,
  type InventoryItem,
  type UpdateInventoryItemPayload,
} from "../../services/inventoryItemService";
import { ignoreBackdropClose } from "../../utils/muiDialogClose";

type InventoryItemFormState = {
  name: string;
  notes: string;
  defaultPieces: string;
};

const emptyForm: InventoryItemFormState = {
  name: "",
  notes: "",
  defaultPieces: "",
};

const InventoryItemsPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<InventoryItemFormState>(emptyForm);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await inventoryItemService.getAll();
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

  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setForm({
      name: item.name || "",
      notes: item.notes || "",
      defaultPieces:
        item.defaultPieces != null && Number(item.defaultPieces) >= 1
          ? String(Math.floor(Number(item.defaultPieces)))
          : "",
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
    if (!form.name.trim()) return "Item Name is required.";
    if (form.defaultPieces.trim()) {
      const n = Math.floor(Number(form.defaultPieces));
      if (!Number.isFinite(n) || n < 1) {
        return "Default pieces must be 1 or more when set.";
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
        const payload: UpdateInventoryItemPayload = {
          name: toTitleCaseWords(form.name.trim()),
          notes: form.notes.trim() || undefined,
          ...(form.defaultPieces.trim() === ""
            ? { defaultPieces: null }
            : {
                defaultPieces: Math.max(
                  1,
                  Math.floor(Number(form.defaultPieces)),
                ),
              }),
        };
        await inventoryItemService.update(editing.id, payload);
      } else {
        const payload: CreateInventoryItemPayload = {
          name: toTitleCaseWords(form.name.trim()),
          notes: form.notes.trim() || undefined,
          ...(form.defaultPieces.trim() !== ""
            ? {
                defaultPieces: Math.max(
                  1,
                  Math.floor(Number(form.defaultPieces)),
                ),
              }
            : {}),
        };
        await inventoryItemService.create(payload);
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
      await inventoryItemService.delete(deleteId);
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
        <Typography variant="h6">Inventory Items</Typography>
        <Button variant="contained" onClick={openCreate} disabled={loading}>
          Add Inventory Item
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
              <TableHeaderSkeleton columns={4} />
              <TableSkeleton columns={4} rows={8} />
            </Table>
          </TableContainer>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: "calc(100vh - 260px)" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Item Name</TableCell>
                    <TableCell align="right">Default pieces</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No inventory items.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.name || "-"}</TableCell>
                        <TableCell align="right">
                          {item.defaultPieces != null &&
                          Number.isFinite(Number(item.defaultPieces))
                            ? String(Math.floor(Number(item.defaultPieces)))
                            : "-"}
                        </TableCell>
                        <TableCell>{item.notes || "-"}</TableCell>
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
        message="Are you sure you want to delete this item?"
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
          {editing ? "Edit Inventory Item" : "Add Inventory Item"}
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
                label="Item Name"
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
                label="Default pieces (optional)"
                value={form.defaultPieces}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    defaultPieces: e.target.value,
                  }))
                }
                inputProps={{ min: 1, inputMode: "numeric" }}
                helperText="Prefills Record Expense when this inventory item is selected."
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

export default InventoryItemsPage;

