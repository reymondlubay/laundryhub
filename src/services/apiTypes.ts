export type LaundryType = "Clothes" | "Beddings" | "Comforter";

export type LaundryItem = {
  type: LaundryType;
  kg: number;
  loads: number;
  price: number;
};
