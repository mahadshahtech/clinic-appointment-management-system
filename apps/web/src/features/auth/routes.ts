import type { UserRole } from "@nfc/contracts";

export const roleHome: Record<UserRole, string> = { PATIENT: "/patient", DOCTOR: "/doctor", ADMIN: "/admin" };
export function getRoleHome(role: UserRole) { return roleHome[role]; }
export function canAccessPortal(role: UserRole, pathname: string) { return pathname === roleHome[role] || pathname.startsWith(`${roleHome[role]}/`); }
