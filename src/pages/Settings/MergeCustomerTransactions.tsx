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
  Grid,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import TransactionListTable, {
  type TransactionListColumnKey,
} from "../../components/TransactionListTable/TransactionListTable";
import {
  API_ERRORS,
  CONFIRM_MESSAGES,
  UI_TEXT,
} from "../../constants/messages";
import addonsPricingService, {
  type AddonsPricing,
} from "../../services/addonsPricingService";
import customerService, { type Customer } from "../../services/customerService";
import transactionService, {
  type Transaction,
} from "../../services/transactionService";
import { ignoreBackdropClose } from "../../utils/muiDialogClose";

const MERGE_COLUMNS: TransactionListColumnKey[] = [
  "customer",
  "kg",
  "loads",
  "price",
  "datePaid",
  "datePickup",
];

const MERGE_COLUMN_LABELS = {
  customer: "Name",
  datePaid: "Date Paid",
} as const;

const MERGE_CONFIRM_TEXT = "MERGE";

const MergeCustomerTransactionsPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sourceCustomer, setSourceCustomer] = useState<Customer | null>(null);
  const [targetCustomer, setTargetCustomer] = useState<Customer | null>(null);
  const [sourceTransactions, setSourceTransactions] = useState<Transaction[]>(
    [],
  );
  const [targetTransactions, setTargetTransactions] = useState<Transaction[]>(
    [],
  );
  const [addonsPricing, setAddonsPricing] = useState<AddonsPricing | null>(
    null,
  );
  const [sourceLoading, setSourceLoading] = useState(false);
  const [targetLoading, setTargetLoading] = useState(false);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [sourcePage, setSourcePage] = useState(0);
  const [targetPage, setTargetPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    return customerService.subscribeToCustomerLookup(setCustomers);
  }, []);

  useEffect(() => {
    void addonsPricingService
      .get()
      .then(setAddonsPricing)
      .catch(() => {
        setAddonsPricing(null);
      });
  }, []);

  const loadSourceTransactions = useCallback(async (customerId: string) => {
    try {
      setSourceLoading(true);
      setError(null);
      const rows = await transactionService.getAll({
        customerId,
        includeDeleted: true,
      });
      setSourceTransactions(rows);
      setSourcePage(0);
    } catch (err: unknown) {
      setSourceTransactions([]);
      setError(
        err instanceof Error
          ? err.message
          : API_ERRORS.FETCH_TRANSACTIONS_FAILED,
      );
    } finally {
      setSourceLoading(false);
    }
  }, []);

  const loadTargetTransactions = useCallback(async (customerId: string) => {
    try {
      setTargetLoading(true);
      setError(null);
      const rows = await transactionService.getAll({ customerId });
      setTargetTransactions(rows);
      setTargetPage(0);
    } catch (err: unknown) {
      setTargetTransactions([]);
      setError(
        err instanceof Error
          ? err.message
          : API_ERRORS.FETCH_TRANSACTIONS_FAILED,
      );
    } finally {
      setTargetLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sourceCustomer?.id) {
      setSourceTransactions([]);
      return;
    }
    void loadSourceTransactions(sourceCustomer.id);
  }, [sourceCustomer, loadSourceTransactions]);

  useEffect(() => {
    if (!targetCustomer?.id) {
      setTargetTransactions([]);
      return;
    }
    void loadTargetTransactions(targetCustomer.id);
  }, [targetCustomer, loadTargetTransactions]);

  useEffect(() => {
    if (
      targetCustomer &&
      sourceCustomer &&
      targetCustomer.id === sourceCustomer.id
    ) {
      setTargetCustomer(null);
    }
  }, [sourceCustomer, targetCustomer]);

  const targetCustomerOptions = useMemo(
    () =>
      sourceCustomer
        ? customers.filter((customer) => customer.id !== sourceCustomer.id)
        : customers,
    [customers, sourceCustomer],
  );

  const canMerge =
    Boolean(sourceCustomer?.id) &&
    Boolean(targetCustomer?.id) &&
    sourceCustomer?.id !== targetCustomer?.id;

  const resetForm = () => {
    setSourceCustomer(null);
    setTargetCustomer(null);
    setSourceTransactions([]);
    setTargetTransactions([]);
    setConfirmText("");
    setConfirmOpen(false);
  };

  const handleMerge = async () => {
    if (!sourceCustomer?.id || !targetCustomer?.id) return;
    if (confirmText !== MERGE_CONFIRM_TEXT) return;

    try {
      setMergeLoading(true);
      setError(null);
      const result = await customerService.mergeTransactions(
        sourceCustomer.id,
        targetCustomer.id,
      );
      setSuccess(
        UI_TEXT.MERGE_SUCCESS(
          result.movedCount,
          result.sourceName,
          result.targetName,
        ),
      );
      resetForm();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : API_ERRORS.MERGE_CUSTOMERS_FAILED,
      );
    } finally {
      setMergeLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
        {UI_TEXT.MERGE_CUSTOMER_TRANSACTIONS_TITLE}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Reassign all transactions from one customer to another, then delete the
        source customer record.
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 700 }}>
              {UI_TEXT.FROM_CUSTOMER}
            </Typography>
            <Autocomplete
              size="small"
              options={customers}
              value={sourceCustomer}
              onChange={(_, value) => setSourceCustomer(value)}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) => option.name || ""}
              renderInput={(params) => (
                <TextField {...params} label={UI_TEXT.SELECT_CUSTOMER} />
              )}
              sx={{ mb: 1.5 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {UI_TEXT.TRANSACTIONS_TO_MOVE(sourceTransactions.length)}
            </Typography>
            <TransactionListTable
              transactions={sourceTransactions}
              addonsPricing={addonsPricing ?? undefined}
              loading={sourceLoading}
              visibleColumns={MERGE_COLUMNS}
              columnLabels={MERGE_COLUMN_LABELS}
              emptyMessage="No transactions for this customer."
              page={sourcePage}
              rowsPerPage={rowsPerPage}
              onPageChange={setSourcePage}
              onRowsPerPageChange={(nextRowsPerPage) => {
                setRowsPerPage(nextRowsPerPage);
                setSourcePage(0);
                setTargetPage(0);
              }}
            />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 700 }}>
              {UI_TEXT.TO_CUSTOMER}
            </Typography>
            <Autocomplete
              size="small"
              options={targetCustomerOptions}
              value={targetCustomer}
              onChange={(_, value) => setTargetCustomer(value)}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) => option.name || ""}
              renderInput={(params) => (
                <TextField {...params} label={UI_TEXT.SELECT_CUSTOMER} />
              )}
              sx={{ mb: 1.5 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {UI_TEXT.TARGET_TRANSACTION_COUNT(targetTransactions.length)}
            </Typography>
            <TransactionListTable
              transactions={targetTransactions}
              addonsPricing={addonsPricing ?? undefined}
              loading={targetLoading}
              visibleColumns={MERGE_COLUMNS}
              columnLabels={MERGE_COLUMN_LABELS}
              emptyMessage="No transactions for this customer."
              page={targetPage}
              rowsPerPage={rowsPerPage}
              onPageChange={setTargetPage}
              onRowsPerPageChange={(nextRowsPerPage) => {
                setRowsPerPage(nextRowsPerPage);
                setSourcePage(0);
                setTargetPage(0);
              }}
            />
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
        <Button
          variant="contained"
          color="error"
          disabled={!canMerge || mergeLoading}
          onClick={() => {
            setConfirmText("");
            setConfirmOpen(true);
          }}
        >
          {UI_TEXT.MERGE_CUSTOMER_TRANSACTIONS}
        </Button>
      </Box>

      <Dialog
        open={confirmOpen}
        onClose={ignoreBackdropClose(() => {
          if (mergeLoading) return;
          setConfirmOpen(false);
          setConfirmText("");
        })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{UI_TEXT.MERGE_CONFIRM_TITLE}</DialogTitle>
        <DialogContent>
          {sourceCustomer && targetCustomer ? (
            <Typography sx={{ mb: 1.5 }}>
              {CONFIRM_MESSAGES.MERGE_CUSTOMER_TRANSACTIONS(
                sourceCustomer.name,
                targetCustomer.name,
                sourceTransactions.length,
              )}
            </Typography>
          ) : null}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {UI_TEXT.MERGE_CONFIRM_TYPING}
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder={UI_TEXT.MERGE_CONFIRM_PLACEHOLDER}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setConfirmOpen(false);
              setConfirmText("");
            }}
            disabled={mergeLoading}
          >
            {UI_TEXT.CANCEL}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleMerge()}
            disabled={mergeLoading || confirmText !== MERGE_CONFIRM_TEXT}
          >
            {mergeLoading ? "Merging…" : UI_TEXT.MERGE_CONFIRM_ACTION}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(success)}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MergeCustomerTransactionsPage;
