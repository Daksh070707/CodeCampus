import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

/* Attach token automatically */
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;

// NOTE: After migrating to Supabase, prefer using `supabase` client from `src/lib/supabase` for auth
