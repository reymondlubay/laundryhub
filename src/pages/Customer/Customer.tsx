import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  API_ERRORS,
  CONFIRM_MESSAGES,
  EMPTY_STATES,
  FORM_ERRORS,
  UI_TEXT,
} from "../../constants/messages";
import customerService, {
  type CreateCustomerPayload,
  type Customer,
  type UpdateCustomerPayload,
} from "../../services/customerService";

type CustomerFormState = {
  name: string;
  mobileNumber: string;
  address: string;
  notes: string;
};

const emptyForm: CustomerFormState = {
  name: "",
  mobileNumber: "",
  address: "",
  notes: "",
};

const CustomerPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerFormState>(emptyForm);

  const loadCustomers = useCallback(async (searchTerm = "") => {
    try {
      setLoading(true);
      setError(null);
      const data = await customerService.getAll(searchTerm);
      setCustomers(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : API_ERRORS.LOAD_CUSTOMERS_FAILED;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const handleSearch = () => {
    const nextSearch = searchInput.trim();
    setActiveSearch(nextSearch);
    void loadCustomers(nextSearch);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setActiveSearch("");
    void loadCustomers();
  };

  const openCreate = () => {
    setEditingCustomer(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name || "",
      mobileNumber: customer.mobileNumber || "",
      address: customer.address || "",
      notes: customer.notes || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCustomer(null);
    setForm(emptyForm);
  };

  const validateForm = (): string | null => {
    if (!form.name.trim()) return FORM_ERRORS.REQUIRED_CUSTOMER_NAME;
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (editingCustomer) {
        const payload: UpdateCustomerPayload = {
          name: form.name.trim(),
          mobileNumber: form.mobileNumber.trim() || undefined,
          address: form.address.trim() || undefined,
          notes: form.notes.trim() || undefined,
        };

        await customerService.update(editingCustomer.id, payload);
      } else {
        const payload: CreateCustomerPayload = {
          name: form.name.trim(),
          mobileNumber: form.mobileNumber.trim() || undefined,
          address: form.address.trim() || undefined,
          notes: form.notes.trim() || undefined,
        };

        await customerService.create(payload);
      }

      closeDialog();
      await loadCustomers(activeSearch);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : API_ERRORS.SAVE_FAILED;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (customerId: string) => {
    const confirmed = window.confirm(CONFIRM_MESSAGES.DELETE_CUSTOMER);
    if (!confirmed) return;

    try {
      setError(null);
      await customerService.delete(customerId);
      await loadCustomers(activeSearch);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : API_ERRORS.DELETE_CUSTOMER_FAILED;
      setError(message);
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
        <Typography variant="h6">Customers</Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Search customer"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
          />
          <Button variant="outlined" onClick={handleSearch} disabled={loading}>
            {UI_TEXT.SEARCH}
          </Button>
          <Button
            variant="text"
            onClick={handleClearSearch}
            disabled={loading || (!searchInput && !activeSearch)}
          >
            {UI_TEXT.CLEAR}
          </Button>
          <Button variant="contained" onClick={openCreate} disabled={loading}>
            Add New Customer
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
          <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Mobile</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      {EMPTY_STATES.NO_CUSTOMERS}
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>{customer.name || "-"}</TableCell>
                      <TableCell>{customer.mobileNumber || "-"}</TableCell>
                      <TableCell>{customer.address || "-"}</TableCell>
                      <TableCell>{customer.notes || "-"}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          color="success"
                          onClick={() => openEdit(customer)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(customer.id)}
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
        )}
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{ component: "form", autoComplete: "off" }}
      >
        <DialogTitle>
          {editingCustomer ? "Edit Customer" : "Add New Customer"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                size="small"
                label="Customer Name"
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
                label="Mobile Number"
                value={form.mobileNumber}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, mobileNumber: e.target.value }))
                }
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                size="small"
                label="Address"
                value={form.address}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, address: e.target.value }))
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

export default CustomerPage;
