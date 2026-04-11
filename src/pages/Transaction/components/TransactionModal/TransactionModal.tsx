import {
  Dialog,
  DialogContent,
  Grid,
  Paper,
  TextField,
  DialogActions,
  Button,
  Autocomplete,
  Checkbox,
  FormControlLabel,
  Divider,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem as MUIMenuItem,
  InputAdornment,
  DialogTitle,
  Tooltip,
  Alert,
  Snackbar,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import React from "react";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import DeleteIcon from "@mui/icons-material/Delete";
import { Formik, FieldArray, getIn } from "formik";
import * as Yup from "yup";
import type {
  LaundryItem,
  LaundryType,
  Payment,
} from "../../../../services/apiTypes";
import NumberField from "../../../../components/NumberField/NumberField";
import BillSummary from "./components/BillSummary";
import type { Transaction } from "../../../../services/transactionService";
import transactionService from "../../../../services/transactionService";
import customerService from "../../../../services/customerService";
import userService, { type UserItem } from "../../../../services/userService";
import authService from "../../../../services/authService";
import {
  API_ERRORS,
  FORM_ERRORS,
  SUCCESS_MESSAGES,
  UI_TEXT,
} from "../../../../constants/messages";
import { USER_ROLE_EMPLOYEE } from "../../../../constants/roles";
import {
  PAYMENT_MODE_CASH,
  PAYMENT_MODE_GCASH,
  PAYMENT_MODE_GCASH_BACKEND,
} from "../../../../constants/payment";

type TransactionModalProps = {
  isOpen: boolean;
  handleClose: () => void;
  transaction?: Transaction | null;
  onSaved?: () => void;
};

type Customer = {
  name: string;
  id: string;
  mobileNumber?: string;
  address?: string;
  notes?: string;
};

type NewCustomerFormValues = {
  name: string;
  mobileNumber: string;
  address: string;
  notes: string;
};

type EmployeeOption = {
  id: string;
  name: string;
};

export type TransactionFormValues = {
  customer: string;
  receiveDate: Dayjs;
  dateLoaded: Dayjs | null;
  estimatedPickup: Dayjs | null;
  datePickup: Dayjs | null;
  isDelivered: boolean;
  items: LaundryItem[];
  whitePrice: number;
  fabcon: number;
  detergent: number;
  cs: number;
  releaseBy: string;
  notes: string;
};

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  handleClose,
  transaction,
  onSaved,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [employees, setEmployees] = React.useState<EmployeeOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = React.useState(false);
  const [addingCustomer, setAddingCustomer] = React.useState(false);
  const [newCustomerError, setNewCustomerError] = React.useState<string>("");
  const [newCustomerForm, setNewCustomerForm] =
    React.useState<NewCustomerFormValues>({
      name: "",
      mobileNumber: "",
      address: "",
      notes: "",
    });
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const isEditing = !!transaction;

  const fetchCustomers = React.useCallback(async (): Promise<Customer[]> => {
    const customerData = await customerService.getAll();
    setCustomers(customerData);
    return customerData;
  }, []);

  const resetNewCustomerForm = () => {
    setNewCustomerForm({
      name: "",
      mobileNumber: "",
      address: "",
      notes: "",
    });
    setNewCustomerError("");
  };

  React.useEffect(() => {
    const fetchCustomersAndEmployees = async () => {
      try {
        const [customerData, userData] = await Promise.all([
          fetchCustomers(),
          userService.getAll(),
        ]);

        setCustomers(customerData);

        const employeeUsers = userData
          .filter((user) => user.role === USER_ROLE_EMPLOYEE)
          .map((user: UserItem) => ({
            id: user.id,
            name:
              [user.firstName, user.lastName].filter(Boolean).join(" ") ||
              user.userName ||
              USER_ROLE_EMPLOYEE,
          }));

        setEmployees(employeeUsers);
      } catch {
        // Some roles may not be authorized to list users; fall back to current user if employee.
        const currentUser = authService.getCurrentUser();
        if (currentUser?.role === USER_ROLE_EMPLOYEE && currentUser.id) {
          const fallbackName =
            [currentUser.firstName, currentUser.lastName]
              .filter(Boolean)
              .join(" ") ||
            currentUser.userName ||
            USER_ROLE_EMPLOYEE;
          setEmployees([{ id: currentUser.id, name: fallbackName }]);
        } else {
          setEmployees([]);
        }

        try {
          const customerData = await fetchCustomers();
          setCustomers(customerData);
        } catch (customerError) {
          console.error("Failed to fetch customers", customerError);
        }
      }
    };

    if (isOpen) {
      fetchCustomersAndEmployees();
    }
  }, [fetchCustomers, isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;

    if (!transaction) {
      setPayments([]);
      return;
    }

    const mappedPayments: Payment[] = (transaction.paymentDetails || []).map(
      (payment) => ({
        id: payment.id,
        paymentDate: new Date(payment.paymentDate),
        amount: Number(payment.amount || 0),
        mode:
          payment.mode === PAYMENT_MODE_GCASH_BACKEND
            ? PAYMENT_MODE_GCASH
            : PAYMENT_MODE_CASH,
      }),
    );

    setPayments(mappedPayments);
  }, [isOpen, transaction]);

  const initialValues: TransactionFormValues = React.useMemo(() => {
    if (!transaction) {
      return {
        customer: "",
        receiveDate: dayjs(),
        dateLoaded: null,
        estimatedPickup: null,
        datePickup: null,
        isDelivered: false,
        items: [{ type: "Clothes", kg: 0, loads: 0, price: 0 }],
        whitePrice: 0,
        fabcon: 0,
        detergent: 0,
        cs: 0,
        releaseBy: "",
        notes: "",
      };
    }

    const tx = transaction as Transaction & {
      customerid?: string;
      loaddetails?: Array<{
        type?: string;
        kg?: number;
        loads?: number;
        price?: number;
      }>;
      whitePrice?: number;
      fabconQty?: number;
      detergentQty?: number;
      colorSafeQty?: number;
      releasedBy?: string;
      datereceived?: string;
      dateloaded?: string;
      estimatedpickup?: string;
      isdelivered?: boolean;
      datepickup?: string;
      whiteprice?: number;
      fabconqty?: number;
      detergentqty?: number;
      colorsafeqty?: number;
      releasedby?: string;
    };

    return {
      customer: transaction.customerId || tx.customerid || "",
      receiveDate: dayjs(tx.dateReceived || tx.datereceived || dayjs()),
      dateLoaded:
        tx.dateLoaded || tx.dateloaded
          ? dayjs(tx.dateLoaded || tx.dateloaded)
          : null,
      estimatedPickup:
        tx.estimatedPickup || tx.estimatedpickup
          ? dayjs(tx.estimatedPickup || tx.estimatedpickup)
          : null,
      datePickup:
        tx.datePickup || tx.datepickup
          ? dayjs(tx.datePickup || tx.datepickup)
          : null,
      isDelivered: Boolean(transaction.isDelivered ?? tx.isdelivered),
      items:
        transaction.loadDetails?.length || tx.loaddetails?.length
          ? (transaction.loadDetails || tx.loaddetails || []).map((item) => ({
              type: (item.type || "Clothes") as LaundryType,
              kg: Number(item.kg || 0),
              loads: Number(item.loads || 0),
              price: Number(item.price || 0),
            }))
          : [{ type: "Clothes", kg: 0, loads: 0, price: 0 }],
      whitePrice: Number(tx.whitePrice ?? tx.whiteprice ?? 0),
      fabcon: Number(tx.fabconQty ?? tx.fabconqty ?? 0),
      detergent: Number(tx.detergentQty ?? tx.detergentqty ?? 0),
      cs: Number(tx.colorSafeQty ?? tx.colorsafeqty ?? 0),
      releaseBy: tx.releasedBy || tx.releasedby || "",
      notes: transaction.notes || "",
    };
  }, [transaction]);

  const today = dayjs().endOf("day").toDate();
  const validationSchema = Yup.object().shape({
    customer: Yup.string().required(FORM_ERRORS.REQUIRED_CUSTOMER),
    receiveDate: Yup.date()
      .max(today, FORM_ERRORS.FUTURE_DATE_NOT_ALLOWED)
      .required(FORM_ERRORS.DATE_RECEIVED_REQUIRED),
    dateLoaded: Yup.date()
      .nullable()
      .notRequired()
      .max(today, FORM_ERRORS.FUTURE_DATE_NOT_ALLOWED),
    estimatedPickup: Yup.date().nullable().notRequired(),
    datePickup: Yup.date()
      .nullable()
      .notRequired()
      .max(today, FORM_ERRORS.FUTURE_DATE_NOT_ALLOWED),
    items: Yup.array().of(
      Yup.object().shape({
        type: Yup.string().required(),
        kg: Yup.number().min(0, FORM_ERRORS.NEGATIVE_NOT_ALLOWED),
        loads: Yup.number().min(0, FORM_ERRORS.NEGATIVE_NOT_ALLOWED),
        price: Yup.number().min(0, FORM_ERRORS.NEGATIVE_NOT_ALLOWED),
      }),
    ),
    whitePrice: Yup.number().min(0, FORM_ERRORS.NEGATIVE_NOT_ALLOWED),
    fabcon: Yup.number().min(0, FORM_ERRORS.NEGATIVE_NOT_ALLOWED),
    detergent: Yup.number().min(0, FORM_ERRORS.NEGATIVE_NOT_ALLOWED),
    cs: Yup.number().min(0, FORM_ERRORS.NEGATIVE_NOT_ALLOWED),
    notes: Yup.string(),
  });

  const sanitizeNumber = (value: string) => {
    const num = Number(value);
    return isNaN(num) || num < 0 ? 0 : num;
  };

  const handleCreateCustomer = async (
    setFieldValue: (
      field: string,
      value: unknown,
      shouldValidate?: boolean,
    ) => Promise<unknown> | void,
  ) => {
    const name = newCustomerForm.name.trim();
    if (!name) {
      setNewCustomerError(FORM_ERRORS.REQUIRED_CUSTOMER_NAME);
      return;
    }

    try {
      setAddingCustomer(true);
      setNewCustomerError("");

      const created = await customerService.create({
        name,
        mobileNumber: newCustomerForm.mobileNumber.trim() || undefined,
        address: newCustomerForm.address.trim() || undefined,
        notes: newCustomerForm.notes.trim() || undefined,
      });

      await fetchCustomers();
      await Promise.resolve(setFieldValue("customer", created.id, false));
      setAddCustomerOpen(false);
      resetNewCustomerForm();
    } catch (error: unknown) {
      setNewCustomerError(
        error instanceof Error
          ? error.message
          : API_ERRORS.CREATE_CUSTOMER_FAILED,
      );
    } finally {
      setAddingCustomer(false);
    }
  };

  // Backend stores TIMESTAMP (without timezone), so send local datetime strings
  // to avoid AM/PM shifts caused by UTC conversion.
  const toLocalDateTimeString = (value: Dayjs | null | undefined) => {
    if (!value) return undefined;
    return value.format("YYYY-MM-DDTHH:mm:ss");
  };

  return (
    <Dialog open={isOpen} maxWidth="lg" fullWidth fullScreen={isMobile}>
      <DialogTitle>
        {isEditing ? "Edit Transaction" : "Transaction"}
      </DialogTitle>
      <Formik
        enableReinitialize
        validateOnChange={false}
        validateOnBlur={true}
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={async (values) => {
          try {
            setLoading(true);

            const trimmedNotes = values.notes.trim();
            const payload = {
              customerId: values.customer,
              dateReceived: values.receiveDate.format("YYYY-MM-DDTHH:mm:ss"),
              dateLoaded: toLocalDateTimeString(values.dateLoaded),
              estimatedPickup: toLocalDateTimeString(values.estimatedPickup),
              datePickup: toLocalDateTimeString(values.datePickup),
              isDelivered: values.isDelivered,
              whitePrice: values.whitePrice,
              fabconQty: values.fabcon,
              detergentQty: values.detergent,
              colorSafeQty: values.cs,
              releasedBy: values.releaseBy || undefined,
              notes: trimmedNotes || undefined,
              loadDetails: values.items.map((item) => ({
                type: item.type,
                kg: Number(item.kg || 0),
                loads: Number(item.loads || 0),
                price: Number(item.price || 0),
              })),
              paymentDetails: payments.map((payment) => ({
                paymentDate: dayjs(payment.paymentDate).format(
                  "YYYY-MM-DDTHH:mm:ss",
                ),
                amount: Number(payment.amount || 0),
                mode:
                  payment.mode === PAYMENT_MODE_GCASH
                    ? PAYMENT_MODE_GCASH_BACKEND
                    : PAYMENT_MODE_CASH,
              })),
            };

            if (isEditing && transaction) {
              await transactionService.update(transaction.id, payload);
              setSnackbar({
                open: true,
                message: SUCCESS_MESSAGES.TRANSACTION_UPDATED,
                severity: "success",
              });
            } else {
              await transactionService.create(payload);
              setSnackbar({
                open: true,
                message: SUCCESS_MESSAGES.TRANSACTION_CREATED,
                severity: "success",
              });
            }

            onSaved?.();
          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : API_ERRORS.SAVE_FAILED;
            setSnackbar({ open: true, message, severity: "error" });
          } finally {
            setLoading(false);
          }
        }}
      >
        {({ values, errors, touched, setFieldValue, handleSubmit }) => {
          //const totals = calculateTotals(values);
          //console.log("render:", values);
          const renderDatePicker = (
            field:
              | "receiveDate"
              | "dateLoaded"
              | "estimatedPickup"
              | "datePickup",
            label: string,
            clearable = false,
          ) => (
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label={label}
                value={values[field]}
                onChange={(val) => setFieldValue(field, val)}
                {...(field === "estimatedPickup"
                  ? { disablePast: true }
                  : { maxDate: dayjs() })}
                timeSteps={{ minutes: 1 }}
                slotProps={{
                  field: {
                    clearable,
                    onClear: () => setFieldValue(field, null),
                  },
                  textField: {
                    size: "small",
                    fullWidth: true,
                    error: !!getIn(errors, field),
                    helperText: getIn(errors, field),
                  },
                  actionBar: { actions: ["today", "cancel", "accept"] }, // Now button
                }}
              />
            </LocalizationProvider>
          );

          return (
            <form onSubmit={handleSubmit}>
              <Grid container spacing={0}>
                {/* LEFT */}
                <Grid
                  size={{ xs: 12, md: 8 }}
                  sx={{ pl: { xs: 1, md: 2 }, pr: 0 }}
                >
                  <Paper elevation={1} sx={{ p: { xs: 2, md: 4 } }}>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Grid
                          container
                          spacing={1}
                          alignItems="flex-start"
                          wrap="nowrap"
                        >
                          <Grid size="grow">
                            <Autocomplete
                              size="small"
                              value={
                                customers.find(
                                  (c) => c.id === values.customer,
                                ) || null
                              }
                              onChange={(_, selectedCustomer) => {
                                setFieldValue(
                                  "customer",
                                  selectedCustomer?.id || "",
                                );
                              }}
                              options={customers}
                              getOptionLabel={(option) => option.name}
                              isOptionEqualToValue={(option, value) =>
                                option.id === value.id
                              }
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Customer"
                                  error={
                                    !!errors.customer && !!touched.customer
                                  }
                                  helperText={
                                    touched.customer ? errors.customer : ""
                                  }
                                />
                              )}
                            />
                          </Grid>
                          <Grid size="auto" sx={{ pt: 0.5 }}>
                            <Tooltip title="Add New Customer">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  resetNewCustomerForm();
                                  setAddCustomerOpen(true);
                                }}
                              >
                                <PersonAddIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Grid>
                        </Grid>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        {renderDatePicker("receiveDate", "Date Received")}
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        {renderDatePicker("dateLoaded", "Date Loaded", true)}
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        {renderDatePicker(
                          "estimatedPickup",
                          "Estimated Pickup",
                          true,
                        )}
                      </Grid>

                      <Grid size={{ xs: 12 }} textAlign="center">
                        <FormControlLabel
                          control={
                            <Checkbox
                              size="small"
                              checked={values.isDelivered}
                              onChange={(e) =>
                                setFieldValue("isDelivered", e.target.checked)
                              }
                            />
                          }
                          label="For Delivery"
                        />
                      </Grid>

                      <Grid size={12}>
                        <Divider>Load Details</Divider>
                      </Grid>

                      <FieldArray name="items">
                        {({ push, remove }) => (
                          <>
                            {values.items.map((item, index) => {
                              const kgError = getIn(
                                errors,
                                `items[${index}].kg`,
                              );
                              const kgTouched = getIn(
                                touched,
                                `items[${index}].kg`,
                              );
                              const loadsError = getIn(
                                errors,
                                `items[${index}].loads`,
                              );
                              const loadsTouched = getIn(
                                touched,
                                `items[${index}].loads`,
                              );
                              const priceError = getIn(
                                errors,
                                `items[${index}].price`,
                              );
                              const priceTouched = getIn(
                                touched,
                                `items[${index}].price`,
                              );

                              return (
                                <Grid
                                  container
                                  spacing={1}
                                  key={index}
                                  alignItems="center"
                                  sx={{ mb: 1 }}
                                >
                                  <Grid size={{ xs: 12, sm: 3 }}>
                                    <FormControl fullWidth size="small">
                                      <InputLabel>Type</InputLabel>
                                      <Select
                                        value={item.type}
                                        label="Type"
                                        onChange={(e) =>
                                          setFieldValue(
                                            `items[${index}].type`,
                                            e.target.value,
                                          )
                                        }
                                      >
                                        <MUIMenuItem value="Clothes">
                                          Clothes
                                        </MUIMenuItem>
                                        <MUIMenuItem value="Beddings">
                                          Beddings
                                        </MUIMenuItem>
                                        <MUIMenuItem value="Comforter">
                                          Comforter
                                        </MUIMenuItem>
                                      </Select>
                                    </FormControl>
                                  </Grid>

                                  <Grid size={{ xs: 4, sm: 3 }}>
                                    <TextField
                                      label="KG"
                                      size="small"
                                      type="number"
                                      fullWidth
                                      disabled={item.type === "Comforter"}
                                      value={item.kg === 0 ? "" : item.kg}
                                      onChange={(e) =>
                                        setFieldValue(
                                          `items[${index}].kg`,
                                          sanitizeNumber(e.target.value),
                                        )
                                      }
                                      error={kgTouched && !!kgError}
                                      helperText={kgTouched ? kgError : ""}
                                      slotProps={{
                                        input: {
                                          // Targets the Input component
                                          endAdornment: (
                                            <InputAdornment position="start">
                                              kg
                                            </InputAdornment>
                                          ),
                                        },
                                      }}
                                    />
                                  </Grid>

                                  <Grid size={{ xs: 4, sm: 2 }}>
                                    <TextField
                                      label="Loads"
                                      size="small"
                                      type="number"
                                      fullWidth
                                      inputProps={{ min: 0 }}
                                      value={item.loads === 0 ? "" : item.loads}
                                      onChange={(e) =>
                                        setFieldValue(
                                          `items[${index}].loads`,
                                          sanitizeNumber(e.target.value),
                                        )
                                      }
                                      error={loadsTouched && !!loadsError}
                                      helperText={
                                        loadsTouched ? loadsError : ""
                                      }
                                    />
                                  </Grid>

                                  <Grid
                                    size={{
                                      xs: values.items.length > 1 ? 3 : 4,
                                      sm: 3,
                                    }}
                                  >
                                    <TextField
                                      label="Price"
                                      size="small"
                                      type="number"
                                      fullWidth
                                      inputProps={{ min: 0 }}
                                      value={item.price === 0 ? "" : item.price}
                                      onChange={(e) =>
                                        setFieldValue(
                                          `items[${index}].price`,
                                          sanitizeNumber(e.target.value),
                                        )
                                      }
                                      error={priceTouched && !!priceError}
                                      helperText={
                                        priceTouched ? priceError : ""
                                      }
                                      InputProps={{
                                        startAdornment: (
                                          <InputAdornment position="start">
                                            ₱
                                          </InputAdornment>
                                        ),
                                      }}
                                    />
                                  </Grid>

                                  {values.items.length > 1 && (
                                    <Grid
                                      size={{ xs: 1, sm: 1 }}
                                      textAlign="center"
                                    >
                                      <Tooltip title="Delete Row">
                                        <IconButton
                                          color="error"
                                          size="small"
                                          onClick={() => remove(index)}
                                        >
                                          <DeleteIcon />
                                        </IconButton>
                                      </Tooltip>
                                    </Grid>
                                  )}
                                </Grid>
                              );
                            })}
                            <Grid container justifyContent="center">
                              <Tooltip title="Add Row">
                                <IconButton
                                  color="primary"
                                  onClick={() =>
                                    push({
                                      type: "Clothes",
                                      kg: 0,
                                      loads: 0,
                                      price: 0,
                                    })
                                  }
                                >
                                  <AddCircleIcon />
                                </IconButton>
                              </Tooltip>
                            </Grid>
                          </>
                        )}
                      </FieldArray>

                      <Grid size={12}>
                        <Divider>Ad Ons Details</Divider>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <TextField
                          label="White Price"
                          size="small"
                          type="number"
                          fullWidth
                          inputProps={{ min: 0 }}
                          value={
                            values.whitePrice === 0 ? "" : values.whitePrice
                          }
                          onChange={(e) =>
                            setFieldValue(
                              "whitePrice",
                              sanitizeNumber(e.target.value),
                            )
                          }
                          error={
                            !!getIn(errors, "whitePrice") &&
                            !!getIn(touched, "whitePrice")
                          }
                          helperText={
                            getIn(touched, "whitePrice")
                              ? getIn(errors, "whitePrice")
                              : ""
                          }
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                ₱
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <NumberField
                          label="Fabcon"
                          min={0}
                          max={10}
                          size="small"
                          value={values.fabcon}
                          onValueChange={(val) => setFieldValue("fabcon", val)}
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <NumberField
                          label="Detergent"
                          min={0}
                          max={10}
                          size="small"
                          value={values.detergent}
                          onValueChange={(val) =>
                            setFieldValue("detergent", val)
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <NumberField
                          label="Color Safe"
                          min={0}
                          max={10}
                          size="small"
                          value={values.cs}
                          onValueChange={(val) => setFieldValue("cs", val)}
                        />
                      </Grid>

                      <Grid size={12}>
                        <Divider>Release Details</Divider>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        {renderDatePicker("datePickup", "Date Pickup", true)}
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Release By</InputLabel>
                          <Select
                            label="Release By"
                            value={values.releaseBy}
                            onChange={(e) =>
                              setFieldValue("releaseBy", e.target.value)
                            }
                          >
                            {employees.map((employee) => (
                              <MUIMenuItem
                                key={employee.id}
                                value={employee.id}
                              >
                                {employee.name}
                              </MUIMenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={12}>
                        <TextField
                          id="outlined-multiline-flexible"
                          label="Multiline"
                          fullWidth
                          multiline
                          rows={2}
                          value={values.notes}
                          onChange={(e) => {
                            setFieldValue("notes", e.target.value);
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* RIGHT */}
                <Grid
                  size={{ xs: 12, md: 4 }}
                  sx={{
                    pr: { xs: 1, md: 2 },
                    pl: { xs: 1, md: 0.5 },
                    pt: { xs: 1, md: 0 },
                  }}
                >
                  <BillSummary
                    transactionFormValues={values}
                    payments={payments}
                    onPaymentsChange={setPayments}
                  />
                </Grid>
              </Grid>

              <DialogActions sx={{ justifyContent: "center", pb: 4 }}>
                <Button type="submit" variant="contained" size="small">
                  {loading ? UI_TEXT.SAVING : UI_TEXT.SAVE}
                </Button>
                <Button variant="contained" size="small" onClick={handleClose}>
                  {UI_TEXT.CANCEL}
                </Button>
              </DialogActions>

              <Dialog
                open={addCustomerOpen}
                onClose={() => {
                  if (!addingCustomer) {
                    setAddCustomerOpen(false);
                    resetNewCustomerForm();
                  }
                }}
                fullWidth
                maxWidth="sm"
              >
                <DialogTitle>Add New Customer</DialogTitle>
                <DialogContent>
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid size={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Customer Name"
                        value={newCustomerForm.name}
                        error={!!newCustomerError}
                        helperText={newCustomerError || ""}
                        onChange={(e) => {
                          setNewCustomerForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }));
                          if (newCustomerError) setNewCustomerError("");
                        }}
                      />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Mobile Number"
                        value={newCustomerForm.mobileNumber}
                        onChange={(e) =>
                          setNewCustomerForm((prev) => ({
                            ...prev,
                            mobileNumber: e.target.value,
                          }))
                        }
                      />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Address"
                        value={newCustomerForm.address}
                        onChange={(e) =>
                          setNewCustomerForm((prev) => ({
                            ...prev,
                            address: e.target.value,
                          }))
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
                        value={newCustomerForm.notes}
                        onChange={(e) =>
                          setNewCustomerForm((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                      />
                    </Grid>
                  </Grid>
                </DialogContent>
                <DialogActions>
                  <Button
                    onClick={() => {
                      setAddCustomerOpen(false);
                      resetNewCustomerForm();
                    }}
                    disabled={addingCustomer}
                  >
                    {UI_TEXT.CANCEL}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => {
                      void handleCreateCustomer(setFieldValue);
                    }}
                    disabled={addingCustomer}
                  >
                    {addingCustomer ? UI_TEXT.SAVING : UI_TEXT.SAVE}
                  </Button>
                </DialogActions>
              </Dialog>
            </form>
          );
        }}
      </Formik>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default TransactionModal;
