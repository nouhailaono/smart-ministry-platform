import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // ⏳ WAIT for auth check
  if (loading) return <h2>Loading...</h2>;

  // ❌ not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}