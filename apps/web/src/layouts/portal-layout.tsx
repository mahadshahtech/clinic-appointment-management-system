import type { UserRole } from "@nfc/contracts";
import { CalendarDays, CalendarOff, History, LayoutDashboard, LogOut, Menu, Stethoscope, UserRound, UsersRound } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { AmbientBackground } from "../components/ambient-background";
import { BrandMark } from "../components/brand-mark";
import { useAuth } from "../features/auth/auth-provider";

const configs = {
  PATIENT: { label: "Patient portal", base: "/patient", links: [["", "Dashboard", LayoutDashboard], ["doctors", "Find Doctors", Stethoscope], ["appointments", "Appointments", CalendarDays], ["history", "History", History], ["profile", "Profile", UserRound]] },
  DOCTOR: { label: "Doctor portal", base: "/doctor", links: [["", "Dashboard", LayoutDashboard], ["appointments", "Appointments", CalendarDays], ["schedule", "Schedule", History], ["leave", "Leave", CalendarOff], ["patients", "Patients", UsersRound], ["profile", "Profile", UserRound]] },
  ADMIN: { label: "Administration", base: "/admin", links: [["", "Dashboard", LayoutDashboard], ["doctors", "Doctors", Stethoscope], ["appointments", "Appointments", CalendarDays], ["profile", "Profile", UserRound]] },
} satisfies Record<UserRole, { label: string; base: string; links: Array<[string, string, typeof LayoutDashboard]> }>;

export function PortalLayout({ role }: { role: UserRole }) {
  const { profile, signOut } = useAuth(); const config = configs[role]; const [navigationOpen,setNavigationOpen]=useState(false);
  return <div className="portal-frame"><AmbientBackground /><aside className="portal-sidebar glass-panel"><BrandMark /><div className="portal-label">{config.label}</div><nav>{config.links.map(([path, label, Icon]) => <NavLink key={label} end={!path} to={`${config.base}${path ? `/${path}` : ""}`}><Icon size={19} />{label}</NavLink>)}</nav><button className="portal-signout" onClick={() => void signOut()}><LogOut size={18} />Sign out</button></aside>
    <div className="portal-main"><header className="portal-header"><button className="portal-menu" aria-label={navigationOpen?"Close navigation":"Open navigation"} aria-expanded={navigationOpen} aria-controls="portal-mobile-navigation" onClick={()=>setNavigationOpen(open=>!open)}><Menu /></button><div><span>Good day,</span><strong>{profile?.fullName}</strong></div><div className="profile-avatar">{profile?.fullName.split(" ").map((p) => p[0]).slice(0,2).join("")}</div></header>{navigationOpen&&<><button className="mobile-drawer-backdrop" aria-label="Close navigation" onClick={()=>setNavigationOpen(false)}/><aside className="mobile-portal-drawer glass-panel" id="portal-mobile-navigation"><BrandMark/><div className="portal-label">{config.label}</div><nav>{config.links.map(([path,label,Icon])=><NavLink key={label} end={!path} to={`${config.base}${path?`/${path}`:""}`} onClick={()=>setNavigationOpen(false)}><Icon size={19}/>{label}</NavLink>)}</nav><button className="portal-signout" onClick={()=>void signOut()}><LogOut size={18}/>Sign out</button></aside></>}<main className="portal-content"><Outlet /></main><nav className="mobile-portal-nav" aria-label="Primary portal navigation">{config.links.slice(0,5).map(([path,label,Icon]) => <NavLink key={label} end={!path} to={`${config.base}${path ? `/${path}` : ""}`}><Icon size={19}/><span>{label}</span></NavLink>)}</nav></div>
  </div>;
}
