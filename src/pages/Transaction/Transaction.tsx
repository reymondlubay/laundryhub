import React from "react";
import TransactionTable from "./components/TransactionTable";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  Stack,
  TextField,
  Typography,
  InputAdornment,
  IconButton,
  TablePagination,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import TransactionModal from "./components/TransactionModal/TransactionModal";
import type { Transaction } from "../../services/transactionService";
import { useTransactionSearch } from "./hooks/useTransactionSearch";

const Transaction = () => {
  const [openTransaction, setOpenTransaction] = React.useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    React.useState<Transaction | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [showPendingOnly, setShowPendingOnly] = React.useState(false);

  const {
    searchText,
    selectedMonth,
    transactions,
    page,
    rowsPerPage,
    totalCount,
    loading,
    error,
    setSearchText,
    setSelectedMonth,
    setPage,
    setRowsPerPage,
    search,
    clearCustomerAndSearch,
    clearFilters,
  } = useTransactionSearch(refreshKey);

  const handleOpenTransaction = () => {
    setSelectedTransaction(null);
    setOpenTransaction(true);
  };

  const handleCloseTransaction = () => {
    setOpenTransaction(false);
    setSelectedTransaction(null);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setOpenTransaction(true);
  };

  const handleSavedTransaction = () => {
    setRefreshKey((prev) => prev + 1);
    handleCloseTransaction();
  };

  const handleClearFilters = () => {
    setShowPendingOnly(false);
    clearFilters();
  };

  const filteredTransactions = React.useMemo(() => {
    if (!showPendingOnly) return transactions;

    return transactions.filter((transaction) => {
      const tx = transaction as Transaction & { dateloaded?: string | null };
      const loadedDate = transaction.dateLoaded || tx.dateloaded || null;
      return !loadedDate;
    });
  }, [showPendingOnly, transactions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") search();
  };

  return (
    <div>
      {/* Toolbar */}
      <Grid container spacing={1} alignItems="flex-start" sx={{ mb: 2 }}>
        {/* Customer search */}
        <Grid size={{ xs: 12, sm: "auto" }} sx={{ minWidth: { sm: 240 } }}>
          <Stack spacing={0.25}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search customer..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: searchText ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={clearCustomerAndSearch}
                        edge="end"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                },
              }}
            />
          </Stack>
        </Grid>

        {/* Month filter */}
        <Grid size={{ xs: 12, sm: "auto" }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Filter by month"
              views={["year", "month"]}
              openTo="month"
              value={selectedMonth}
              onChange={(val) => setSelectedMonth(val)}
              disabled={loading}
              slotProps={{
                textField: { size: "small" },
                field: {
                  clearable: true,
                  onClear: () => setSelectedMonth(null),
                },
              }}
            />
          </LocalizationProvider>
        </Grid>

        {/* Search button */}
        <Grid size="auto">
          <Button
            variant="contained"
            size="small"
            onClick={search}
            disabled={loading}
            startIcon={<SearchIcon />}
          >
            Search
          </Button>
        </Grid>

        {/* Clear filter */}
        <Grid size="auto">
          <Button
            variant="outlined"
            size="small"
            onClick={handleClearFilters}
            disabled={
              loading || (!searchText && !selectedMonth && !showPendingOnly)
            }
            startIcon={<ClearIcon />}
          >
            Clear
          </Button>
        </Grid>

        {/* Spacer + Add button */}
        <Grid size="grow" />
        <Grid size={{ xs: 12, sm: "auto" }}>
          <Button
            onClick={handleOpenTransaction}
            variant="contained"
            color="primary"
            size="small"
            fullWidth
          >
            Add New Transaction
          </Button>
        </Grid>
      </Grid>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1.5,
        }}
      >
        <FormControlLabel
          sx={{ m: 0 }}
          control={
            <Checkbox
              size="small"
              checked={showPendingOnly}
              onChange={(event) => setShowPendingOnly(event.target.checked)}
            />
          }
          label="Show pending"
        />
        <Stack direction="row" spacing={2} alignItems="center">
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box
              sx={{
                width: 10,
                height: 10,
                minWidth: 10,
                borderRadius: "50%",
                border: "1px solid rgba(0, 0, 0, 0.25)",
                backgroundColor: "#d8f0d2",
              }}
            />
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              Loaded
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box
              sx={{
                width: 10,
                height: 10,
                minWidth: 10,
                borderRadius: "50%",
                border: "1px solid rgba(0, 0, 0, 0.25)",
                backgroundColor: "#ffe7b3",
              }}
            />
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              Picked
            </Typography>
          </Stack>
        </Stack>
      </Box>

      <TransactionTable
        transactions={filteredTransactions}
        loading={loading}
        error={error}
        onEditTransaction={handleEditTransaction}
        onDeleted={() => setRefreshKey((prev) => prev + 1)}
      />
      <TablePagination
        component="div"
        rowsPerPageOptions={[20, 50, 100, 200]}
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
      />
      <TransactionModal
        isOpen={openTransaction}
        handleClose={handleCloseTransaction}
        transaction={selectedTransaction}
        onSaved={handleSavedTransaction}
      />
    </div>
  );
};

export default Transaction;
