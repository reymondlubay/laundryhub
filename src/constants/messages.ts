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
  CURRENT_PASSWORD_REQUIRED: "Current password is required",
  PASSWORD_MISMATCH: "New password and confirmation do not match",
  NEGATIVE_NOT_ALLOWED: "Cannot be negative",
  FUTURE_DATE_NOT_ALLOWED: "Cannot select a future date",
  DATE_RECEIVED_REQUIRED: "Date received is required",
  RECEIVE_BY_REQUIRED: "Receive by is required",
  DATE_PICKUP_REQUIRED_WITH_RELEASE_BY:
    "Date pickup is required when release by is selected",
  RELEASE_BY_REQUIRED_WITH_DATE_PICKUP:
    "Release by is required when date pickup is set",
  TRANSACTION_NOT_YET_LOADED: "This transaction is not yet loaded.",
  RELEASE_AFTER_LOADED_HINT:
    "Mark the transaction as loaded before setting pickup.",
} as const;

export const API_ERRORS = {
  LOGIN_FAILED: "Login failed. Please try again.",
  FETCH_USERS_FAILED: "Failed to fetch users",
  CREATE_USER_FAILED: "Failed to create user",
  UPDATE_USER_FAILED: "Failed to update user",
  UPDATE_PROFILE_FAILED: "Failed to update profile",
  DELETE_USER_FAILED: "Failed to delete user",
  FETCH_CUSTOMERS_FAILED: "Failed to fetch customers",
  CREATE_CUSTOMER_FAILED: "Failed to create customer",
  UPDATE_CUSTOMER_FAILED: "Failed to update customer",
  DELETE_CUSTOMER_FAILED: "Failed to delete customer",
  MERGE_CUSTOMERS_FAILED: "Failed to merge customer transactions",
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
  PROFILE_UPDATED: "Profile updated successfully",
  CUSTOMER_CREATED: "Customer created successfully",
  CUSTOMER_UPDATED: "Customer updated successfully",
  TRANSACTION_CREATED: "Transaction created successfully",
  TRANSACTION_UPDATED: "Transaction updated successfully",
} as const;

export const CONFIRM_MESSAGES = {
  DELETE_USER: "Delete this user?",
  DELETE_CUSTOMER: "Delete this customer?",
  DELETE_TRANSACTION: "Are you sure you want to delete this transaction?",
  PERMANENT_DELETE_TRANSACTION:
    "Permanently delete this transaction? This cannot be undone.",
  RESTORE_TRANSACTION:
    "Restore this transaction? It will appear again in the active transaction list.",
  ARCHIVE_TRANSACTIONS: (year: number, count: number) =>
    `Archive ${count} completed transaction(s) from ${year}? They will be moved to the archive and removed from active records.`,
  MERGE_CUSTOMER_TRANSACTIONS: (
    sourceName: string,
    targetName: string,
    count: number,
  ) =>
    `${sourceName} has ${count} transaction(s) that will be reassigned to ${targetName}. After the merge, ${sourceName} will be permanently deleted. This action cannot be undone.`,
  DELETE_PAYMENT:
    "Are you sure you want to delete this payment? This action cannot be undone.",
  PICKUP_WITH_BALANCE:
    "This transaction has a balance. Are you sure you want to release?",
  PICKUP_NOT_YET_PAID:
    "This transaction has not yet been paid. Are you sure you want to release?",
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
  RECONNECTING: "Reconnecting to server…",
  BACKEND_UNAVAILABLE: "Could not reach the server.",
  RETRY: "Retry",
  MERGE_CUSTOMER_TRANSACTIONS: "Move and delete customer",
  MERGE_CUSTOMER_TRANSACTIONS_TITLE: "Merge customer transactions",
  MERGE_CONFIRM_PLACEHOLDER: "MERGE",
  MERGE_CONFIRM_TITLE: "Confirm customer merge",
  MERGE_CONFIRM_ACTION: "Merge customers",
  MERGE_CONFIRM_TYPING: "Type MERGE to confirm.",
  MERGE_SUCCESS: (count: number, sourceName: string, targetName: string) =>
    `${count} transaction(s) moved from ${sourceName} to ${targetName}. ${sourceName} was deleted.`,
  FROM_CUSTOMER: "From",
  TO_CUSTOMER: "To",
  SELECT_CUSTOMER: "Select customer",
  TRANSACTIONS_TO_MOVE: (count: number) =>
    `${count} transaction(s) will be moved`,
  TARGET_TRANSACTION_COUNT: (count: number) =>
    `${count} existing transaction(s)`,
} as const;
