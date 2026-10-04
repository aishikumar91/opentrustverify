import { Navigate, Outlet, useLocation } from "react-router-dom";
import { SkeletonPreloader } from "@/components/SkeletonPreloader";
import { useAuth } from "@/lib/auth";

export function RequireAuth() {
  const { ready, user } = useAuth();
  const location = useLocation();
  if (!ready) return <SkeletonPreloader />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
