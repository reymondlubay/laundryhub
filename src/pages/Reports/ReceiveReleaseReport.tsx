import React from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
  Alert,
  Autocomplete,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
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
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import transactionService, { type Transaction } from "../../services/transactionService";
import customerService, { type Customer } from "../../services/customerService";
import userService, { type UserItem } from "../../services/userService";
import authService from "../../services/authService";
import { USER_ROLE_EMPLOYEE } from "../../constants/roles";
import { isEmployee } from "../../utils/roleAccess";

type ActivityFilter = "all" | "receive" | "release";

type EmployeeOption = { id: string; name: string };

type EmployeeTotalsRow = {
  employeeId: string;
  name: string;
  receiveCount: number;
  releaseCount: number;
};

type TransactionRow = Transaction & {
  receivedby?: string;
  releasedby?: string;
  datereceived?: string;
  datepickup?: string;
};

const normalizeRange = (from: Dayjs, to: Dayjs): { from: Dayjs; to: Dayjs } => {
  if (from.isAfter(to)) return { from: to, to: from };
  return { from, to };
};

const inCalendarRange = (
  value: string | undefined,
  from: Dayjs,
  to: Dayjs,
): boolean => {
  if (!value) return false;
  const date = dayjs(value);
  if (!date.isValid()) return false;
  const { from: start, to: end } = normalizeRange(from, to);
  return (
    !date.isBefore(start.startOf("day")) && !date.isAfter(end.endOf("day"))
  );
};

const formatEmployeeName = (
  user?: {
    firstName?: string;
    lastName?: string;
    userName?: string;
  } | null,
): string => {
  if (!user) return "—";
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || user.userName || "—";
};

const formatLoads = (transaction: Transaction): string => {
  const details = transaction.loadDetails ?? [];
  if (!details.length) return "—";
  return details
    .map((row) => {
      const type = row.type || "Load";
      const kg = Number(row.kg || 0);
      const loads = Number(row.loads || 0);
      if (kg > 0) return `${type} ${kg}kg`;
      if (loads > 0) return `${type} ${loads}L`;
      return type;
    })
    .join(", ");
};

const formatDateTime = (value?: string): string => {
  if (!value) return "—";
  const date = dayjs(value);
  return date.isValid() ? date.format("MM/DD/YY h:mm A") : "—";
};

const getReceivedById = (tx: TransactionRow): string | undefined =>
  tx.receivedByUser?.id ||
  (tx as TransactionRow & { receivedBy?: string }).receivedBy ||
  tx.receivedby;

const getReleasedById = (tx: TransactionRow): string | undefined =>
  tx.releasedByUser?.id ||
  (tx as TransactionRow & { releasedBy?: string }).releasedBy ||
  tx.releasedby;

const getReceiveDate = (tx: TransactionRow): string | undefined => {
  const value = tx.dateReceived || tx.datereceived;
  if (!value || !dayjs(value).isValid()) return undefined;
  return value;
};

const getReleaseDate = (tx: TransactionRow): string | undefined => {
  const value = tx.datePickup || tx.datepickup;
  if (!value || !dayjs(value).isValid()) return undefined;
  return value;
};

type ReportFilterParams = {
  customerId?: string;
  selectedEmployee: string;
  dateFrom: Dayjs;
  dateTo: Dayjs;
  activityFilter: ActivityFilter;
};

const transactionMatchesReportFilters = (
  tx: TransactionRow,
  filters: ReportFilterParams,
): boolean => {
  const receiveDate = getReceiveDate(tx);
  const releaseDate = getReleaseDate(tx);
  const receivedById = getReceivedById(tx);
  const releasedById = getReleasedById(tx);

  if (filters.customerId && tx.customerId !== filters.customerId) {
    return false;
  }

  const receiveInRange = receiveDate
    ? inCalendarRange(receiveDate, filters.dateFrom, filters.dateTo)
    : false;
  const releaseInRange = releaseDate
    ? inCalendarRange(releaseDate, filters.dateFrom, filters.dateTo)
    : false;

  if (filters.activityFilter === "receive") {
    if (!receiveDate || !receiveInRange) return false;
    if (filters.selectedEmployee && receivedById !== filters.selectedEmployee) {
      return false;
    }
    return true;
  }

  if (filters.activityFilter === "release") {
    if (!releaseDate || !releaseInRange) return false;
    if (filters.selectedEmployee && releasedById !== filters.selectedEmployee) {
      return false;
    }
    return true;
  }

  const receiveMatch =
    Boolean(receiveDate) &&
    receiveInRange &&
    (!filters.selectedEmployee || receivedById === filters.selectedEmployee);
  const releaseMatch =
    Boolean(releaseDate) &&
    releaseInRange &&
    (!filters.selectedEmployee || releasedById === filters.selectedEmployee);

  return receiveMatch || releaseMatch;
};

const headCellSx = {
  fontWeight: 600,
  fontSize: "0.75rem",
  color: "text.secondary",
  borderBottom: 1,
  borderColor: "divider",
  py: 1,
} as const;

const bodyCellSx = {
  fontSize: "0.8125rem",
  py: 0.75,
  borderColor: "divider",
} as const;

const ReceiveReleaseReport: React.FC = () => {
  const hideEmployeeFilter = isEmployee();
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [employees, setEmployees] = React.useState<EmployeeOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [selectedEmployee, setSelectedEmployee] = React.useState<string>("");
  const [selectedCustomer, setSelectedCustomer] =
    React.useState<Customer | null>(null);
  const [dateFrom, setDateFrom] = React.useState<Dayjs>(() => dayjs());
  const [dateTo, setDateTo] = React.useState<Dayjs>(() => dayjs());
  const [activityFilter, setActivityFilter] =
    React.useState<ActivityFilter>("all");
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [txData, customerData, userData] = await Promise.all([
          transactionService.getAll(),
          customerService.getAll(),
          userService.getAll().catch(() => [] as UserItem[]),
        ]);

        setTransactions(txData.filter((t) => !t.isDeleted));
        setCustomers(customerData);

        const employeeUsers = userData
          .filter((user) => user.role === USER_ROLE_EMPLOYEE)
          .map((user) => ({
            id: user.id,
            name:
              [user.firstName, user.lastName].filter(Boolean).join(" ") ||
              user.userName ||
              USER_ROLE_EMPLOYEE,
          }));

        setEmployees(employeeUsers);

        if (hideEmployeeFilter) {
          const current = authService.getCurrentUser();
          if (current?.id) setSelectedEmployee(current.id);
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load report data.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [hideEmployeeFilter]);

  const reportFilters = React.useMemo(
    (): ReportFilterParams => ({
      customerId: selectedCustomer?.id,
      selectedEmployee,
      dateFrom,
      dateTo,
      activityFilter,
    }),
    [
      selectedCustomer,
      selectedEmployee,
      dateFrom,
      dateTo,
      activityFilter,
    ],
  );

  const filteredRows = React.useMemo(() => {
    return transactions
      .filter((raw) =>
        transactionMatchesReportFilters(raw as TransactionRow, reportFilters),
      )
      .sort((a, b) => {
        const aReceive = getReceiveDate(a as TransactionRow);
        const bReceive = getReceiveDate(b as TransactionRow);
        const aRelease = getReleaseDate(a as TransactionRow);
        const bRelease = getReleaseDate(b as TransactionRow);

        const aSort = dayjs(
          activityFilter === "release"
            ? aRelease || aReceive
            : aReceive || aRelease,
        ).valueOf();
        const bSort = dayjs(
          activityFilter === "release"
            ? bRelease || bReceive
            : bReceive || bRelease,
        ).valueOf();

        return bSort - aSort;
      });
  }, [transactions, reportFilters, activityFilter]);

  const pagedRows = React.useMemo(() => {
    const start = page * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, page, rowsPerPage]);

  const employeeTotals = React.useMemo((): EmployeeTotalsRow[] => {
    const counts = new Map<
      string,
      { name: string; receiveCount: number; releaseCount: number }
    >();

    const resolveName = (
      tx: TransactionRow,
      id: string,
      kind: "receive" | "release",
    ): string => {
      const fromList = employees.find((entry) => String(entry.id) === String(id));
      if (fromList) return fromList.name;
      const user =
        kind === "receive" ? tx.receivedByUser : tx.releasedByUser;
      if (user && String(user.id) === String(id)) {
        return formatEmployeeName(user);
      }
      return "Unknown";
    };

    const bump = (
      id: string,
      name: string,
      field: "receiveCount" | "releaseCount",
    ) => {
      const row = counts.get(id) ?? {
        name,
        receiveCount: 0,
        releaseCount: 0,
      };
      row.name = name || row.name;
      row[field] += 1;
      counts.set(id, row);
    };

    for (const raw of transactions) {
      const tx = raw as TransactionRow;
      if (!transactionMatchesReportFilters(tx, reportFilters)) continue;

      const receiveDate = getReceiveDate(tx);
      const releaseDate = getReleaseDate(tx);
      const receivedById = getReceivedById(tx);
      const releasedById = getReleasedById(tx);

      if (
        activityFilter !== "release" &&
        receivedById &&
        receiveDate &&
        inCalendarRange(receiveDate, dateFrom, dateTo) &&
        (!selectedEmployee || receivedById === selectedEmployee)
      ) {
        bump(
          receivedById,
          resolveName(tx, receivedById, "receive"),
          "receiveCount",
        );
      }

      if (
        activityFilter !== "receive" &&
        releasedById &&
        releaseDate &&
        inCalendarRange(releaseDate, dateFrom, dateTo) &&
        (!selectedEmployee || releasedById === selectedEmployee)
      ) {
        bump(
          releasedById,
          resolveName(tx, releasedById, "release"),
          "releaseCount",
        );
      }
    }

    return Array.from(counts.entries())
      .map(([employeeId, row]) => ({
        employeeId,
        name: row.name,
        receiveCount: row.receiveCount,
        releaseCount: row.releaseCount,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [
    transactions,
    reportFilters,
    selectedEmployee,
    dateFrom,
    dateTo,
    activityFilter,
    employees,
  ]);

  const summaryGrandTotals = React.useMemo(
    () =>
      employeeTotals.reduce(
        (acc, row) => ({
          receiveCount: acc.receiveCount + row.receiveCount,
          releaseCount: acc.releaseCount + row.releaseCount,
        }),
        { receiveCount: 0, releaseCount: 0 },
      ),
    [employeeTotals],
  );

  const showReceiveTotals =
    activityFilter === "all" || activityFilter === "receive";
  const showReleaseTotals =
    activityFilter === "all" || activityFilter === "release";

  React.useEffect(() => {
    setPage(0);
  }, [
    selectedEmployee,
    selectedCustomer,
    dateFrom,
    dateTo,
    activityFilter,
  ]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ px: { xs: 1, sm: 2 }, py: 2, maxWidth: 1200, mx: "auto" }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Receive / Release Report
        </Typography>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ mb: 2 }}
          flexWrap="wrap"
          useFlexGap
        >
          {!hideEmployeeFilter ? (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="rr-employee-label">Employee</InputLabel>
              <Select
                labelId="rr-employee-label"
                label="Employee"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(String(e.target.value))}
              >
                <MenuItem value="">All employees</MenuItem>
                {employees.map((employee) => (
                  <MenuItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}

          <Autocomplete
            size="small"
            sx={{ minWidth: 200, flex: 1 }}
            options={customers}
            value={selectedCustomer}
            onChange={(_e, value) => setSelectedCustomer(value)}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField {...params} label="Customer" placeholder="All" />
            )}
          />

          <DatePicker
            label="From"
            value={dateFrom}
            onChange={(value) => value && setDateFrom(value)}
            slotProps={{ textField: { size: "small", sx: { width: 140 } } }}
          />
          <DatePicker
            label="To"
            value={dateTo}
            onChange={(value) => value && setDateTo(value)}
            slotProps={{ textField: { size: "small", sx: { width: 140 } } }}
          />

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel id="rr-type-label">Show</InputLabel>
            <Select
              labelId="rr-type-label"
              label="Show"
              value={activityFilter}
              onChange={(e) =>
                setActivityFilter(e.target.value as ActivityFilter)
              }
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="receive">Receive</MenuItem>
              <MenuItem value="release">Release</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            <TableContainer
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headCellSx}>Customer</TableCell>
                    <TableCell sx={headCellSx}>Loads</TableCell>
                    <TableCell sx={headCellSx}>Receive By</TableCell>
                    <TableCell sx={headCellSx}>Receive Date</TableCell>
                    <TableCell sx={headCellSx}>Release By</TableCell>
                    <TableCell sx={headCellSx}>Release Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No records for the selected filters.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedRows.map((tx) => (
                      <TableRow key={tx.id} hover>
                        <TableCell sx={bodyCellSx}>
                          {tx.customer?.name || "—"}
                        </TableCell>
                        <TableCell sx={bodyCellSx}>{formatLoads(tx)}</TableCell>
                        <TableCell sx={bodyCellSx}>
                          {formatEmployeeName(tx.receivedByUser)}
                        </TableCell>
                        <TableCell sx={bodyCellSx}>
                          {formatDateTime(tx.dateReceived)}
                        </TableCell>
                        <TableCell sx={bodyCellSx}>
                          {formatEmployeeName(tx.releasedByUser)}
                        </TableCell>
                        <TableCell sx={bodyCellSx}>
                          {formatDateTime(tx.datePickup)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filteredRows.length}
              page={page}
              onPageChange={(_e, next) => setPage(next)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(Number.parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              sx={{ borderTop: 0 }}
            />

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Totals by employee
              </Typography>
              <TableContainer
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  maxWidth: 480,
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headCellSx}>Employee</TableCell>
                      {showReceiveTotals ? (
                        <TableCell align="right" sx={headCellSx}>
                          Total Receive
                        </TableCell>
                      ) : null}
                      {showReleaseTotals ? (
                        <TableCell align="right" sx={headCellSx}>
                          Total Release
                        </TableCell>
                      ) : null}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employeeTotals.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={
                            1 +
                            (showReceiveTotals ? 1 : 0) +
                            (showReleaseTotals ? 1 : 0)
                          }
                          align="center"
                          sx={{ py: 2 }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            No totals for the selected filters.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {employeeTotals.map((row) => (
                          <TableRow key={row.employeeId}>
                            <TableCell sx={bodyCellSx}>{row.name}</TableCell>
                            {showReceiveTotals ? (
                              <TableCell align="right" sx={bodyCellSx}>
                                {row.receiveCount}
                              </TableCell>
                            ) : null}
                            {showReleaseTotals ? (
                              <TableCell align="right" sx={bodyCellSx}>
                                {row.releaseCount}
                              </TableCell>
                            ) : null}
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell
                            sx={{ ...bodyCellSx, fontWeight: 600 }}
                          >
                            Total
                          </TableCell>
                          {showReceiveTotals ? (
                            <TableCell
                              align="right"
                              sx={{ ...bodyCellSx, fontWeight: 600 }}
                            >
                              {summaryGrandTotals.receiveCount}
                            </TableCell>
                          ) : null}
                          {showReleaseTotals ? (
                            <TableCell
                              align="right"
                              sx={{ ...bodyCellSx, fontWeight: 600 }}
                            >
                              {summaryGrandTotals.releaseCount}
                            </TableCell>
                          ) : null}
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default ReceiveReleaseReport;
