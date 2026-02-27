import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const API = axios.create({
  baseURL: API_BASE_URL,
});

console.log("API configured with baseURL:", API_BASE_URL);

/* Attach token automatically */
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
    console.log("Sending request with auth token");
  } else {
    console.warn("No auth token found in localStorage");
  }
  return req;
});

/* Log responses and errors */
API.interceptors.response.use(
  (res) => {
    console.log("API response:", res.status, res.config.url, res.data);
    return res;
  },
  (err) => {
    console.error("API error:", err.response?.status, err.response?.data?.message, err.config?.url);
    return Promise.reject(err);
  }
);

export default API;

// NOTE: After migrating to Supabase, prefer using `supabase` client from `src/lib/supabase` for auth
