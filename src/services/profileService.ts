import axiosClient from "./axiosClient";
import API_ROUTES from "../constants/apiRoutes";
import { API_ERRORS } from "../constants/messages";
import authService, { type UserInfo } from "./authService";
import { storage, storageKey } from "../utils/storage";

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const profileService = {
  update: async (payload: UpdateProfilePayload): Promise<UserInfo> => {
    try {
      const { data } = await axiosClient.put<{
        user: UserInfo;
        token?: string;
      }>(API_ROUTES.PROFILE, payload);

      if (data.token) {
        storage.setToken(data.token, storageKey.TOKEN);
      }

      if (data.user) {
        const raw = data.user as UserInfo & {
          firstname?: string;
          lastname?: string;
        };
        const withNames: UserInfo = {
          ...raw,
          firstName: raw.firstName || raw.firstname || payload.firstName || "",
          lastName: raw.lastName || raw.lastname || payload.lastName || "",
        };
        const normalizedUser = authService.normalizeStoredUser(withNames);
        localStorage.setItem("user", JSON.stringify(normalizedUser));
        window.dispatchEvent(new CustomEvent("auth-user-updated"));
        return normalizedUser;
      }

      throw new Error(API_ERRORS.UPDATE_PROFILE_FAILED);
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || API_ERRORS.UPDATE_PROFILE_FAILED
          : API_ERRORS.UPDATE_PROFILE_FAILED;
      throw new Error(message);
    }
  },
};

export default profileService;
