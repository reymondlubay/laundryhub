import { isAxiosError } from "axios";
import axiosClient from "./axiosClient";
import API_ROUTES from "../constants/apiRoutes";

export type HostingStatusValue =
  | "running"
  | "stopped"
  | "starting"
  | "unsupported"
  | "error";

export type HostingStatus = {
  status: HostingStatusValue;
  taskName: string;
  processRunning: boolean;
  taskRunning: boolean;
  autoStartEnabled: boolean;
  enabled: boolean;
  message?: string;
  alreadyRunning?: boolean;
};

const normalizeHosting = (raw: unknown): HostingStatus => {
  const item = (raw ?? {}) as Record<string, unknown>;
  const statusRaw = String(item.status ?? "error");
  const allowed: HostingStatusValue[] = [
    "running",
    "stopped",
    "starting",
    "unsupported",
    "error",
  ];
  const status = (
    allowed.includes(statusRaw as HostingStatusValue)
      ? statusRaw
      : "error"
  ) as HostingStatusValue;

  return {
    status,
    taskName: String(item.taskName ?? ""),
    processRunning: Boolean(item.processRunning),
    taskRunning: Boolean(item.taskRunning),
    autoStartEnabled: Boolean(item.autoStartEnabled),
    enabled: Boolean(item.enabled),
    message:
      typeof item.message === "string" && item.message.trim()
        ? item.message
        : undefined,
    alreadyRunning: Boolean(item.alreadyRunning),
  };
};

const extractHosting = (data: unknown): HostingStatus => {
  const payload = (data ?? {}) as Record<string, unknown>;
  return normalizeHosting(payload.hosting ?? payload);
};

const hostingService = {
  async getStatus(): Promise<HostingStatus> {
    const response = await axiosClient.get(API_ROUTES.HOSTING_STATUS);
    return extractHosting(response.data);
  },

  async start(): Promise<HostingStatus> {
    try {
      const response = await axiosClient.post(API_ROUTES.HOSTING_START);
      return extractHosting(response.data);
    } catch (error) {
      if (isAxiosError(error) && error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        if (data.hosting) {
          return extractHosting(data);
        }
        const message =
          typeof data.message === "string"
            ? data.message
            : "Failed to start hosting.";
        return {
          status: "error",
          taskName: "",
          processRunning: false,
          taskRunning: false,
          autoStartEnabled: false,
          enabled: true,
          message,
        };
      }
      throw error;
    }
  },
};

export default hostingService;
