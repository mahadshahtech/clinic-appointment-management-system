import type { UserRole } from "@nfc/contracts";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./auth-provider";
import { getRoleHome } from "./routes";

export function LoadingGate() { return <div className="auth-loading"><span className="loading-mark" /> <p>Preparing your secure clinic space…</p></div>; }

export function PublicLandingRoute() {
  const { loading, role } = useAuth();
  if (loading) return <LoadingGate />;
  return role ? <Navigate to={getRoleHome(role)} replace /> : <Outlet />;
}

export function PublicOnlyRoute() {
  const { loading, role } = useAuth();
  if (loading) return <LoadingGate />;
  return role ? <Navigate to={getRoleHome(role)} replace /> : <Outlet />;
}

export function AuthenticatedRoute() {
  const auth = useAuth();
  const location = useLocation();
  if (auth.loading) return <LoadingGate />;
  if (!auth.session || !auth.profile) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function ProtectedRoute({ role }: { role: UserRole }) {
  const auth = useAuth();
  const location = useLocation();
  if (auth.loading) return <LoadingGate />;
  if (!auth.session || !auth.profile) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (auth.role !== role) return <Navigate to={getRoleHome(auth.profile.role)} replace />;
  return <Outlet />;
}
