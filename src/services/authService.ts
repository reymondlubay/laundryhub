import axiosClient from "./axiosClient";
import { storage, storageKey } from "../utils/storage";
import API_ROUTES from "../constants/apiRoutes";
import { API_ERRORS } from "../constants/messages";

export interface LoginRequest {
  userName: string;
  password: string;
}

export interface LoginResponse {
  status: string;
  token: string;
  user: {
    id: string;
    userName?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    role: string;
    name?: string;
  };
}

export interface UserInfo {
  id: string;
  userName?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  name?: string;
}

const authService = {
  /**
   * Login with username and password
   * Stores token and user info in localStorage
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    try {
      const { data } = await axiosClient.post<LoginResponse>(API_ROUTES.LOGIN, {
        userName: credentials.userName,
        password: credentials.password,
      });

      if (data.token) {
        // Store token
        storage.setToken(data.token, storageKey.TOKEN);

        // Store user info
        if (data.user) {
          const normalizedUser = {
            ...data.user,
            userName:
              data.user.userName || data.user.username || credentials.userName,
            username:
              data.user.username || data.user.userName || credentials.userName,
            name:
              data.user.name ||
              [data.user.firstName, data.user.lastName]
                .filter(Boolean)
                .join(" ")
                .trim() ||
              data.user.userName ||
              data.user.username ||
              credentials.userName,
          };
          localStorage.setItem("user", JSON.stringify(normalizedUser));
        }
      }

      return data;
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || API_ERRORS.LOGIN_FAILED
          : error instanceof Error
            ? error.message
            : API_ERRORS.LOGIN_FAILED;
      throw new Error(message);
    }
  },

  /**
   * Logout - clear token and user data
   */
  logout: (): void => {
    storage.removeToken(storageKey.TOKEN);
    localStorage.removeItem("user");
    // Redirect handled by axios interceptor or manually
    window.location.href = API_ROUTES.LOGIN;
  },

  /**
   * Get current user from localStorage
   */
  getCurrentUser: (): UserInfo | null => {
    const userStr = localStorage.getItem("user");
    const token = storage.getToken(storageKey.TOKEN);

    const parseTokenPayload = (): Partial<UserInfo> | null => {
      if (!token) return null;
      try {
        const payload = token.split(".")[1];
        if (!payload) return null;
        const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
        const json = decodeURIComponent(
          atob(normalized)
            .split("")
            .map((ch) => `%${`00${ch.charCodeAt(0).toString(16)}`.slice(-2)}`)
            .join(""),
        );
        const parsed = JSON.parse(json);
        return {
          id: parsed.id,
          role: parsed.role,
          userName: parsed.userName || parsed.username,
          username: parsed.username || parsed.userName,
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          name:
            [parsed.firstName, parsed.lastName].filter(Boolean).join(" ") ||
            parsed.userName ||
            parsed.username,
        };
      } catch {
        return null;
      }
    };

    if (!userStr) {
      const tokenUser = parseTokenPayload();
      return tokenUser && tokenUser.id && tokenUser.role
        ? (tokenUser as UserInfo)
        : null;
    }
    try {
      const rawStoredUser = JSON.parse(userStr) as UserInfo & {
        username?: string;
      };
      const storedUser: UserInfo = {
        ...rawStoredUser,
        userName: rawStoredUser.userName || rawStoredUser.username,
        username: rawStoredUser.username || rawStoredUser.userName,
        name:
          rawStoredUser.name ||
          [rawStoredUser.firstName, rawStoredUser.lastName]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          rawStoredUser.userName ||
          rawStoredUser.username,
      };
      if (storedUser.userName || storedUser.firstName || storedUser.name) {
        return storedUser;
      }

      const tokenUser = parseTokenPayload();
      return {
        ...storedUser,
        ...tokenUser,
      };
    } catch {
      const tokenUser = parseTokenPayload();
      return tokenUser && tokenUser.id && tokenUser.role
        ? (tokenUser as UserInfo)
        : null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    const token = storage.getToken(storageKey.TOKEN);
    return !!token;
  },

  /**
   * Get stored token
   */
  getToken: (): string | null => {
    return storage.getToken(storageKey.TOKEN);
  },
};

export default authService;
