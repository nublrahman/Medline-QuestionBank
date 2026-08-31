import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface ProtectedRouteProps {
  allowedRole?: "admin" | "student";
}

export function ProtectedRoute({ allowedRole }: ProtectedRouteProps) {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in, but trying to access a route that requires a specific role they don't have
  if (allowedRole && role !== allowedRole) {
    // Redirect them to their appropriate dashboard
    return <Navigate to={`/${role}`} replace />;
  }

  return <Outlet />;
}
