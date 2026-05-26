import React from "react";
import TransactionTable from "./components/TransactionTable";
import {
  Autocomplete,
  Button,
  Grid,
  Stack,
  TextField,
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
import TransactionListControls from "./components/TransactionListControls";
import type { Transaction } from "../../services/transactionService";
import customerService, { type Customer } from "../../services/customerService";
import { useTransactionSearch } from "./hooks/useTransactionSearch";
import addonsPricingService, {
  DEFAULT_ADDONS_PRICING,
  type AddonsPricing,
} from "../../services/addonsPricingService";
import {
  filterAndSortTransactions,
  parsePriceFilter,
  type TransactionLoadTypeFilter,
  type TransactionSortBy,
  type TransactionSortDirection,
} from "./utils/transactionListFilters";

const Transaction = () => {
  const [openTransaction, setOpenTransaction] = React.useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    React.useState<Transaction | null>(null);
  const [showPendingOnly, setShowPendingOnly] = React.useState(false);
  const [showReadyForPickupOnly, setShowReadyForPickupOnly] =
    React.useState(false);
  const [sortBy, setSortBy] = React.useState<TransactionSortBy>("default");
  const [sortDirection, setSortDirection] =
    React.useState<TransactionSortDirection>("desc");
  const [loadTypeFilter, setLoadTypeFilter] =
    React.useState<TransactionLoadTypeFilter>("");
  const [showUnpaidOnly, setShowUnpaidOnly] = React.useState(false);
  const [priceMin, setPriceMin] = React.useState("");
  const [priceMax, setPriceMax] = React.useState("");
  const [addonsPricing, setAddonsPricing] = React.useState<AddonsPricing>(
    DEFAULT_ADDONS_PRICING,
  );
  const [jumpToFirstPageNonce, setJumpToFirstPageNonce] = React.useState(0);
  const [flashRowRequest, setFlashRowRequest] = React.useState<{
    transactionId: string;
    nonce: number;
  } | null>(null);
  const flashRowNonceRef = React.useRef(0);
  const [toast, setToast] = React.useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning";
  }>({ open: false, message: "", severity: "success" });

  const [customerSuggestions, setCustomerSuggestions] = React.useState<
    Customer[]
  >([]);

  React.useEffect(() => {
    return customerService.subscribeToCustomerLookup(setCustomerSuggestions);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pricing = await addonsPricingService.get();
        if (!cancelled) setAddonsPricing(pricing);
      } catch {
        if (!cancelled) setAddonsPricing(DEFAULT_ADDONS_PRICING);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const parsedPriceMin = React.useMemo(
    () => parsePriceFilter(priceMin),
    [priceMin],
  );
  const parsedPriceMax = React.useMemo(
    () => parsePriceFilter(priceMax),
    [priceMax],
  );
  const priceRangeInvalid =
    parsedPriceMin != null &&
    parsedPriceMax != null &&
    parsedPriceMax < parsedPriceMin;

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
    dateFrom,
    dateTo,
    transactions,
    loading,
    error,
    setSearchText,
    setDateFrom,
    setDateTo,
    search,
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
    setShowReadyForPickupOnly(false);
    setShowUnpaidOnly(false);
    setSortBy("default");
    setSortDirection("desc");
    setLoadTypeFilter("");
    setPriceMin("");
    setPriceMax("");
    clearFilters();
  }, [clearFilters]);

  const handleSearch = React.useCallback(
    (overrides?: Parameters<typeof search>[0]) => {
      return search({
        useDefaultDateRange: !showReadyForPickupOnly,
        ...overrides,
      });
    },
    [search, showReadyForPickupOnly],
  );

  const handleReadyForPickupChange = React.useCallback(
    (checked: boolean) => {
      setShowReadyForPickupOnly(checked);
      void search({ useDefaultDateRange: !checked });
    },
    [search],
  );

  const displayedTransactions = React.useMemo(
    () =>
      filterAndSortTransactions(transactions, {
        showPendingOnly,
        showReadyForPickupOnly,
        showUnpaidOnly,
        loadTypeFilter,
        priceMin: priceRangeInvalid ? null : parsedPriceMin,
        priceMax: priceRangeInvalid ? null : parsedPriceMax,
        addonsPricing,
        sortBy,
        sortDirection,
      }),
    [
      transactions,
      showPendingOnly,
      showReadyForPickupOnly,
      showUnpaidOnly,
      loadTypeFilter,
      parsedPriceMin,
      parsedPriceMax,
      priceRangeInvalid,
      addonsPricing,
      sortBy,
      sortDirection,
    ],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") void handleSearch();
    },
    [handleSearch],
  );

  const autocompleteOptions = React.useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (q.length < 2) return [];
    return customerSuggestions
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [customerSuggestions, searchText]);

  const handleTableToast = React.useCallback(
    (payload: {
      severity: "success" | "error" | "warning";
      message: string;
    }) => {
      setToast({ open: true, ...payload });
    },
    [],
  );

  const [comboOpen, setComboOpen] = React.useState(false);
  const canShowSuggestionList = searchText.trim().length >= 2;
  const suggestionListOpen = comboOpen && canShowSuggestionList;

  const handleClearCustomerSearch = () => {
    const useDefaultDateRange = !showReadyForPickupOnly;
    setComboOpen(false);
    setSearchText("");
    void search({ searchText: "", useDefaultDateRange });
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
                  setComboOpen(false);
                  void handleSearch({ searchText: value.name });
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

        {/* Date Range filter */}
        <Grid size={{ xs: 12, sm: "auto" }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="From Date"
              value={dateFrom}
              onChange={(val) => setDateFrom(val)}
              disabled={loading}
              maxDate={dateTo || undefined}
              slotProps={{
                textField: { size: "small" },
                field: {
                  clearable: true,
                  onClear: () => setDateFrom(null),
                },
              }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid size={{ xs: 12, sm: "auto" }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="To Date"
              value={dateTo}
              onChange={(val) => setDateTo(val)}
              disabled={loading}
              minDate={dateFrom || undefined}
              slotProps={{
                textField: { size: "small" },
                field: {
                  clearable: true,
                  onClear: () => setDateTo(null),
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
            onClick={() => void handleSearch()}
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

      <TransactionListControls
        showPendingOnly={showPendingOnly}
        showReadyForPickupOnly={showReadyForPickupOnly}
        showUnpaidOnly={showUnpaidOnly}
        sortBy={sortBy}
        sortDirection={sortDirection}
        loadTypeFilter={loadTypeFilter}
        priceMin={priceMin}
        priceMax={priceMax}
        priceRangeInvalid={priceRangeInvalid}
        onShowPendingOnlyChange={setShowPendingOnly}
        onShowReadyForPickupOnlyChange={handleReadyForPickupChange}
        onShowUnpaidOnlyChange={setShowUnpaidOnly}
        onSortByChange={setSortBy}
        onSortDirectionChange={setSortDirection}
        onLoadTypeFilterChange={setLoadTypeFilter}
        onPriceMinChange={setPriceMin}
        onPriceMaxChange={setPriceMax}
      />

      <TransactionTable
        transactions={displayedTransactions}
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
