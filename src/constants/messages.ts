export const FORM_ERRORS = {
  REQUIRED_USERNAME: "Username is required",
  REQUIRED_PASSWORD: "Password is required",
  REQUIRED_CUSTOMER: "Customer is required",
  REQUIRED_CUSTOMER_NAME: "Customer name is required",
  REQUIRED_FIRST_NAME: "First name is required",
  REQUIRED_LAST_NAME: "Last name is required",
  REQUIRED_MOBILE_NUMBER: "Mobile number is required",
  REQUIRED_DATE_HIRED: "Date hired is required",
  REQUIRED_USERNAME_AND_PASSWORD: "Please enter both username and password",
  PASSWORD_MIN_LENGTH: "Password must be at least 6 characters",
  NEGATIVE_NOT_ALLOWED: "Cannot be negative",
  FUTURE_DATE_NOT_ALLOWED: "Cannot select a future date",
  DATE_RECEIVED_REQUIRED: "Date received is required",
} as const;

export const API_ERRORS = {
  LOGIN_FAILED: "Login failed. Please try again.",
  FETCH_USERS_FAILED: "Failed to fetch users",
  CREATE_USER_FAILED: "Failed to create user",
  UPDATE_USER_FAILED: "Failed to update user",
  DELETE_USER_FAILED: "Failed to delete user",
  FETCH_CUSTOMERS_FAILED: "Failed to fetch customers",
  CREATE_CUSTOMER_FAILED: "Failed to create customer",
  UPDATE_CUSTOMER_FAILED: "Failed to update customer",
  DELETE_CUSTOMER_FAILED: "Failed to delete customer",
  FETCH_TRANSACTIONS_FAILED: "Failed to fetch transactions",
  FETCH_TRANSACTION_FAILED: "Failed to fetch transaction",
  CREATE_TRANSACTION_FAILED: "Failed to create transaction",
  UPDATE_TRANSACTION_FAILED: "Failed to update transaction",
  DELETE_TRANSACTION_FAILED: "Failed to delete transaction",
  SAVE_FAILED: "Save failed",
  LOAD_USERS_FAILED: "Failed to load users",
  LOAD_CUSTOMERS_FAILED: "Failed to load customers",
  LOAD_TRANSACTIONS_FAILED: "Failed to load transactions",
} as const;

export const SUCCESS_MESSAGES = {
  USER_CREATED: "User created successfully",
  USER_UPDATED: "User updated successfully",
  CUSTOMER_CREATED: "Customer created successfully",
  CUSTOMER_UPDATED: "Customer updated successfully",
  TRANSACTION_CREATED: "Transaction created successfully",
  TRANSACTION_UPDATED: "Transaction updated successfully",
} as const;

export const CONFIRM_MESSAGES = {
  DELETE_USER: "Delete this user?",
  DELETE_CUSTOMER: "Delete this customer?",
  DELETE_TRANSACTION: "Are you sure you want to delete this transaction?",
  DELETE_PAYMENT:
    "Are you sure you want to delete this payment? This action cannot be undone.",
} as const;

export const EMPTY_STATES = {
  NO_USERS: "No users found.",
  NO_CUSTOMERS: "No customers found.",
  NO_TRANSACTIONS: "No transactions found.",
} as const;

export const UI_TEXT = {
  SAVE: "Save",
  SAVING: "Saving...",
  UPDATE: "Update",
  DELETE: "Delete",
  CANCEL: "Cancel",
  SEARCH: "Search",
  CLEAR: "Clear",
  SIGN_IN: "Sign In",
  READ_NOTES: "Read Notes",
} as const;
