import { USER_ROLE_ADMIN, USER_ROLE_EMPLOYEE } from "../constants/roles";
import type { UserRoleValue } from "../constants/roles";
import authService from "../services/authService";

/**
 * Define module access by role
 * Employee: Dashboard, Transaction, Customer only
 * Admin: All modules
 */
const MODULE_ACCESS: Record<UserRoleValue, string[]> = {
  [USER_ROLE_ADMIN]: [
    "/dashboard",
    "/transaction",
    "/customer",
    "/reports/transaction",
    "/reports/customer",
    "/users",
    "/settings/database",
    "/settings/addons-pricing",
  ],
  [USER_ROLE_EMPLOYEE]: ["/dashboard", "/transaction", "/customer"],
};

/**
 * Check if current user can access a route
 */
export const canAccessRoute = (route: string): boolean => {
  const currentUser = authService.getCurrentUser();
  if (!currentUser) return false;

  const userRole = currentUser.role as UserRoleValue;
  const allowedRoutes = MODULE_ACCESS[userRole];

  // Check exact match or prefix match for nested routes
  return allowedRoutes.some(
    (allowed) => route === allowed || route.startsWith(allowed + "/"),
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
  return MODULE_ACCESS[userRole];
};

/**
 * Get restricted routes for current user (routes they cannot access)
 */
export const getRestrictedRoutes = (): string[] => {
  const currentUser = authService.getCurrentUser();
  if (!currentUser) return [];

  const userRole = currentUser.role as UserRoleValue;
  const allRoutes = Object.values(MODULE_ACCESS).flat();
  const uniqueRoutes = Array.from(new Set(allRoutes));
  const allowedRoutes = MODULE_ACCESS[userRole];

  return uniqueRoutes.filter((route) => !allowedRoutes.includes(route));
};
