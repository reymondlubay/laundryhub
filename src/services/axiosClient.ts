import axios from "axios";
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
  (config) => {
    const token = storage.getToken(storageKey.TOKEN);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Add response interceptor for error handling
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 unauthorized
    if (error?.response?.status === 401) {
      storage.removeToken(storageKey.TOKEN);
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
