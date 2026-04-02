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
} from "@mui/material";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { useState, useEffect } from "react";
import * as Yup from "yup";
import type { Payment, PaymentMode } from "../../services/apiTypes";

type PaymentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: Omit<Payment, "id">) => void;
  editingPayment?: Payment;
  isEditMode?: boolean;
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
}) => {
  const [paymentDate, setPaymentDate] = useState<Dayjs>(dayjs());
  const [amount, setAmount] = useState<string>("");
  const [mode, setMode] = useState<PaymentMode>("Cash");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingPayment && isEditMode) {
      setPaymentDate(dayjs(editingPayment.paymentDate));
      setAmount(editingPayment.amount.toString());
      setMode(editingPayment.mode);
    } else {
      setPaymentDate(dayjs());
      setAmount("");
      setMode("Cash");
    }
    setErrors({});
  }, [editingPayment, isEditMode, isOpen]);

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

  return (
    <Dialog open={isOpen} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditMode ? "Edit Payment" : "Add Payment"}</DialogTitle>
      <DialogContent
        sx={{ pt: 3, display: "flex", flexDirection: "column", gap: 2 }}
      >
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateTimePicker
            label="Payment Date"
            value={paymentDate}
            onChange={(val) => val && setPaymentDate(val)}
            maxDate={dayjs()} // Prevent future dates
            slotProps={{
              textField: {
                size: "small",
                fullWidth: true,
                error: !!errors.paymentDate,
                helperText: errors.paymentDate || "",
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
          InputProps={{
            startAdornment: <InputAdornment position="start">₱</InputAdornment>,
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
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="GCash">GCash</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button variant="outlined" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave}>
          {isEditMode ? "Update" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
