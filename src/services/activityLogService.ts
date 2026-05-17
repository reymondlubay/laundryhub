import axiosClient from "./axiosClient";
import API_ROUTES from "../constants/apiRoutes";

export interface ActivityLogEntry {
  id: string;
  createdAt: string;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  action: string;
  module: string;
  summary: string;
}

export interface ActivityLogListParams {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  module?: string;
  action?: string;
  search?: string;
}

export interface ActivityLogListResponse {
  items: ActivityLogEntry[];
  total: number;
  page: number;
  limit: number;
}

const normalizeEntry = (raw: unknown): ActivityLogEntry => {
  const row = raw as Record<string, unknown>;
  return {
    id: String(row.id ?? ""),
    createdAt: String(row.createdAt ?? row.created_at ?? ""),
    userId: row.userId != null ? String(row.userId) : null,
    userName: row.userName != null ? String(row.userName) : null,
    userRole: row.userRole != null ? String(row.userRole) : null,
    action: String(row.action ?? ""),
    module: String(row.module ?? ""),
    summary: String(row.summary ?? ""),
  };
};

const activityLogService = {
  async list(
    params: ActivityLogListParams = {},
  ): Promise<ActivityLogListResponse> {
    const response = await axiosClient.get(API_ROUTES.ACTIVITY_LOGS, { params });
    const data = response.data as Record<string, unknown>;
    const items = Array.isArray(data.items)
      ? data.items.map(normalizeEntry)
      : [];
    return {
      items,
      total: Number(data.total ?? 0),
      page: Number(data.page ?? 1),
      limit: Number(data.limit ?? 25),
    };
  },

  async getSettings(): Promise<{ enabled: boolean }> {
    const response = await axiosClient.get(API_ROUTES.ACTIVITY_LOG_SETTINGS);
    const data = response.data as { enabled?: boolean };
    return { enabled: Boolean(data.enabled) };
  },

  async updateSettings(enabled: boolean): Promise<{ enabled: boolean }> {
    const response = await axiosClient.patch(API_ROUTES.ACTIVITY_LOG_SETTINGS, {
      enabled,
    });
    const data = response.data as { enabled?: boolean };
    return { enabled: Boolean(data.enabled) };
  },

  async cleanup(): Promise<{ deletedCount: number }> {
    const response = await axiosClient.post(API_ROUTES.ACTIVITY_LOG_CLEANUP);
    const data = response.data as { deletedCount?: number };
    return { deletedCount: Number(data.deletedCount ?? 0) };
  },
};

export default activityLogService;
