import { USER_ROLE_ADMIN, USER_ROLE_EMPLOYEE } from "../constants/roles";
import type { UserRoleValue } from "../constants/roles";
import route from "../constants/route";
import authService from "../services/authService";

const ALL_APP_PATHS = [
  route.DASHBOARD,
  route.TRANSACTION,
  route.CUSTOMER,
  route.INVENTORY_ITEMS,
  route.INVENTORY_MANAGE,
  route.INVENTORY_SUMMARY,
  route.EXPENSES_ITEMS,
  route.EXPENSES_RECORDS,
  route.REPORT_TRANSACTION,
  route.REPORT_TRANSACTION_SUMMARY,
  route.REPORT_TRANSACTION_GRAPH_SUMMARY,
  route.REPORT_CUSTOMER,
  route.REPORT_INVENTORY,
  route.REPORT_EXPENSES,
  route.REPORT_SALES,
  route.REPORT_SALES_EXPENSE_GRAPH,
  route.REPORT_COLLECTION,
  route.REPORT_LOAD,
  route.REPORT_RECEIVE_RELEASE,
  route.USERS,
  route.SETTINGS,
  route.SETTINGS_ADDONS_PRICING,
  route.SETTINGS_FIXED_MONTHLY_EXPENSES,
  route.SETTINGS_ACTIVITY_LOG,
  route.SETTINGS_DELETED_TRANSACTIONS,
  route.ARCHIVE_RECORD,
  route.ARCHIVE_LISTING,
] as const;

const EMPLOYEE_PATHS = [
  route.DASHBOARD,
  route.TRANSACTION,
  route.CUSTOMER,
  route.REPORT_TRANSACTION,
  route.EXPENSES_RECORDS,
  route.SETTINGS,
] as const;

const MODULE_ACCESS: Record<UserRoleValue, readonly string[]> = {
  [USER_ROLE_ADMIN]: ALL_APP_PATHS,
  [USER_ROLE_EMPLOYEE]: EMPLOYEE_PATHS,
};

/**
 * Check if current user can access a route
 */
export const canAccessRoute = (pathname: string): boolean => {
  const currentUser = authService.getCurrentUser();
  if (!currentUser) return false;

  const userRole = currentUser.role as UserRoleValue;
  const allowedRoutes = MODULE_ACCESS[userRole];

  return allowedRoutes.some(
    (allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`),
  );
};

/**
 * Check if user is Admin
 */
export const isAdmin = (): boolean => {
  const currentUser = authService.getCurrentUser();
  return currentUser?.role === USER_ROLE_ADMIN;
};

/**
 * Check if user is Employee
 */
export const isEmployee = (): boolean => {
  const currentUser = authService.getCurrentUser();
  return currentUser?.role === USER_ROLE_EMPLOYEE;
};

/**
 * Get allowed routes for current user
 */
export const getAllowedRoutes = (): string[] => {
  const currentUser = authService.getCurrentUser();
  if (!currentUser) return [];

  const userRole = currentUser.role as UserRoleValue;
  return [...MODULE_ACCESS[userRole]];
};

/**
 * Get restricted routes for current user (routes they cannot access)
 */
export const getRestrictedRoutes = (): string[] => {
  const currentUser = authService.getCurrentUser();
  if (!currentUser) return [];

  const userRole = currentUser.role as UserRoleValue;
  const allowedRoutes = MODULE_ACCESS[userRole];

  return ALL_APP_PATHS.filter((path) => !allowedRoutes.includes(path));
};
