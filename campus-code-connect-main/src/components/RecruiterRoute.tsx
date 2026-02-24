import { Navigate } from "react-router-dom";

const RecruiterRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) return <Navigate to="/login" />;
  if (role !== "recruiter") return <Navigate to="/dashboard/feed" />;

  return children;
};

export default RecruiterRoute;
