import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui";

export default function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, token, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Checking session…" />;
  if (!token || !user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (adminOnly && !isAdmin)
    return (
      <div className="card p-10 text-center">
        <p className="text-base font-semibold text-slate-800">Access denied</p>
        <p className="mt-1 text-sm text-slate-500">
          You do not have permission to view this page. Admins only.
        </p>
      </div>
    );
  return <Outlet />;
}
