import axiosClient from "./axiosClient";
import API_ROUTES from "../constants/apiRoutes";
import { API_ERRORS } from "../constants/messages";
import { USER_ROLE_EMPLOYEE, type UserRoleValue } from "../constants/roles";
import { USER_STATUS_ACTIVE, type UserStatusValue } from "../constants/status";

export type UserRole = UserRoleValue;
export type UserStatus = UserStatusValue;

export interface UserItem {
  id: string;
  firstName: string;
  lastName: string;
  userName: string;
  mobileNumber: string;
  role: UserRole;
  status: UserStatus;
  dateHired: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  userName: string;
  mobileNumber?: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  dateHired: string;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  userName?: string;
  mobileNumber?: string | null;
  password?: string;
  role?: UserRole;
  status?: UserStatus;
  dateHired?: string;
}

const normalizeUser = (raw: unknown): UserItem => {
  const item = raw as Record<string, unknown>;

  return {
    id: String(item.id ?? ""),
    firstName: String(item.firstName ?? item.firstname ?? ""),
    lastName: String(item.lastName ?? item.lastname ?? ""),
    userName: String(item.userName ?? item.username ?? ""),
    mobileNumber: String(item.mobileNumber ?? item.mobilenumber ?? ""),
    role: String(item.role ?? USER_ROLE_EMPLOYEE) as UserRole,
    status: String(item.status ?? USER_STATUS_ACTIVE) as UserStatus,
    dateHired: String(item.dateHired ?? item.datehired ?? ""),
    createdAt: String(item.createdAt ?? item.createdat ?? ""),
    updatedAt: String(item.updatedAt ?? item.updatedat ?? ""),
  };
};

const userService = {
  getAll: async (): Promise<UserItem[]> => {
    try {
      const { data } = await axiosClient.get(API_ROUTES.USERS);
      const users = Array.isArray(data.users) ? data.users : [];
      return users.map(normalizeUser);
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || API_ERRORS.FETCH_USERS_FAILED
          : API_ERRORS.FETCH_USERS_FAILED;
      throw new Error(message);
    }
  },

  create: async (payload: CreateUserPayload): Promise<UserItem> => {
    try {
      const { data } = await axiosClient.post(API_ROUTES.USERS, payload);
      return normalizeUser(data.user);
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || API_ERRORS.CREATE_USER_FAILED
          : API_ERRORS.CREATE_USER_FAILED;
      throw new Error(message);
    }
  },

  update: async (id: string, payload: UpdateUserPayload): Promise<UserItem> => {
    try {
      const { data } = await axiosClient.put(
        `${API_ROUTES.USERS}/${id}`,
        payload,
      );
      return normalizeUser(data.user);
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || API_ERRORS.UPDATE_USER_FAILED
          : API_ERRORS.UPDATE_USER_FAILED;
      throw new Error(message);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await axiosClient.delete(`${API_ROUTES.USERS}/${id}`);
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || API_ERRORS.DELETE_USER_FAILED
          : API_ERRORS.DELETE_USER_FAILED;
      throw new Error(message);
    }
  },
};

export default userService;
