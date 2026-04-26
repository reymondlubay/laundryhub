export const API_ROUTES = {
  LOGIN: "/login",
  LOGOUT: "/logout",
  TRANSACTIONS: "/transactions",
  USERS: "/users",
  CUSTOMERS: "/customers",
  BACKUP: "/backup",
  BACKUP_UPLOAD: "/backup/upload",
  BACKUPS: "/backups",
  RESTORE: "/restore",
  ADDONS_PRICING: "/addons-pricing",
  AUDIT_LOGS: "/audit-logs",
  AUDIT_LOG_SETTINGS: "/audit-logs/settings",
} as const;

export default API_ROUTES;
