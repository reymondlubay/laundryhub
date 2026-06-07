import React, { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import TransactionListTable from "../../components/TransactionListTable/TransactionListTable";
import { API_ERRORS, UI_TEXT } from "../../constants/messages";
import addonsPricingService, {
  type AddonsPricing,
} from "../../services/addonsPricingService";
import transactionService, {
  type Transaction,
} from "../../services/transactionService";

const CURRENT_YEAR = dayjs().year();
const YEAR_OPTIONS = Array.from(
  { length: 12 },
  (_, index) => CURRENT_YEAR - index,
);

const ArchiveListingPage: React.FC = () => {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [customerInput, setCustomerInput] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [addonsPricing, setAddonsPricing] = useState<AddonsPricing | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [archived, pricing] = await Promise.all([
        transactionService.getArchived(year, customerFilter),
        addonsPricingService.get(),
      ]);
      setTransactions(archived);
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
  }, [year, customerFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSearch = () => {
    setCustomerFilter(customerInput.trim());
    setPage(0);
  };

  const handleClearCustomer = () => {
    setCustomerInput("");
    setCustomerFilter("");
    setPage(0);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        Archive Listing
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
          flexWrap="wrap"
        >
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="archive-listing-year-label">Year</InputLabel>
            <Select
              labelId="archive-listing-year-label"
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

          <TextField
            size="small"
            label="Customer"
            value={customerInput}
            onChange={(event) => setCustomerInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSearch();
            }}
            sx={{ minWidth: { xs: "100%", sm: 220 } }}
          />

          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={handleSearch}>
              {UI_TEXT.SEARCH}
            </Button>
            {customerFilter ? (
              <Button variant="outlined" onClick={handleClearCustomer}>
                {UI_TEXT.CLEAR}
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

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
          emptyMessage={
            customerFilter
              ? `No archived transactions found for ${year} matching "${customerFilter}".`
              : `No archived transactions found for ${year}.`
          }
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(value) => {
            setRowsPerPage(value);
            setPage(0);
          }}
        />
      </Paper>
    </Box>
  );
};

export default ArchiveListingPage;
