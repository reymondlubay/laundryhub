import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Typography,
  Box,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useState } from "react";
import type { Payment } from "../../services/apiTypes";
import dayjs from "dayjs";
import { CONFIRM_MESSAGES, UI_TEXT } from "../../constants/messages";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog.tsx";

type PaymentTableProps = {
  payments: Payment[];
  onEdit: (payment: Payment) => void;
  onDelete: (paymentId: string) => void;
};

export const PaymentTable: React.FC<PaymentTableProps> = ({
  payments,
  onEdit,
  onDelete,
}) => {
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(
    null,
  );

  const handleDeleteClick = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
  };

  const handleConfirmDelete = () => {
    if (!selectedPaymentId) return;
    onDelete(selectedPaymentId);
    setSelectedPaymentId(null);
  };

  const formatCurrency = (amount: number): string => {
    return `₱${amount.toFixed(2)}`;
  };

  const formatDateTime = (date: Date): string => {
    return dayjs(date).format("MMM DD, YYYY HH:mm");
  };

  if (payments.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography color="textSecondary">
          No payments added yet. Click "Add Payment" to get started.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead
            sx={{
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? theme.palette.primary.dark
                  : "#f5f5f5",
            }}
          >
            <TableRow>
              <TableCell
                align="left"
                sx={{
                  fontWeight: "bold",
                  color: (theme) =>
                    theme.palette.mode === "dark"
                      ? "primary.contrastText"
                      : "inherit",
                }}
              >
                Payment Date
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: "bold",
                  color: (theme) =>
                    theme.palette.mode === "dark"
                      ? "primary.contrastText"
                      : "inherit",
                }}
              >
                Amount
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontWeight: "bold",
                  color: (theme) =>
                    theme.palette.mode === "dark"
                      ? "primary.contrastText"
                      : "inherit",
                }}
              >
                Mode
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontWeight: "bold",
                  color: (theme) =>
                    theme.palette.mode === "dark"
                      ? "primary.contrastText"
                      : "inherit",
                }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id} hover>
                <TableCell align="left">
                  {formatDateTime(payment.paymentDate)}
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(payment.amount)}
                </TableCell>
                <TableCell align="center">{payment.mode}</TableCell>
                <TableCell align="center">
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => onEdit(payment)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteClick(payment.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmDialog
        open={Boolean(selectedPaymentId)}
        title="Confirm Delete"
        message={CONFIRM_MESSAGES.DELETE_PAYMENT}
        confirmText={UI_TEXT.DELETE}
        onClose={() => setSelectedPaymentId(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};
