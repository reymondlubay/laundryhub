import { Divider, Paper, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import type { TransactionFormValues } from "../TransactionModal";
import { PaymentManager } from "../../../../../components/Payment";
import type { Payment } from "../../../../../services/apiTypes";
import addonsPricingService, {
  DEFAULT_ADDONS_PRICING,
  type AddonsPricing,
} from "../../../../../services/addonsPricingService";

const BillSummary = ({
  transactionFormValues,
  payments,
  onPaymentsChange,
}: {
  transactionFormValues: TransactionFormValues;
  payments: Payment[];
  onPaymentsChange: (payments: Payment[]) => void;
}) => {
  const [total, setTotal] = useState(0);
  const [addonsPricing, setAddonsPricing] = useState<AddonsPricing>(
    DEFAULT_ADDONS_PRICING,
  );

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const pricing = await addonsPricingService.get();
        setAddonsPricing(pricing);
      } catch {
        setAddonsPricing(DEFAULT_ADDONS_PRICING);
      }
    };

    void loadPricing();
  }, []);

  const calculateTotals = (values: TransactionFormValues) => {
    const itemsTotal = values.items.reduce(
      (sum, item) => sum + Number(item.price || 0),
      0,
    );
    const addOnsTotal =
      values.whitePrice +
      values.fabcon * addonsPricing.fabconPrice +
      values.detergent * addonsPricing.detergentPrice +
      values.cs * addonsPricing.colorSafePrice;

    return {
      itemsTotal,
      addOnsTotal,
      grandTotal: itemsTotal + addOnsTotal,
    };
  };

  useEffect(() => {
    setTotal(calculateTotals(transactionFormValues).grandTotal);
  }, [addonsPricing, transactionFormValues]);

  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      <Typography gutterBottom align="center">
        Payment Details
      </Typography>

      <Divider sx={{ mb: 1 }} />

      <table style={{ width: "100%", fontSize: 14 }}>
        <thead>
          <tr>
            <th align="left">Item</th>
            <th align="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactionFormValues.items
            .filter((i) => i.price > 0)
            .map((i) => (
              <tr key={i.type}>
                <td>{i.type}</td>
                <td align="right">₱{i.price}</td>
              </tr>
            ))}

          {transactionFormValues.whitePrice > 0 && (
            <tr>
              <td>White Price</td>
              <td align="right">₱{transactionFormValues.whitePrice}</td>
            </tr>
          )}
          {transactionFormValues.fabcon > 0 && (
            <tr>
              <td>Fabcon (x{addonsPricing.fabconPrice})</td>
              <td align="right">
                ₱{transactionFormValues.fabcon * addonsPricing.fabconPrice}
              </td>
            </tr>
          )}
          {transactionFormValues.detergent > 0 && (
            <tr>
              <td>Detergent (x{addonsPricing.detergentPrice})</td>
              <td align="right">
                ₱
                {transactionFormValues.detergent * addonsPricing.detergentPrice}
              </td>
            </tr>
          )}
          {transactionFormValues.cs > 0 && (
            <tr>
              <td>CS (x{addonsPricing.colorSafePrice})</td>
              <td align="right">
                ₱{transactionFormValues.cs * addonsPricing.colorSafePrice}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Divider sx={{ my: 1 }} />

      <Typography fontWeight="bold" align="right">
        Grand Total: ₱{total}
      </Typography>

      {/* Payment Manager */}
      <PaymentManager
        initialPayments={payments}
        onPaymentsChange={onPaymentsChange}
      />
    </Paper>
  );
};

export default BillSummary;
