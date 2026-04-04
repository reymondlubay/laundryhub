import axiosClient from "./axiosClient";

export interface Customer {
  id: string;
  name: string;
  address?: string;
  mobileNumber?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

const customerService = {
  getAll: async (): Promise<Customer[]> => {
    try {
      const { data } = await axiosClient.get("/customers");
      return data.customers || data.data || [];
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || "Failed to fetch customers"
          : error instanceof Error
            ? error.message
            : "Failed to fetch customers";

      throw new Error(message);
    }
  },
};

export default customerService;
