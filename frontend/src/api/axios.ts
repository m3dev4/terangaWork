import axios from "axios";

// URL de l'API : VITE_API_URL au build (Docker, production), sinon le backend local.
const BASE_URL: string =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api/";

export const instance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

const PUBLIC_ENDPOINTS = [
  "auth/login/",
  "auth/register/",
  "auth/verify-email/",
  "auth/password-recovery/",
  "auth/new-password/",
  "auth/token/refresh/",
];

instance.interceptors.request.use((config) => {
  const isPublic = PUBLIC_ENDPOINTS.some((endpoint) =>
    config.url?.includes(endpoint)
  );

  const accessToken = localStorage.getItem("access_token");

  if (accessToken && !isPublic) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  } else if (isPublic && config.headers.Authorization) {
    delete config.headers.Authorization;
  }

  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh on auth endpoints
    const isPublic = PUBLIC_ENDPOINTS.some((endpoint) =>
      originalRequest?.url?.includes(endpoint)
    );

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !isPublic
    ) {
      const refreshToken = localStorage.getItem("refresh_token");

      if (!refreshToken) {
        // No refresh token available, remove stale tokens to avoid deadlocks
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return instance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${BASE_URL}auth/token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = response.data.access;
        localStorage.setItem("access_token", newAccessToken);

        if (response.data.refresh) {
          localStorage.setItem("refresh_token", response.data.refresh);
        }

        instance.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return instance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Refresh failed: clear invalid tokens completely
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
