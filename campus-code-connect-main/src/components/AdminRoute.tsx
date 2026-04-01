import { Navigate } from "react-router-dom";

const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const adminToken = localStorage.getItem("adminToken");
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  return adminToken && isAdmin ? children : <Navigate to="/admin/login" />;
};

export default AdminRoute;
