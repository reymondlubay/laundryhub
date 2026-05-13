export const API_ROUTES = {
  LOGIN: "/login",
  LOGOUT: "/logout",
  TRANSACTIONS: "/transactions",
  USERS: "/users",
  CUSTOMERS: "/customers",
  INVENTORY_ITEMS: "/inventory-items",
  INVENTORY_RECORDS: "/inventory-records",
  STOCK_USAGE_RECORDS: "/stock-usage-records",
  EXPENSE_ITEMS: "/expense-items",
  EXPENSE_RECORDS: "/expense-records",
  BACKUP: "/backup",
  BACKUP_UPLOAD: "/backup/upload",
  BACKUP_FOLDER_PATHS: "/backup/folder-paths",
  BACKUPS: "/backups",
  RESTORE: "/restore",
  ADDONS_PRICING: "/addons-pricing",
} as const;

export default API_ROUTES;
