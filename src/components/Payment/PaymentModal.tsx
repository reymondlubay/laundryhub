import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { useRef, useState, useEffect } from "react";
import * as Yup from "yup";
import type { Payment, PaymentMode } from "../../services/apiTypes";
import {
  DEFAULT_PAYMENT_MODE,
  PAYMENT_MODE_CASH,
  PAYMENT_MODE_GCASH,
} from "../../constants/payment";
import { UI_TEXT } from "../../constants/messages";

type PaymentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: Omit<Payment, "id">) => void;
  editingPayment?: Payment;
  isEditMode?: boolean;
  balance?: number;
  history?: Array<{
    id?: string;
    paymentDate: string | Date;
    amount: number;
    mode: string;
  }>;
  positionTop?: boolean;
};

const validationSchema = Yup.object().shape({
  amount: Yup.number()
    .positive("Amount must be greater than 0")
    .required("Amount is required"),
  mode: Yup.string().required("Payment mode is required"),
  paymentDate: Yup.date().required("Payment date is required"),
});

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingPayment,
  isEditMode = false,
  balance,
  history = [],
  positionTop = false,
}) => {
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const [paymentDate, setPaymentDate] = useState<Dayjs>(dayjs());
  const [amount, setAmount] = useState<string>("");
  const [mode, setMode] = useState<PaymentMode>(DEFAULT_PAYMENT_MODE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingPayment && isEditMode) {
      setPaymentDate(dayjs(editingPayment.paymentDate));
      setAmount(editingPayment.amount.toString());
      setMode(editingPayment.mode);
    } else {
      setPaymentDate(dayjs());
      setAmount("");
      setMode(DEFAULT_PAYMENT_MODE);
    }
    setErrors({});
  }, [editingPayment, isEditMode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      amountInputRef.current?.focus();
      amountInputRef.current?.select?.();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const handleSave = async () => {
    try {
      // Validate inputs
      const values = {
        amount: Number(amount),
        mode,
        paymentDate: paymentDate.toDate(),
      };

      await validationSchema.validate(values, { abortEarly: false });

      onSave(values);
      handleClose();
    } catch (err: any) {
      const validationErrors: Record<string, string> = {};
      if (err.inner) {
        err.inner.forEach(
          (error: any) => (validationErrors[error.path] = error.message),
        );
      }
      setErrors(validationErrors);
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  const sanitizeAmount = (value: string) => {
    // Allow only positive numbers and decimal point
    const sanitized = value.replace(/[^0-9.]/g, "");
    // Prevent multiple decimal points
    const parts = sanitized.split(".");
    return parts.length > 2 ? parts[0] + "." + parts[1] : sanitized;
  };

  const formatCurrency = (value: number): string => {
    const n = Number(value || 0);
    return `₱${n.toFixed(2)}`;
  };

  return (
    <Dialog
      open={isOpen}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            position: positionTop ? "fixed" : "relative",
            top: positionTop ? 20 : "auto",
            margin: positionTop ? 0 : undefined,
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
            minWidth: 0,
          }}
        >
          <Typography
            variant="h6"
            component="div"
            sx={{ fontWeight: 600, minWidth: 0 }}
          >
            {isEditMode ? "Edit Payment" : "Add Payment"}
          </Typography>

          {typeof balance === "number" ? (
            <Chip
              label={`Balance: ${formatCurrency(balance)}`}
              sx={(theme) => ({
                height: 34,
                px: 0.75,
                borderRadius: 2,
                fontWeight: 800,
                fontSize: "0.95rem",
                letterSpacing: 0.2,
                borderWidth: 2,
                borderStyle: "solid",
                borderColor:
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.35)"
                    : "rgba(0,0,0,0.2)",
                bgcolor:
                  theme.palette.mode === "dark"
                    ? "#000"
                    : "rgba(25, 118, 210, 0.08)",
                color:
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(0,0,0,0.85)",
                "& .MuiChip-label": {
                  px: 1,
                  py: 0,
                },
              })}
            />
          ) : null}
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{
          pt: 2.5,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          overflow: "auto",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 2,
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label="Payment Date"
                value={paymentDate}
                onChange={(val) => val && setPaymentDate(val)}
                maxDate={dayjs()} // Prevent future dates
                timeSteps={{ minutes: 1 }}
                slotProps={{
                  actionBar: { actions: ["today", "cancel", "accept"] },
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
                    size: "small",
                    fullWidth: true,
                    error: !!errors.paymentDate,
                    helperText: errors.paymentDate || "",
                    sx: {
                      mt: 0.5,
                      "& .MuiInputBase-input": {
                        color: "text.primary",
                      },
                      "& .MuiInputLabel-root": {
                        color: "text.secondary",
                      },
                    },
                  },
                }}
              />
            </LocalizationProvider>

            <TextField
              label="Amount"
              type="text"
              size="small"
              fullWidth
              value={amount}
              onChange={(e) => setAmount(sanitizeAmount(e.target.value))}
              error={!!errors.amount}
              helperText={errors.amount || ""}
              inputRef={amountInputRef}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">₱</InputAdornment>
                ),
              }}
              placeholder="0.00"
            />

            <FormControl size="small" fullWidth error={!!errors.mode}>
              <InputLabel>Payment Mode</InputLabel>
              <Select
                value={mode}
                label="Payment Mode"
                onChange={(e) => setMode(e.target.value as PaymentMode)}
              >
                <MenuItem value={PAYMENT_MODE_CASH}>{PAYMENT_MODE_CASH}</MenuItem>
                <MenuItem value={PAYMENT_MODE_GCASH}>{PAYMENT_MODE_GCASH}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {history.length > 0 ? (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Payment Date</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Amount
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Mode</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...history]
                  .sort(
                    (a, b) =>
                      dayjs(a.paymentDate).valueOf() - dayjs(b.paymentDate).valueOf(),
                  )
                  .map((p, idx) => (
                    <TableRow key={p.id || `${p.paymentDate}-${idx}`} hover>
                      <TableCell>
                        {dayjs(p.paymentDate).format("MM-DD-YY h:mm A")}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(Number(p.amount || 0))}
                      </TableCell>
                      <TableCell>{p.mode}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button variant="outlined" onClick={handleClose}>
          {UI_TEXT.CANCEL}
        </Button>
        <Button variant="contained" onClick={handleSave}>
          {isEditMode ? UI_TEXT.UPDATE : UI_TEXT.SAVE}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
