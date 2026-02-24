import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  // Consider both Supabase `token` and legacy/firebase `user` presence as authenticated.
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");

  return token || user ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;
 