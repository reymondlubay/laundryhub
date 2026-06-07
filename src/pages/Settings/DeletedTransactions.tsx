import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Paper,
  Snackbar,
  Typography,
} from "@mui/material";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import TransactionListTable, {
  TransactionListActionButton,
} from "../../components/TransactionListTable/TransactionListTable";
import {
  API_ERRORS,
  CONFIRM_MESSAGES,
  UI_TEXT,
} from "../../constants/messages";
import addonsPricingService, {
  type AddonsPricing,
} from "../../services/addonsPricingService";
import transactionService, {
  type Transaction,
} from "../../services/transactionService";

const DeletedTransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [addonsPricing, setAddonsPricing] = useState<AddonsPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [deleted, pricing] = await Promise.all([
        transactionService.getDeleted(),
        addonsPricingService.get(),
      ]);
      setTransactions(deleted);
      setAddonsPricing(pricing);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : API_ERRORS.FETCH_TRANSACTIONS_FAILED,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleRestore = async () => {
    if (!restoreId) return;
    try {
      setActionLoading(true);
      setError(null);
      await transactionService.restore(restoreId);
      setRestoreId(null);
      setSuccess("Transaction restored successfully.");
      await loadData();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : API_ERRORS.UPDATE_TRANSACTION_FAILED,
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteId) return;
    try {
      setActionLoading(true);
      setError(null);
      await transactionService.permanentDelete(deleteId);
      setDeleteId(null);
      setSuccess("Transaction permanently deleted.");
      await loadData();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : API_ERRORS.DELETE_TRANSACTION_FAILED,
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        Deleted Transactions
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2 }}>
        <TransactionListTable
          transactions={transactions}
          addonsPricing={addonsPricing ?? undefined}
          loading={loading}
          showDeletedDate
          emptyMessage="No deleted transactions found."
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(value) => {
            setRowsPerPage(value);
            setPage(0);
          }}
          renderActions={(row) => (
            <>
              <TransactionListActionButton
                label="Undelete"
                onClick={() => setRestoreId(row.id)}
                disabled={actionLoading}
              />
              <TransactionListActionButton
                label={UI_TEXT.DELETE}
                color="error"
                onClick={() => setDeleteId(row.id)}
                disabled={actionLoading}
              />
            </>
          )}
        />
      </Paper>

      <ConfirmDialog
        open={Boolean(restoreId)}
        title="Confirm Undelete"
        message={CONFIRM_MESSAGES.RESTORE_TRANSACTION}
        confirmText="Undelete"
        confirmColor="primary"
        onClose={() => setRestoreId(null)}
        onConfirm={() => void handleRestore()}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Confirm Permanent Delete"
        message={CONFIRM_MESSAGES.PERMANENT_DELETE_TRANSACTION}
        confirmText={UI_TEXT.DELETE}
        onClose={() => setDeleteId(null)}
        onConfirm={() => void handlePermanentDelete()}
      />

      <Snackbar
        open={Boolean(success)}
        autoHideDuration={4000}
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

export default DeletedTransactionsPage;
