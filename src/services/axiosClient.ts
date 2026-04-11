import axios, { AxiosError } from "axios";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { storage, storageKey } from "../utils/storage";

const baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

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

    // Handle 401 unauthorized
    if (error?.response?.status === 401 && !isLoginRequest) {
      storage.removeToken(storageKey.TOKEN);
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
