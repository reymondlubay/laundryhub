import { isAxiosError } from "axios";
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

export type BackupFolderPathItem = {
  id: string;
  folder_path: string;
  created_at: string;
};

const normalizeFolderPath = (raw: unknown): BackupFolderPathItem => {
  const item = raw as Record<string, unknown>;
  return {
    id: String(item.id ?? ""),
    folder_path: String(item.folder_path ?? item.folderPath ?? ""),
    created_at: String(item.created_at ?? item.createdAt ?? ""),
  };
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
  createBackup: async (
    folderPath?: string,
  ): Promise<{
    skippedFolders?: { path: string; reason: string }[];
  }> => {
    try {
      const { data } = await axiosClient.post(API_ROUTES.BACKUP, {
        folderPath: folderPath?.trim() || undefined,
      });
      const skipped = Array.isArray(data.backup?.skippedFolders)
        ? (data.backup.skippedFolders as { path: string; reason: string }[])
        : undefined;
      return { skippedFolders: skipped };
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const body = err.response?.data as { message?: string } | undefined;
        if (body?.message) {
          throw new Error(body.message);
        }
      }
      throw err instanceof Error ? err : new Error(String(err));
    }
  },

  getBackupFolderPaths: async (): Promise<BackupFolderPathItem[]> => {
    const { data } = await axiosClient.get(API_ROUTES.BACKUP_FOLDER_PATHS);
    const list = Array.isArray(data.folderPaths)
      ? data.folderPaths
      : Array.isArray(data.data)
        ? data.data
        : [];
    return list.map(normalizeFolderPath);
  },

  addBackupFolderPath: async (
    folderPath: string,
  ): Promise<BackupFolderPathItem> => {
    const { data } = await axiosClient.post(API_ROUTES.BACKUP_FOLDER_PATHS, {
      folderPath,
    });
    return normalizeFolderPath(data.folderPath ?? data.data);
  },

  updateBackupFolderPath: async (
    id: string,
    folderPath: string,
  ): Promise<BackupFolderPathItem> => {
    const { data } = await axiosClient.put(
      `${API_ROUTES.BACKUP_FOLDER_PATHS}/${id}`,
      { folderPath },
    );
    return normalizeFolderPath(data.folderPath ?? data.data);
  },

  deleteBackupFolderPath: async (id: string): Promise<void> => {
    await axiosClient.delete(`${API_ROUTES.BACKUP_FOLDER_PATHS}/${id}`);
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

  downloadBackup: async (id: string, filename: string): Promise<void> => {
    const response = await axiosClient.get(`${API_ROUTES.BACKUP}/${id}/download`, {
      responseType: "blob",
    });
    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "backup.sql";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  uploadBackup: async (file: File, folderPath?: string): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file);

    const normalizedPath = folderPath?.trim();
    if (normalizedPath) {
      formData.append("folderPath", normalizedPath);
    }

    await axiosClient.post(API_ROUTES.BACKUP_UPLOAD, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};

export default backupService;
