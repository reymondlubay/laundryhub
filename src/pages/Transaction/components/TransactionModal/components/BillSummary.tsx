import { Divider, Paper, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import type { TransactionFormValues } from "../TransactionModal";
import { PaymentManager } from "../../../../../components/Payment";

const BillSummary = ({
  transactionFormValues,
}: {
  transactionFormValues: TransactionFormValues;
}) => {
  const [total, setTotal] = useState(0);
  const calculateTotals = (values: TransactionFormValues) => {
    const itemsTotal = values.items.reduce(
      (sum, item) => sum + Number(item.price || 0),
      0,
    );
    const addOnsTotal =
      values.whitePrice +
      values.fabcon * 20 +
      values.detergent * 20 +
      values.cs * 20;

    return {
      itemsTotal,
      addOnsTotal,
      grandTotal: itemsTotal + addOnsTotal,
    };
  };

  useEffect(() => {
    setTotal(calculateTotals(transactionFormValues).grandTotal);
  }, [transactionFormValues]);

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
              <td>Fabcon (x20)</td>
              <td align="right">₱{transactionFormValues.fabcon * 20}</td>
            </tr>
          )}
          {transactionFormValues.detergent > 0 && (
            <tr>
              <td>Detergent (x20)</td>
              <td align="right">₱{transactionFormValues.detergent * 20}</td>
            </tr>
          )}
          {transactionFormValues.cs > 0 && (
            <tr>
              <td>CS (x20)</td>
              <td align="right">₱{transactionFormValues.cs * 20}</td>
            </tr>
          )}
        </tbody>
      </table>

      <Divider sx={{ my: 1 }} />

      <Typography fontWeight="bold" align="right">
        Grand Total: ₱{total}
      </Typography>

      {/* Payment Manager */}
      <PaymentManager />
    </Paper>
  );
};

export default BillSummary;
