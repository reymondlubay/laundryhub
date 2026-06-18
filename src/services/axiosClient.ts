import axios, { AxiosError } from "axios";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { notifyNetworkFailure } from "../utils/backendNetworkHandler";
import { storage, storageKey } from "../utils/storage";

const SESSION_INVALIDATED_CODE = "session_invalidated";

const baseURL = import.meta.env.VITE_API_BASE_URL;

if (!baseURL) {
  throw new Error(
    "Missing VITE_API_BASE_URL. Set it in frontend .env (e.g. VITE_API_BASE_URL=/api).",
  );
}

const axiosClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to attach token
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = storage.getToken(storageKey.TOKEN);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// Add response interceptor for error handling
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const requestUrl = error.config?.url ?? "";
    const isLoginRequest = requestUrl.includes("/login");
    const responseData = error.response?.data as { code?: string } | undefined;

    // Handle 401 unauthorized
    if (error?.response?.status === 401 && !isLoginRequest) {
      storage.removeToken(storageKey.TOKEN);
      localStorage.removeItem("user");
      if (responseData?.code === SESSION_INVALIDATED_CODE) {
        sessionStorage.setItem("auth_logout_reason", SESSION_INVALIDATED_CODE);
      }
      window.location.href = "/login";
    }

    if (!error.response && !isLoginRequest) {
      notifyNetworkFailure();
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
