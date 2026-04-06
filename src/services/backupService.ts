import axiosClient from "./axiosClient";
import API_ROUTES from "../constants/apiRoutes";

export type BackupStatus = "Pending" | "Success" | "Failed";

export type BackupItem = {
  id: string;
  filename: string;
  filepath: string;
  size: number;
  status: BackupStatus;
  error_message?: string | null;
  created_at: string;
};

const normalizeBackup = (raw: unknown): BackupItem => {
  const item = raw as Record<string, unknown>;
  return {
    id: String(item.id ?? ""),
    filename: String(item.filename ?? ""),
    filepath: String(item.filepath ?? ""),
    size: Number(item.size ?? 0),
    status: String(item.status ?? "Pending") as BackupStatus,
    error_message: String(item.error_message ?? "") || null,
    created_at: String(item.created_at ?? item.createdAt ?? ""),
  };
};

const backupService = {
  createBackup: async (): Promise<void> => {
    await axiosClient.post(API_ROUTES.BACKUP);
  },

  getBackups: async (): Promise<BackupItem[]> => {
    const { data } = await axiosClient.get(API_ROUTES.BACKUPS);
    const backups = Array.isArray(data.backups)
      ? data.backups
      : Array.isArray(data.data)
        ? data.data
        : [];
    return backups.map(normalizeBackup);
  },

  restoreBackup: async (id: string): Promise<void> => {
    await axiosClient.post(`${API_ROUTES.RESTORE}/${id}`);
  },

  deleteBackup: async (id: string): Promise<void> => {
    await axiosClient.delete(`${API_ROUTES.BACKUP}/${id}`);
  },
};

export default backupService;
