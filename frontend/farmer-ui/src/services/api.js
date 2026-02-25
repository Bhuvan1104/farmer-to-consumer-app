import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
});

function resolveToken(raw) {
  if (!raw) return null;
  if (typeof raw !== "string") return String(raw);

  if (raw.trim().startsWith("{") || raw.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      return parsed?.access || parsed?.token || null;
    } catch {
      return raw;
    }
  }

  return raw;
}

/* ============================
   REQUEST INTERCEPTOR
============================ */

API.interceptors.request.use((config) => {
  const raw = localStorage.getItem("access_token");
  const access = resolveToken(raw);

  if (access) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${access}`;
  }

  return config;
});

/* ============================
   RESPONSE INTERCEPTOR
============================ */

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If not 401 or already retried → reject
    if (
      !error.response ||
      error.response.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url.includes("token/refresh")
    ) {
      return Promise.reject(error);
    }

    const refreshRaw = localStorage.getItem("refresh_token");
    const refresh = resolveToken(refreshRaw);

    if (!refresh) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return API(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(
        "http://127.0.0.1:8000/api/token/refresh/",
        { refresh }
      );

      const newAccess = data.access;

      if (!newAccess) throw new Error("Invalid refresh response");

      localStorage.setItem("access_token", newAccess);

      processQueue(null, newAccess);

      originalRequest.headers.Authorization = `Bearer ${newAccess}`;

      return API(originalRequest);
    } catch (err) {
      processQueue(err, null);

      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      window.location.href = "/login";

      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default API;