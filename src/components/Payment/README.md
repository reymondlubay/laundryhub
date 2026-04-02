# Payment Module

A complete payment management module for the LaundryHub application built with React, TypeScript, and Material-UI.

## Components

### 1. PaymentManager
Main component that orchestrates the payment workflow.

**Usage:**
```tsx
import { PaymentManager } from './components/Payment';

function MyComponent() {
  const handlePaymentsChange = (payments) => {
    console.log('Payments updated:', payments);
  };

  return (
    <PaymentManager
      transactionId="txn_123"
      onPaymentsChange={handlePaymentsChange}
    />
  );
}
```

**Props:**
- `transactionId` (optional): String to link payments to a specific transaction
- `onPaymentsChange` (optional): Callback function that fires when payments are added/updated/deleted

### 2. PaymentModal
Dialog component for adding/editing payments.

**Features:**
- DateTimePicker for payment date (defaults to current date/time)
- Numeric input for payment amount (₱ currency)
- Select dropdown for payment mode (Cash, GCash)
- Full form validation with error messages
- Dynamic button text (Save/Update)

### 3. PaymentTable
Table component displaying all payments with actions.

**Features:**
- Clean table display with sortable columns
- Edit button to modify existing payments
- Delete button with confirmation dialog
- Currency formatting for amounts
- DateTime formatting for dates
- Empty state message when no payments exist

## Data Model

```typescript
type Payment = {
  id: string;                    // Unique identifier
  paymentDate: Date;             // When the payment was made
  amount: number;                // Payment amount in decimal format
  mode: "Cash" | "GCash";        // Payment method
};
```

## Features

✅ **Add Payments**: Click "Add Payment" button to open modal  
✅ **Edit Payments**: Click edit icon on any payment to modify  
✅ **Delete Payments**: Click delete icon with confirmation  
✅ **Validation**: Amount must be > 0, mode is required  
✅ **Total Summary**: Shows sum of all payments  
✅ **Date/Time Picker**: Prevents future dates  
✅ **Currency Formatting**: Displays with ₱ symbol  
✅ **Responsive Design**: Works on all screen sizes  
✅ **Error Handling**: User-friendly error messages  

## Integration Example

To integrate PaymentManager into your TransactionModal:

```tsx
import { PaymentManager } from '../components/Payment';

export const TransactionModal = ({ isOpen, handleClose }) => {
  // ... existing code ...

  return (
    <Dialog open={isOpen} maxWidth="lg" fullWidth>
      {/* ... existing transaction form ... */}
      
      <PaymentManager 
        transactionId={transactionId}
        onPaymentsChange={(payments) => {
          // Update your form state with payments
          setFieldValue('payments', payments);
        }}
      />
    </Dialog>
  );
};
```

## Validation Rules

- **Amount**: Must be positive number (> 0)
- **Mode**: Must be selected (Cash or GCash)
- **Payment Date**: Cannot be in the future

## Styling

All components use Material-UI theme and follow the existing LaundryHub design system. Customize styling by:

1. Passing `sx` props to components
2. Modifying MUI theme in your app
3. Creating custom CSS modules

## Future Enhancements

- Payment confirmation/receipt generation
- Payment history and reports
- Multiple currency support
- Payment scheduling
- Integration with payment gateway APIs
- Receipt printing
