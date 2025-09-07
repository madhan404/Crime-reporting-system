import axios from "axios";

// Use VITE_API_URL in production, /api proxy in development
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://crime-reporting-system-rm5f.onrender.com/api";

// Debug logging
console.log("API Base URL:", API_BASE_URL);
console.log("Environment:", import.meta.env.MODE);
console.log("VITE_API_URL:", import.meta.env.VITE_API_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});


// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

// Utility function to get the correct API base URL
export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || "https://crime-reporting-system-rm5f.onrender.com/api";
};

export { api };
