import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import TransactionListTable from "../../components/TransactionListTable/TransactionListTable";
import { API_ERRORS, CONFIRM_MESSAGES, UI_TEXT } from "../../constants/messages";
import { ignoreBackdropClose } from "../../utils/muiDialogClose";
import addonsPricingService, {
  type AddonsPricing,
} from "../../services/addonsPricingService";
import transactionService, {
  type Transaction,
} from "../../services/transactionService";

const CURRENT_YEAR = dayjs().year();
const YEAR_OPTIONS = Array.from({ length: 12 }, (_, index) => CURRENT_YEAR - index);
const ARCHIVE_CONFIRM_TEXT = "ARCHIVE";

const ArchiveRecordPage: React.FC = () => {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [addonsPricing, setAddonsPricing] = useState<AddonsPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveConfirmText, setArchiveConfirmText] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [candidates, pricing] = await Promise.all([
        transactionService.getArchiveCandidates(year),
        addonsPricingService.get(),
      ]);
      setTransactions(candidates);
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
  }, [year]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const archiveMessage = useMemo(
    () => CONFIRM_MESSAGES.ARCHIVE_TRANSACTIONS(year, transactions.length),
    [year, transactions.length],
  );

  const handleArchiveAll = async () => {
    if (archiveConfirmText !== ARCHIVE_CONFIRM_TEXT) return;

    try {
      setArchiving(true);
      setError(null);
      const { archivedCount } = await transactionService.archiveByYear(year);
      setArchiveOpen(false);
      setArchiveConfirmText("");
      setSuccess(`Archived ${archivedCount} transaction(s) from ${year}.`);
      await loadData();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : API_ERRORS.UPDATE_TRANSACTION_FAILED,
      );
    } finally {
      setArchiving(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Archive Record
        </Typography>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="archive-year-label">Year</InputLabel>
            <Select
              labelId="archive-year-label"
              label="Year"
              value={year}
              onChange={(event) => {
                setYear(Number(event.target.value));
                setPage(0);
              }}
            >
              {YEAR_OPTIONS.map((optionYear) => (
                <MenuItem key={optionYear} value={optionYear}>
                  {optionYear}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            disabled={loading || archiving || transactions.length === 0}
            onClick={() => setArchiveOpen(true)}
          >
            Archive all
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2 }}>
        <TransactionListTable
          title="Archive List"
          transactions={transactions}
          addonsPricing={addonsPricing ?? undefined}
          loading={loading}
          emptyMessage={`No completed transactions found for ${year}.`}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(value) => {
            setRowsPerPage(value);
            setPage(0);
          }}
        />
      </Paper>

      <Dialog
        open={archiveOpen}
        onClose={ignoreBackdropClose(() => {
          if (archiving) return;
          setArchiveOpen(false);
          setArchiveConfirmText("");
        })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Archive</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1.5 }}>{archiveMessage}</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Type {ARCHIVE_CONFIRM_TEXT} to confirm.
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={archiveConfirmText}
            onChange={(event) => setArchiveConfirmText(event.target.value)}
            placeholder={ARCHIVE_CONFIRM_TEXT}
            disabled={archiving}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setArchiveOpen(false);
              setArchiveConfirmText("");
            }}
            disabled={archiving}
          >
            {UI_TEXT.CANCEL}
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleArchiveAll()}
            disabled={
              archiving || archiveConfirmText !== ARCHIVE_CONFIRM_TEXT
            }
          >
            {archiving ? "Archiving..." : "Archive all"}
          </Button>
        </DialogActions>
      </Dialog>

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

export default ArchiveRecordPage;
