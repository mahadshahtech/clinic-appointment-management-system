import { Link, Outlet } from "react-router-dom";
import { AmbientBackground } from "../components/ambient-background";
import { BrandMark } from "../components/brand-mark";

export function AuthLayout() {
  return <div className="auth-page"><AmbientBackground /><Link className="auth-brand" to="/"><BrandMark /></Link><div className="auth-stage"><Outlet /></div></div>;
}
