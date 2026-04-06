import { useEffect, useState } from "react";
import { Button, Box } from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import { PaymentModal } from "./PaymentModal";
import { PaymentTable } from "./PaymentTable";
import type { Payment } from "../../services/apiTypes";

type PaymentManagerProps = {
  transactionId?: string;
  onPaymentsChange?: (payments: Payment[]) => void;
  initialPayments?: Payment[];
};

/**
 * PaymentManager Component
 *
 * Manages the complete payment workflow:
 * - Add new payments
 * - Edit existing payments
 * - Delete payments
 * - Display payment list with summary
 *
 * Props:
 * - transactionId: Optional ID to link payments to a specific transaction
 * - onPaymentsChange: Callback function when payments list changes
 */
export const PaymentManager: React.FC<PaymentManagerProps> = ({
  transactionId: _transactionId,
  onPaymentsChange,
  initialPayments = [],
}) => {
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | undefined>();
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    setPayments(initialPayments);
  }, [initialPayments]);

  /**
   * Generate unique ID for new payment
   */
  const generatePaymentId = (): string => {
    return `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * Handle opening modal for new payment
   */
  const handleAddPayment = () => {
    setEditingPayment(undefined);
    setIsEditMode(false);
    setModalOpen(true);
  };

  /**
   * Handle opening modal for editing existing payment
   */
  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setIsEditMode(true);
    setModalOpen(true);
  };

  /**
   * Handle closing modal
   */
  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingPayment(undefined);
    setIsEditMode(false);
  };

  /**
   * Handle saving payment (add or update)
   */
  const handleSavePayment = (paymentData: Omit<Payment, "id">) => {
    let updatedPayments: Payment[];

    if (isEditMode && editingPayment) {
      // Update existing payment
      updatedPayments = payments.map((p) =>
        p.id === editingPayment.id ? { ...editingPayment, ...paymentData } : p,
      );
    } else {
      // Add new payment
      const newPayment: Payment = {
        id: generatePaymentId(),
        ...paymentData,
      };
      updatedPayments = [...payments, newPayment];
    }

    setPayments(updatedPayments);
    onPaymentsChange?.(updatedPayments);
  };

  /**
   * Handle deleting payment with confirmation
   */
  const handleDeletePayment = (paymentId: string) => {
    const updatedPayments = payments.filter((p) => p.id !== paymentId);
    setPayments(updatedPayments);
    onPaymentsChange?.(updatedPayments);
  };

  /**
   * Calculate total amount from all payments
   */
  const calculateTotal = (): number => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  return (
    <Box sx={{ mt: 3 }}>
      {/* Header with Add Payment Button */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0 }}>Payments</h3>
        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<AddCircleIcon />}
          onClick={handleAddPayment}
        >
          Add Payment
        </Button>
      </Box>

      {/* Payment Table */}
      <PaymentTable
        payments={payments}
        onEdit={handleEditPayment}
        onDelete={handleDeletePayment}
      />

      {/* Total Summary */}
      {payments.length > 0 && (
        <Box sx={{ mt: 2, textAlign: "right", fontWeight: "bold" }}>
          Total Payments: ₱{calculateTotal().toFixed(2)}
        </Box>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSavePayment}
        editingPayment={editingPayment}
        isEditMode={isEditMode}
      />
    </Box>
  );
};

export default PaymentManager;
