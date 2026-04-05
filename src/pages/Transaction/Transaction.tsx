import React from "react";
import TransactionTable from "./components/TransactionTable";
import {
  Box,
  Button,
  Grid,
  Stack,
  TextField,
  Typography,
  InputAdornment,
  IconButton,
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

  const {
    searchText,
    selectedMonth,
    transactions,
    loading,
    error,
    setSearchText,
    setSelectedMonth,
    search,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") search();
  };

  return (
    <div>
      {/* Toolbar */}
      <Grid container spacing={1} alignItems="center" sx={{ mb: 2 }}>
        {/* Customer search */}
        <Grid size="auto" sx={{ minWidth: 240 }}>
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
                      onClick={() => setSearchText("")}
                      edge="end"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
        </Grid>

        {/* Month filter */}
        <Grid size="auto">
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
            onClick={clearFilters}
            disabled={loading || (!searchText && !selectedMonth)}
            startIcon={<ClearIcon />}
          >
            Clear
          </Button>
        </Grid>

        {/* Spacer + Add button */}
        <Grid size="grow" />
        <Grid size="auto">
          <Button
            onClick={handleOpenTransaction}
            variant="contained"
            color="primary"
            size="small"
          >
            Add New Transaction
          </Button>
        </Grid>
      </Grid>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.5 }}>
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
        transactions={transactions}
        loading={loading}
        error={error}
        onEditTransaction={handleEditTransaction}
        onDeleted={() => setRefreshKey((prev) => prev + 1)}
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
