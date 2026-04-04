import authService from "../services/authService";

/**
 * Get authentication token
 */
export const getToken = (): string | null => {
  return authService.getToken();
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return authService.isAuthenticated();
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
  return authService.getCurrentUser();
};

/**
 * Clear authentication (logout)
 */
export const clearAuth = (): void => {
  authService.logout();
};
