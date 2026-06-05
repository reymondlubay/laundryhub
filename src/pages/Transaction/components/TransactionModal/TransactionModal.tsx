import {
  Box,
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
  FormHelperText,
  InputLabel,
  Select,
  MenuItem as MUIMenuItem,
  InputAdornment,
  DialogTitle,
  Tooltip,
  Stack,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { toApiDateTimeString } from "../../../../utils/dateTimeApi";
import React from "react";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import DeleteIcon from "@mui/icons-material/Delete";
import ClearIcon from "@mui/icons-material/Clear";
import { Formik, FieldArray, getIn, type FormikErrors } from "formik";
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
import userService from "../../../../services/userService";
import authService from "../../../../services/authService";
import {
  API_ERRORS,
  FORM_ERRORS,
  UI_TEXT,
} from "../../../../constants/messages";
import { USER_ROLE_EMPLOYEE } from "../../../../constants/roles";
import {
  USER_STATUS_ACTIVE,
  type UserStatusValue,
} from "../../../../constants/status";
import {
  PAYMENT_MODE_CASH,
  PAYMENT_MODE_GCASH,
  PAYMENT_MODE_GCASH_BACKEND,
  toBackendPaymentMode,
} from "../../../../constants/payment";
import { toTitleCaseWords } from "../../../../utils/stringUtils";
import { ignoreBackdropClose } from "../../../../utils/muiDialogClose";
import {
  DEFAULT_ADDONS_PRICING,
  type AddonsPricing,
} from "../../../../services/addonsPricingService";
import { pickTransactionNum } from "../../../../utils/normalizeTransaction";
import { getTransactionAddonPricing } from "../../../../utils/pricing";
import {
  buildEmployeeDisplayName,
  mapUsersToEmployeeOptions,
  mergeEmployeeOptions,
  type EmployeeOption,
} from "../../../../utils/employeeOptions";

type TransactionModalProps = {
  isOpen: boolean;
  handleClose: () => void;
  transaction?: Transaction | null;
  onSaved?: (result: {
    mode: "create" | "edit";
    customerName: string;
    transaction?: Transaction;
  }) => void;
  onError?: (message: string) => void;
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
  receiveBy: string;
  releaseBy: string;
  notes: string;
};

/** True when Date pickup has a value (Formik may hold Dayjs, Date, or ISO string after reinit). */
function isPickupFilled(p: unknown): boolean {
  if (p == null) return false;
  if (dayjs.isDayjs(p)) return p.isValid();
  if (p instanceof Date) return !Number.isNaN(p.getTime());
  return dayjs(p as string | number).isValid();
}

/** Coerce blank/invalid numeric inputs (e.g. cleared NumberField → NaN) for Yup. */
function yupCoerceNonNegative(_value: unknown, originalValue: unknown): number {
  if (
    originalValue === "" ||
    originalValue === null ||
    originalValue === undefined
  ) {
    return 0;
  }
  const n =
    typeof originalValue === "number"
      ? originalValue
      : Number(originalValue);
  return Number.isFinite(n) ? n : 0;
}

const TX_FORM_FOCUS_ORDER = [
  "customer",
  "receiveDate",
  "receiveBy",
  "estimatedPickup",
  "dateLoaded",
  "datePickup",
  "releaseBy",
  "items",
  "whitePrice",
  "fabcon",
  "detergent",
  "cs",
] as const;

const getFirstTransactionFormErrorPath = (
  errors: FormikErrors<TransactionFormValues>,
): string | null => {
  for (const field of TX_FORM_FOCUS_ORDER) {
    if (field === "items") {
      const items = errors.items;
      if (!Array.isArray(items)) continue;
      for (let i = 0; i < items.length; i++) {
        const row = items[i];
        if (!row || typeof row !== "object") continue;
        for (const sub of ["type", "kg", "loads", "price"] as const) {
          if ((row as Record<string, unknown>)[sub]) {
            return `items.${i}.${sub}`;
          }
        }
      }
      continue;
    }
    if (getIn(errors, field)) return field;
  }
  return null;
};

const focusTransactionFormField = (path: string): void => {
  const id = `tx-form-${path.replace(/\./g, "-")}`;
  const el = document.getElementById(id);
  if (!el) return;
  const focusable =
    el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement
      ? el
      : el.querySelector<HTMLElement>(
          "input, select, textarea, [role='combobox']",
        );
  (focusable ?? el).focus?.();
  (focusable ?? el).scrollIntoView?.({ block: "center", behavior: "smooth" });
};

const buildTransactionFormTouched = (values: TransactionFormValues) => ({
  customer: true,
  receiveDate: true,
  receiveBy: true,
  dateLoaded: true,
  estimatedPickup: true,
  datePickup: true,
  releaseBy: true,
  whitePrice: true,
  fabcon: true,
  detergent: true,
  cs: true,
  items: values.items.map(() => ({
    type: true,
    kg: true,
    loads: true,
    price: true,
  })),
});

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  handleClose,
  transaction,
  onSaved,
  onError,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [employees, setEmployees] = React.useState<EmployeeOption[]>([]);
  const [lockedAddonPricing, setLockedAddonPricing] =
    React.useState<AddonsPricing | null>(null);
  const [loading, setLoading] = React.useState(false);
  const submitLockRef = React.useRef(false);

  React.useEffect(() => {
    if (!isOpen || !transaction?.id) {
      setLockedAddonPricing(null);
      return;
    }

    const row = transaction as unknown as Record<string, unknown>;
    setLockedAddonPricing(
      getTransactionAddonPricing(row, DEFAULT_ADDONS_PRICING),
    );

  }, [isOpen, transaction?.id, transaction]);
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
  const [customerInputValue, setCustomerInputValue] = React.useState<string>("");
  const customerInputValueRef = React.useRef<string>("");

  const isEditing = !!transaction;

  const resolveEmployeeLabel = React.useCallback(
    (id: string): string => {
      if (!id) return "";
      const match = employees.find((entry) => String(entry.id) === String(id));
      if (match) return match.name;

      const receiveUser = transaction?.receivedByUser;
      if (receiveUser && String(receiveUser.id) === String(id)) {
        return buildEmployeeDisplayName(receiveUser);
      }

      const releaseUser = transaction?.releasedByUser;
      if (releaseUser && String(releaseUser.id) === String(id)) {
        return buildEmployeeDisplayName(releaseUser);
      }

      return "";
    },
    [employees, transaction],
  );

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

        setEmployees(
          mergeEmployeeOptions(
            mapUsersToEmployeeOptions(userData),
            transaction?.receivedByUser ?? undefined,
            transaction?.releasedByUser ?? undefined,
          ),
        );
      } catch {
        // Some roles may not be authorized to list users; fall back to current user if employee.
        const currentUser = authService.getCurrentUser();
        let fallbackEmployees: EmployeeOption[] = [];
        if (currentUser?.role === USER_ROLE_EMPLOYEE && currentUser.id) {
          fallbackEmployees = [
            {
              id: currentUser.id,
              name: buildEmployeeDisplayName(currentUser),
              status:
                (currentUser as { status?: UserStatusValue }).status ??
                USER_STATUS_ACTIVE,
            },
          ];
        }
        setEmployees(
          mergeEmployeeOptions(
            fallbackEmployees,
            transaction?.receivedByUser ?? undefined,
            transaction?.releasedByUser ?? undefined,
          ),
        );

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
  }, [fetchCustomers, isOpen, transaction]);

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
        ...(payment.createdAt ? { createdAt: payment.createdAt } : {}),
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
        items: [{ type: "Clothes", kg: 0, loads: 0, price: 0, nickname: "" }],
        whitePrice: 0,
        fabcon: 0,
        detergent: 0,
        cs: 0,
        receiveBy: "",
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
        nickname?: string;
      }>;
      whitePrice?: number;
      fabconQty?: number;
      detergentQty?: number;
      colorSafeQty?: number;
      receivedBy?: string;
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
      receivedby?: string;
      releasedby?: string;
    };

    const txRecord = tx as unknown as Record<string, unknown>;

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
              nickname: item.nickname ? String(item.nickname) : "",
            }))
          : [{ type: "Clothes", kg: 0, loads: 0, price: 0, nickname: "" }],
      whitePrice: pickTransactionNum(txRecord, "whiteprice", "whitePrice"),
      fabcon: pickTransactionNum(txRecord, "fabconqty", "fabconQty"),
      detergent: pickTransactionNum(txRecord, "detergentqty", "detergentQty"),
      cs: pickTransactionNum(txRecord, "colorsafeqty", "colorSafeQty"),
      receiveBy: String(
        tx.receivedBy ||
          tx.receivedby ||
          transaction.receivedByUser?.id ||
          "",
      ),
      releaseBy: tx.releasedBy || tx.releasedby || "",
      notes: transaction.notes || "",
    };
  }, [isOpen, transaction]);

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
      .max(today, FORM_ERRORS.FUTURE_DATE_NOT_ALLOWED)
      .test(
        "date-pickup-when-release-by",
        FORM_ERRORS.DATE_PICKUP_REQUIRED_WITH_RELEASE_BY,
        function (datePickup) {
          const releaseBy = (this.parent as TransactionFormValues).releaseBy;
          if (!String(releaseBy ?? "").trim()) return true;
          return isPickupFilled(datePickup);
        },
      ),
    items: Yup.array().of(
      Yup.object().shape({
        type: Yup.string().required(),
        kg: Yup.number()
          .transform(yupCoerceNonNegative)
          .min(0, FORM_ERRORS.NEGATIVE_NOT_ALLOWED),
        loads: Yup.number()
          .transform(yupCoerceNonNegative)
          .min(0, FORM_ERRORS.NEGATIVE_NOT_ALLOWED),
        price: Yup.number()
          .transform(yupCoerceNonNegative)
          .min(0, FORM_ERRORS.NEGATIVE_NOT_ALLOWED),
        nickname: Yup.string().trim().max(255).optional(),
      }),
    ),
    whitePrice: Yup.number()
      .transform(yupCoerceNonNegative)
      .min(0, FORM_ERRORS.NEGATIVE_NOT_ALLOWED),
    fabcon: Yup.number()
      .transform(yupCoerceNonNegative)
      .min(0, FORM_ERRORS.NEGATIVE_NOT_ALLOWED),
    detergent: Yup.number()
      .transform(yupCoerceNonNegative)
      .min(0, FORM_ERRORS.NEGATIVE_NOT_ALLOWED),
    cs: Yup.number()
      .transform(yupCoerceNonNegative)
      .min(0, FORM_ERRORS.NEGATIVE_NOT_ALLOWED),
    receiveBy: Yup.string()
      .trim()
      .required(FORM_ERRORS.RECEIVE_BY_REQUIRED)
      .uuid("Select a valid employee"),
    releaseBy: Yup.string()
      .trim()
      .optional()
      .test(
        "release-by-when-date-pickup",
        FORM_ERRORS.RELEASE_BY_REQUIRED_WITH_DATE_PICKUP,
        function (releaseBy) {
          const datePickup = (this.parent as TransactionFormValues).datePickup;
          if (!isPickupFilled(datePickup)) return true;
          return Boolean(String(releaseBy ?? "").trim());
        },
      )
      .test(
        "release-by-uuid",
        "Select a valid employee",
        function (releaseBy) {
          if (!String(releaseBy ?? "").trim()) return true;
          return Yup.string().uuid().isValidSync(String(releaseBy));
        },
      ),
    notes: Yup.string(),
  });

  const sanitizeNumber = (value: string) => {
    const num = Number(value);
    return isNaN(num) || num < 0 ? 0 : num;
  };

  const numberInputSx = {
    "& input[type=number]::-webkit-outer-spin-button": {
      WebkitAppearance: "none",
      margin: 0,
    },
    "& input[type=number]::-webkit-inner-spin-button": {
      WebkitAppearance: "none",
      margin: 0,
    },
    "& input[type=number]": {
      MozAppearance: "textfield",
    },
  } as const;

  const preventWheelStep = (e: React.WheelEvent<HTMLInputElement>) => {
    // Prevent mouse-wheel from stepping number inputs.
    (e.target as HTMLInputElement).blur();
  };

  const kgTooltipContent = (
    <Box sx={{ p: 0.5 }}>
      <Typography
        variant="caption"
        sx={{
          display: "block",
          fontWeight: 700,
          fontSize: 13,
          mb: 0.5,
          letterSpacing: 0.3,
        }}
      >
        KG fraction guide
      </Typography>
      <Box sx={{ fontSize: 13, lineHeight: 1.6 }}>
        <Box>1/4 = .25</Box>
        <Box>1/2 = .50</Box>
        <Box>3/4 = .75</Box>
      </Box>
    </Box>
  );

  const kgTooltipSlotProps = {
    tooltip: {
      sx: {
        bgcolor: "rgba(33, 33, 33, 0.95)",
        color: "#fff",
        fontSize: 13,
        maxWidth: 240,
        px: 1.25,
        py: 1,
        boxShadow: 3,
      },
    },
    arrow: { sx: { color: "rgba(33, 33, 33, 0.95)" } },
  } as const;

  const handleCreateCustomer = async (
    setFieldValue: (
      field: string,
      value: unknown,
      shouldValidate?: boolean,
    ) => Promise<unknown> | void,
  ) => {
    const name = toTitleCaseWords(newCustomerForm.name.trim());
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

  const getSelectedCustomerName = (customerId: string): string => {
    const found = customers.find((c) => c.id === customerId);
    return found?.name?.trim() || "Customer";
  };

  return (
    <Dialog
      open={isOpen}
      maxWidth="xl"
      fullWidth
      fullScreen={isMobile}
      onClose={ignoreBackdropClose(handleClose)}
      slotProps={{
        paper: {
          sx: {
            maxHeight: !isMobile ? "90vh" : "100vh",
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
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
          if (submitLockRef.current) return;
          submitLockRef.current = true;
          try {
            setLoading(true);

            const trimmedNotes = values.notes.trim();
            const hasValidPickup = isPickupFilled(values.datePickup);
            const payload = {
              customerId: values.customer,
              dateReceived: toApiDateTimeString(values.receiveDate)!,
              dateLoaded: toApiDateTimeString(values.dateLoaded),
              estimatedPickup: toApiDateTimeString(values.estimatedPickup),
              datePickup: hasValidPickup
                ? toApiDateTimeString(values.datePickup)
                : null,
              isDelivered: values.isDelivered,
              whitePrice: yupCoerceNonNegative(undefined, values.whitePrice),
              fabconQty: yupCoerceNonNegative(undefined, values.fabcon),
              detergentQty: yupCoerceNonNegative(undefined, values.detergent),
              colorSafeQty: yupCoerceNonNegative(undefined, values.cs),
              receivedBy: values.receiveBy.trim(),
              releasedBy: hasValidPickup
                ? values.releaseBy?.trim() || null
                : null,
              // Always send `notes` so the API persists updates and can clear the field (JSON omits `undefined`).
              notes: trimmedNotes,
              loadDetails: values.items.map((item) => ({
                type: item.type,
                kg: Number(item.kg || 0),
                loads: Number(item.loads || 0),
                price: Number(item.price || 0),
                nickname: item.nickname?.trim() || "",
              })),
              paymentDetails: payments.map((payment) => ({
                paymentDate: toApiDateTimeString(
                  dayjs(payment.paymentDate),
                )!,
                amount: Number(payment.amount || 0),
                mode: toBackendPaymentMode(payment.mode),
                ...(payment.createdAt
                  ? { createdAt: payment.createdAt }
                  : {}),
              })),
            };

            const customerName = getSelectedCustomerName(values.customer);
            const customerRow = customers.find((c) => c.id === values.customer);
            const customerForList = {
              id: values.customer,
              name: customerRow?.name || customerName,
              mobileNumber: customerRow?.mobileNumber || "",
            };

            if (isEditing && transaction) {
              const updated = await transactionService.update(
                transaction.id,
                {
                  ...payload,
                  replacePaymentDetails: true,
                },
                transaction,
              );
              updated.customer = customerForList;
              if (values.receiveBy) {
                const emp = employees.find((e) => e.id === values.receiveBy);
                if (emp) {
                  const parts = emp.name.trim().split(/\s+/);
                  updated.receivedByUser = {
                    id: emp.id,
                    userName: emp.name,
                    firstName: parts[0] || "",
                    lastName: parts.slice(1).join(" ") || "",
                  };
                }
              } else {
                updated.receivedByUser = null;
              }
              if (values.releaseBy) {
                const emp = employees.find((e) => e.id === values.releaseBy);
                if (emp) {
                  const parts = emp.name.trim().split(/\s+/);
                  updated.releasedByUser = {
                    id: emp.id,
                    userName: emp.name,
                    firstName: parts[0] || "",
                    lastName: parts.slice(1).join(" ") || "",
                  };
                }
              } else {
                updated.releasedByUser = null;
              }
              onSaved?.({
                mode: "edit",
                customerName,
                transaction: updated,
              });
            } else {
              const created = await transactionService.create(payload);
              created.customer = customerForList;
              if (values.receiveBy) {
                const emp = employees.find((e) => e.id === values.receiveBy);
                if (emp) {
                  const parts = emp.name.trim().split(/\s+/);
                  created.receivedByUser = {
                    id: emp.id,
                    userName: emp.name,
                    firstName: parts[0] || "",
                    lastName: parts.slice(1).join(" ") || "",
                  };
                }
              }
              if (values.releaseBy) {
                const emp = employees.find((e) => e.id === values.releaseBy);
                if (emp) {
                  const parts = emp.name.trim().split(/\s+/);
                  created.releasedByUser = {
                    id: emp.id,
                    userName: emp.name,
                    firstName: parts[0] || "",
                    lastName: parts.slice(1).join(" ") || "",
                  };
                }
              }
              onSaved?.({
                mode: "create",
                customerName,
                transaction: created,
              });
            }

          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : API_ERRORS.SAVE_FAILED;
            onError?.(message);
          } finally {
            setLoading(false);
            submitLockRef.current = false;
          }
        }}
      >
        {({
          values,
          errors,
          touched,
          submitCount,
          setFieldValue,
          setFieldTouched,
          setTouched,
          validateForm,
          handleSubmit,
        }) => {
          const handleSaveAttempt = async (
            e?: React.FormEvent<HTMLFormElement>,
          ) => {
            e?.preventDefault();
            const validationErrors = await validateForm();
            if (Object.keys(validationErrors).length > 0) {
              await setTouched(buildTransactionFormTouched(values), true);
              const firstPath =
                getFirstTransactionFormErrorPath(validationErrors);
              if (firstPath) {
                window.setTimeout(() => focusTransactionFormField(firstPath), 0);
              }
              return;
            }
            handleSubmit(e);
          };
          //const totals = calculateTotals(values);
          //console.log("render:", values);
          const releaseFieldsDisabled =
            !isEditing || !isPickupFilled(values.dateLoaded);

          const renderDatePicker = (
            field:
              | "receiveDate"
              | "dateLoaded"
              | "estimatedPickup"
              | "datePickup",
            label: string,
            clearable = false,
            onDateCleared?: () => void,
            disabled = false,
          ) => (
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label={label}
                value={values[field]}
                disabled={disabled}
                onChange={(val) => setFieldValue(field, val)}
                {...(field === "estimatedPickup"
                  ? { disablePast: true }
                  : { maxDate: dayjs() })}
                timeSteps={{ minutes: 1 }}
                slotProps={{
                  field: {
                    clearable,
                    onClear: () => {
                      setFieldValue(field, null);
                      onDateCleared?.();
                    },
                  },
                  popper: {
                    modifiers: [
                      {
                        name: "flip",
                        enabled: true,
                      },
                      {
                        name: "preventOverflow",
                        enabled: true,
                        options: {
                          padding: 8,
                        },
                      },
                    ],
                  },
                  textField: {
                    id: `tx-form-${field}`,
                    size: "small",
                    fullWidth: true,
                    error: !!getIn(errors, field),
                    helperText:
                      disabled && field === "datePickup"
                        ? FORM_ERRORS.RELEASE_AFTER_LOADED_HINT
                        : getIn(errors, field),
                  },
                  actionBar: { actions: ["today", "cancel", "accept"] }, // Now button
                }}
              />
            </LocalizationProvider>
          );

          return (
            <form
              onSubmit={(e) => {
                void handleSaveAttempt(e);
              }}
              noValidate
            >
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
                              inputValue={customerInputValue}
                              onInputChange={(_, newValue) => {
                                setCustomerInputValue(newValue);
                                customerInputValueRef.current = newValue;
                              }}
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
                                setCustomerInputValue(selectedCustomer?.name || "");
                                customerInputValueRef.current =
                                  selectedCustomer?.name || "";
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
                                  inputProps={{
                                    ...params.inputProps,
                                    id: "tx-form-customer",
                                  }}
                                  error={
                                    !!errors.customer &&
                                    !!(touched.customer || submitCount > 0)
                                  }
                                  helperText={
                                    touched.customer || submitCount > 0
                                      ? errors.customer
                                      : ""
                                  }
                                  onBlur={(e) => {
                                    params.inputProps?.onBlur?.(
                                      e as React.FocusEvent<HTMLInputElement>,
                                    );
                                    void setFieldTouched("customer", true);
                                  }}
                                />
                              )}
                            />
                          </Grid>
                          <Grid size="auto" sx={{ pt: 0.5 }}>
                            <Tooltip title="Add New Customer">
                              <IconButton
                                size="small"
                                color="primary"
                                onMouseDown={(e) => {
                                  // Prevent the autocomplete input from blurring/resetting before we read the typed value.
                                  e.preventDefault();
                                }}
                                onClick={() => {
                                  resetNewCustomerForm();
                                  const typed = (
                                    customerInputValueRef.current || customerInputValue
                                  ).trim();
                                  if (typed) {
                                    const exists = customers.some(
                                      (c) => c.name.trim().toLowerCase() === typed.toLowerCase(),
                                    );
                                    if (!exists) {
                                      setNewCustomerForm((prev) => ({
                                        ...prev,
                                        name: typed,
                                      }));
                                    }
                                  }
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
                        <FormControl
                          fullWidth
                          size="small"
                          error={
                            !!getIn(errors, "receiveBy") &&
                            !!(
                              getIn(touched, "receiveBy") || submitCount > 0
                            )
                          }
                        >
                          <InputLabel
                            id="tx-modal-receive-by-label"
                            shrink
                            required
                          >
                            Receive By
                          </InputLabel>
                          <Select
                            id="tx-form-receiveBy"
                            labelId="tx-modal-receive-by-label"
                            label="Receive By"
                            displayEmpty
                            value={values.receiveBy || ""}
                            onChange={(e) => {
                              setFieldValue(
                                "receiveBy",
                                String(e.target.value),
                              );
                              void setFieldTouched("receiveBy", true, false);
                            }}
                            onBlur={() => void setFieldTouched("receiveBy", true)}
                            error={
                              !!getIn(errors, "receiveBy") &&
                              !!(
                                getIn(touched, "receiveBy") || submitCount > 0
                              )
                            }
                            renderValue={(selected) => {
                              if (!selected) {
                                return (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Select employee
                                  </Typography>
                                );
                              }
                              const label = resolveEmployeeLabel(
                                String(selected),
                              );
                              return (
                                label || (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Select employee
                                  </Typography>
                                )
                              );
                            }}
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
                          {getIn(touched, "receiveBy") || submitCount > 0 ? (
                            getIn(errors, "receiveBy") ? (
                              <FormHelperText error>
                                {String(getIn(errors, "receiveBy"))}
                              </FormHelperText>
                            ) : null
                          ) : null}
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        {renderDatePicker(
                          "estimatedPickup",
                          "Estimated Pickup",
                          true,
                        )}
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        {renderDatePicker("dateLoaded", "Date Loaded", true)}
                      </Grid>
                      <Grid
                        size={{ xs: 12, sm: 6 }}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <FormControlLabel
                          sx={{ m: 0, whiteSpace: "nowrap" }}
                          control={
                            <Checkbox
                              size="small"
                              checked={values.isDelivered}
                              onChange={(e) =>
                                setFieldValue(
                                  "isDelivered",
                                  e.target.checked,
                                )
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
                              const nicknameError = getIn(
                                errors,
                                `items[${index}].nickname`,
                              );
                              const nicknameTouched = getIn(
                                touched,
                                `items[${index}].nickname`,
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

                                  <Grid size={{ xs: 4, sm: 2 }}>
                                    <Tooltip
                                      title={kgTooltipContent}
                                      placement="top"
                                      arrow
                                      disableHoverListener
                                      disableTouchListener
                                      slotProps={kgTooltipSlotProps}
                                    >
                                      <TextField
                                        id={`tx-form-items-${index}-kg`}
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
                                        sx={numberInputSx}
                                        inputProps={{
                                          onWheel: preventWheelStep,
                                        }}
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
                                    </Tooltip>
                                  </Grid>

                                  <Grid size={{ xs: 4, sm: 2 }}>
                                    <TextField
                                      id={`tx-form-items-${index}-loads`}
                                      label="Loads"
                                      size="small"
                                      type="number"
                                      fullWidth
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
                                      sx={numberInputSx}
                                      inputProps={{
                                        min: 0,
                                        onWheel: preventWheelStep,
                                      }}
                                    />
                                  </Grid>

                                  <Grid size={{ xs: 4, sm: 2 }}>
                                    <TextField
                                      id={`tx-form-items-${index}-price`}
                                      label="Price"
                                      size="small"
                                      type="number"
                                      fullWidth
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
                                      sx={numberInputSx}
                                      inputProps={{
                                        min: 0,
                                        onWheel: preventWheelStep,
                                      }}
                                      InputProps={{
                                        startAdornment: (
                                          <InputAdornment position="start">
                                            ₱
                                          </InputAdornment>
                                        ),
                                      }}
                                    />
                                  </Grid>

                                  <Grid
                                    size={{
                                      xs: 12,
                                      sm: values.items.length > 1 ? 2 : 3,
                                    }}
                                  >
                                    <TextField
                                      id={`tx-form-items-${index}-nickname`}
                                      label="Nickname"
                                      size="small"
                                      fullWidth
                                      value={item.nickname ?? ""}
                                      onChange={(e) =>
                                        setFieldValue(
                                          `items[${index}].nickname`,
                                          e.target.value,
                                        )
                                      }
                                      error={nicknameTouched && !!nicknameError}
                                      helperText={
                                        nicknameTouched ? nicknameError : ""
                                      }
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
                                      nickname: "",
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
                          id="tx-form-whitePrice"
                          label="White Price"
                          size="small"
                          type="number"
                          fullWidth
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
                          sx={numberInputSx}
                          inputProps={{ min: 0, onWheel: preventWheelStep }}
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
                          id="tx-form-fabcon"
                          label="Fabcon"
                          min={0}
                          max={10}
                          size="small"
                          value={values.fabcon}
                          onValueChange={(val) => setFieldValue("fabcon", val)}
                          hideStepper
                          error={
                            !!errors.fabcon &&
                            !!(touched.fabcon || submitCount > 0)
                          }
                          helperText={
                            touched.fabcon || submitCount > 0
                              ? errors.fabcon
                              : ""
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <NumberField
                          id="tx-form-detergent"
                          label="Detergent"
                          min={0}
                          max={10}
                          size="small"
                          value={values.detergent}
                          onValueChange={(val) =>
                            setFieldValue("detergent", val)
                          }
                          hideStepper
                          error={
                            !!errors.detergent &&
                            !!(touched.detergent || submitCount > 0)
                          }
                          helperText={
                            touched.detergent || submitCount > 0
                              ? errors.detergent
                              : ""
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <NumberField
                          id="tx-form-cs"
                          label="Color Safe"
                          min={0}
                          max={10}
                          size="small"
                          value={values.cs}
                          onValueChange={(val) => setFieldValue("cs", val)}
                          hideStepper
                          error={
                            !!errors.cs &&
                            !!(touched.cs || submitCount > 0)
                          }
                          helperText={
                            touched.cs || submitCount > 0 ? errors.cs : ""
                          }
                        />
                      </Grid>

                      <Grid size={12}>
                        <Divider>Release Details</Divider>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        {renderDatePicker(
                          "datePickup",
                          "Date Pickup",
                          !releaseFieldsDisabled,
                          () => {
                            setFieldValue("releaseBy", "");
                          },
                          releaseFieldsDisabled,
                        )}
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Stack direction="row" spacing={0.5} alignItems="flex-start">
                          <FormControl
                            fullWidth
                            size="small"
                            disabled={releaseFieldsDisabled}
                            error={Boolean(getIn(errors, "releaseBy"))}
                          >
                            <InputLabel id="tx-modal-release-by-label" shrink>
                              Release By
                            </InputLabel>
                            <Select
                              id="tx-form-releaseBy"
                              labelId="tx-modal-release-by-label"
                              label="Release By"
                              displayEmpty
                              disabled={releaseFieldsDisabled}
                              value={values.releaseBy || ""}
                              onChange={(e) => {
                                const next = String(e.target.value);
                                setFieldValue("releaseBy", next);
                                if (!next) {
                                  setFieldValue("datePickup", null);
                                }
                              }}
                              error={Boolean(getIn(errors, "releaseBy"))}
                              renderValue={(selected) => {
                                if (!selected) {
                                  return (
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      Select employee
                                    </Typography>
                                  );
                                }
                                const label = resolveEmployeeLabel(
                                  String(selected),
                                );
                                if (!label) {
                                  return (
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      Select employee
                                    </Typography>
                                  );
                                }
                                return label;
                              }}
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
                            {getIn(errors, "releaseBy") ? (
                              <FormHelperText>
                                {String(getIn(errors, "releaseBy"))}
                              </FormHelperText>
                            ) : releaseFieldsDisabled ? (
                              <FormHelperText>
                                {FORM_ERRORS.RELEASE_AFTER_LOADED_HINT}
                              </FormHelperText>
                            ) : null}
                          </FormControl>
                          {values.releaseBy && !releaseFieldsDisabled ? (
                            <Tooltip title="Clear release by">
                              <IconButton
                                aria-label="clear release by"
                                size="small"
                                sx={{ mt: 0.25 }}
                                onClick={() => {
                                  setFieldValue("releaseBy", "");
                                  setFieldValue("datePickup", null);
                                }}
                              >
                                <ClearIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                        </Stack>
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
                    lockedAddonPricing={
                      isEditing ? lockedAddonPricing : undefined
                    }
                  />
                </Grid>
              </Grid>

              <DialogActions sx={{ justifyContent: "center", pb: 4 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleClose}
                  sx={{ minWidth: 100 }}
                >
                  {UI_TEXT.CANCEL}
                </Button>
                <Button
                  type="button"
                  variant="contained"
                  size="small"
                  sx={{ minWidth: 100 }}
                  disabled={loading}
                  onClick={() => {
                    void handleSaveAttempt();
                  }}
                >
                  {loading ? UI_TEXT.SAVING : UI_TEXT.SAVE}
                </Button>
              </DialogActions>

              <Dialog
                open={addCustomerOpen}
                disableEscapeKeyDown
                onClose={(_, reason) => {
                  if (reason === "backdropClick") return;
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
                        name="lh_new_customer_name"
                        autoComplete="new-password"
                        inputProps={{ autoComplete: "new-password" }}
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
                        name="lh_new_customer_mobile"
                        autoComplete="new-password"
                        inputProps={{ autoComplete: "new-password" }}
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
                        name="lh_new_customer_address"
                        autoComplete="new-password"
                        inputProps={{ autoComplete: "new-password" }}
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
                        name="lh_new_customer_notes"
                        autoComplete="new-password"
                        inputProps={{ autoComplete: "new-password" }}
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
    </Dialog>
  );
};

export default TransactionModal;
