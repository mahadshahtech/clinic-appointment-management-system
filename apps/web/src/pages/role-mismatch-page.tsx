import type { UserRole } from "@nfc/contracts";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/auth-provider";
import { getRoleHome } from "../features/auth/routes";

const names: Record<UserRole, string> = { PATIENT: "Patient Portal", DOCTOR: "Doctor Portal", ADMIN: "Clinic Administration" };
export function RoleMismatchPage() {
  const { profile } = useAuth(); const location = useLocation(); const navigate = useNavigate();
  if (!profile) return <Navigate to="/login" replace />;
  const selectedRole = (location.state as { selectedRole?: UserRole } | null)?.selectedRole;
  if (!selectedRole || selectedRole === profile.role) return <Navigate to={getRoleHome(profile.role)} replace />;
  return <section className="auth-card mismatch-card glass-panel"><div className="auth-icon"><ShieldAlert /></div><p className="auth-kicker">Portal access confirmed</p><h1>This account belongs to the {names[profile.role]}.</h1><p className="auth-intro">You selected {names[selectedRole]}, but your secure clinic profile has different access. Your permissions have not been changed.</p><button className="button button-primary auth-submit" onClick={() => navigate(getRoleHome(profile.role), { replace: true })}>Continue to {names[profile.role]}<ArrowRight size={17} /></button></section>;
}
