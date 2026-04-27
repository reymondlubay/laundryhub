import axiosClient from "./axiosClient";
import API_ROUTES from "../constants/apiRoutes";

export type AuditLogItem = {
  id: string;
  module: string;
  entityId: string | null;
  fieldName: string;
  originalValue: string | null;
  newValue: string | null;
  changedAt: string;
  userId: string | null;
  userName: string;
};

export type AuditLogListResponse = {
  logs: AuditLogItem[];
  total: number;
  limit: number;
  offset: number;
};

export type AuditLogSettings = {
  auditLoggingEnabled: boolean;
};

const auditLogService = {
  getSettings: async (): Promise<AuditLogSettings> => {
    const { data } = await axiosClient.get<
      AuditLogSettings & { status?: string }
    >(API_ROUTES.AUDIT_LOG_SETTINGS);
    return { auditLoggingEnabled: Boolean(data.auditLoggingEnabled) };
  },

  updateSettings: async (
    body: AuditLogSettings,
  ): Promise<AuditLogSettings> => {
    const { data } = await axiosClient.patch<
      AuditLogSettings & { status?: string }
    >(API_ROUTES.AUDIT_LOG_SETTINGS, body);
    return { auditLoggingEnabled: Boolean(data.auditLoggingEnabled) };
  },

  getList: async (params: {
    limit?: number;
    offset?: number;
    module?: string;
  }): Promise<AuditLogListResponse> => {
    const { data } = await axiosClient.get<
      AuditLogListResponse & { status?: string }
    >(API_ROUTES.AUDIT_LOGS, { params });
    return {
      logs: data.logs,
      total: data.total,
      limit: data.limit,
      offset: data.offset,
    };
  },
};

export default auditLogService;
