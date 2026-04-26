import React from "react";
import TransactionTable from "./components/TransactionTable";
import {
  Autocomplete,
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
  Snackbar,
  Alert,
  Slide,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import TransactionModal from "./components/TransactionModal/TransactionModal";
import type { Transaction } from "../../services/transactionService";
import customerService, { type Customer } from "../../services/customerService";
import { useTransactionSearch } from "./hooks/useTransactionSearch";

const Transaction = () => {
  const [openTransaction, setOpenTransaction] = React.useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    React.useState<Transaction | null>(null);
  const [showPendingOnly, setShowPendingOnly] = React.useState(false);
  const [jumpToFirstPageNonce, setJumpToFirstPageNonce] = React.useState(0);
  const [flashRowRequest, setFlashRowRequest] = React.useState<{
    transactionId: string;
    nonce: number;
  } | null>(null);
  const flashRowNonceRef = React.useRef(0);
  const [toast, setToast] = React.useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const [customerSuggestions, setCustomerSuggestions] = React.useState<
    Customer[]
  >([]);

  React.useEffect(() => {
    return customerService.subscribeToCustomerLookup(setCustomerSuggestions);
  }, []);

  const ToastTransition = React.useMemo(() => {
    return React.forwardRef(function ToastTransition(
      props: any,
      ref: React.Ref<unknown>,
    ) {
      // Enter: left -> right (comes from left). Exit: reverse (right -> left).
      return <Slide {...props} direction="right" ref={ref} />;
    });
  }, []);
  const {
    searchText,
    selectedMonth,
    transactions,
    loading,
    error,
    setSearchText,
    setSelectedMonth,
    search,
    clearCustomerAndSearch,
    clearFilters,
    upsertTransaction,
    removeTransaction,
  } = useTransactionSearch();

  const handleOpenTransaction = React.useCallback(() => {
    setSelectedTransaction(null);
    setOpenTransaction(true);
  }, []);

  const handleCloseTransaction = React.useCallback(() => {
    setOpenTransaction(false);
    setSelectedTransaction(null);
  }, []);

  const handleEditTransaction = React.useCallback((transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setOpenTransaction(true);
  }, []);

  const handleTransactionSaved = React.useCallback((result: {
    mode: "create" | "edit";
    customerName: string;
    transaction?: Transaction;
  }) => {
    const message =
      result.mode === "create"
        ? `${result.customerName} transaction has been added.`
        : `${result.customerName} record has been saved.`;
    setToast({ open: true, message, severity: "success" });

    if (result.mode === "create") {
      // New row may be outside the active month/customer filter — refetch, then page 1 / top.
      void search().then(() => {
        setJumpToFirstPageNonce((n) => n + 1);
        if (result.transaction?.id) {
          flashRowNonceRef.current += 1;
          setFlashRowRequest({
            transactionId: result.transaction.id,
            nonce: flashRowNonceRef.current,
          });
        }
      });
    } else if (result.transaction) {
      upsertTransaction(result.transaction);
      flashRowNonceRef.current += 1;
      setFlashRowRequest({
        transactionId: result.transaction.id,
        nonce: flashRowNonceRef.current,
      });
    }
    handleCloseTransaction();
  }, [handleCloseTransaction, search, upsertTransaction]);

  const handleTransactionError = React.useCallback((message: string) => {
    setToast({ open: true, message, severity: "error" });
  }, []);

  const handleClearFilters = React.useCallback(() => {
    setShowPendingOnly(false);
    clearFilters();
  }, [clearFilters]);

  const filteredTransactions = React.useMemo(() => {
    if (!showPendingOnly) return transactions;

    return transactions.filter((transaction) => {
      const tx = transaction as Transaction & { dateloaded?: string | null };
      const loadedDate = transaction.dateLoaded || tx.dateloaded || null;
      return !loadedDate;
    });
  }, [showPendingOnly, transactions]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") void search();
    },
    [search],
  );

  const autocompleteOptions = React.useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (q.length < 2) return [];
    return customerSuggestions
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [customerSuggestions, searchText]);

  const handleTableToast = React.useCallback(
    (payload: { severity: "success" | "error"; message: string }) => {
      setToast({ open: true, ...payload });
    },
    [],
  );

  const [comboOpen, setComboOpen] = React.useState(false);
  const canShowSuggestionList = searchText.trim().length >= 2;
  const suggestionListOpen = comboOpen && canShowSuggestionList;

  const handleClearCustomerSearch = () => {
    setComboOpen(false);
    void clearCustomerAndSearch();
  };

  return (
    <div>
      {/* Toolbar */}
      <Grid container spacing={1} alignItems="flex-start" sx={{ mb: 2 }}>
        {/* Customer search */}
        <Grid size={{ xs: 12, sm: "auto" }} sx={{ minWidth: { sm: 240 } }}>
          <Stack spacing={0.25}>
            <Autocomplete<Customer, false, true, true>
              freeSolo
              disableClearable
              size="small"
              fullWidth
              disabled={loading}
              open={suggestionListOpen}
              onOpen={() => setComboOpen(true)}
              onClose={() => setComboOpen(false)}
              options={autocompleteOptions}
              getOptionLabel={(option) =>
                typeof option === "string" ? option : option.name
              }
              inputValue={searchText}
              onInputChange={(_, value, reason) => {
                if (reason === "reset") return;
                setSearchText(value);
              }}
              onChange={(_, value) => {
                if (value && typeof value === "object" && "name" in value) {
                  setSearchText(value.name);
                }
              }}
              filterOptions={(options) => options}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Type at least 2 characters for suggestions…"
                  onKeyDown={handleKeyDown}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                    endAdornment: searchText ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={handleClearCustomerSearch}
                          edge="end"
                          aria-label="Clear customer search and refresh"
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                />
              )}
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

        {/* Reset filter */}
        <Grid size="auto">
          <Button
            variant="outlined"
            size="small"
            onClick={handleClearFilters}
            disabled={loading}
            startIcon={<RestartAltIcon />}
          >
            Reset filter
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
        onTransactionSynced={upsertTransaction}
        onTransactionDeleted={removeTransaction}
        onToast={handleTableToast}
        jumpToFirstPageNonce={jumpToFirstPageNonce}
        flashRowRequest={flashRowRequest}
      />
      <TransactionModal
        isOpen={openTransaction}
        handleClose={handleCloseTransaction}
        transaction={selectedTransaction}
        onSaved={handleTransactionSaved}
        onError={handleTransactionError}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        TransitionComponent={ToastTransition}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          sx={{
            width: "100%",
            bgcolor: toast.severity === "success" ? "#c8e6c9" : undefined,
            color: toast.severity === "success" ? "#1b5e20" : undefined,
            fontWeight: 700,
            letterSpacing: 0.2,
            "& .MuiAlert-icon": {
              color: toast.severity === "success" ? "#1b5e20" : undefined,
            },
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Transaction;
