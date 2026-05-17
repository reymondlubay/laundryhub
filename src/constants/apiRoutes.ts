export const API_ROUTES = {
  LOGIN: "/login",
  LOGOUT: "/logout",
  TRANSACTIONS: "/transactions",
  USERS: "/users",
  CUSTOMERS: "/customers",
  INVENTORY_ITEMS: "/inventory-items",
  INVENTORY_RECORDS: "/inventory-records",
  EXPENSE_ITEMS: "/expense-items",
  EXPENSE_RECORDS: "/expense-records",
  FIXED_MONTHLY_EXPENSES: "/fixed-monthly-expenses",
  BACKUP: "/backup",
  BACKUP_UPLOAD: "/backup/upload",
  BACKUP_FOLDER_PATHS: "/backup/folder-paths",
  BACKUPS: "/backups",
  RESTORE: "/restore",
  ADDONS_PRICING: "/addons-pricing",
  ACTIVITY_LOGS: "/activity-logs",
  ACTIVITY_LOG_SETTINGS: "/activity-logs/settings",
  ACTIVITY_LOG_CLEANUP: "/activity-logs/cleanup",
} as const;

export default API_ROUTES;
