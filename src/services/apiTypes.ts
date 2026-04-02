export type LaundryType = "Clothes" | "Beddings" | "Comforter";

export type LaundryItem = {
  type: LaundryType;
  kg: number;
  loads: number;
  price: number;
};

export type PaymentMode = "Cash" | "GCash";

export type Payment = {
  id: string;
  paymentDate: Date;
  amount: number;
  mode: PaymentMode;
};
