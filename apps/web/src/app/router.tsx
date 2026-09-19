import type { UserRole } from "@nfc/contracts";
import type { ReactNode } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";
import { AuthenticatedRoute, ProtectedRoute, PublicLandingRoute, PublicOnlyRoute } from "../features/auth/route-guards";
import { AuthLayout } from "../layouts/auth-layout";
import { PortalLayout } from "../layouts/portal-layout";
import { PublicLayout } from "../layouts/public-layout";
import { HomePage } from "../pages/home-page";
import { LoginPage } from "../pages/login-page";
import { SignupPage } from "../pages/signup-page";
import { DoctorDirectoryPage } from "../pages/doctor-directory-page";
import { DoctorDetailsPage } from "../pages/doctor-details-page";
import { DoctorSchedulePage } from "../pages/doctor-schedule-page";
import { DoctorLeavePage } from "../pages/doctor-leave-page";
import { PatientAppointmentsPage } from "../pages/patient-appointments-page";
import { DoctorAppointmentsPage } from "../pages/doctor-appointments-page";
import { DoctorPatientsPage } from "../pages/doctor-patients-page";
import { DoctorDashboardPage } from "../pages/doctor-dashboard-page";
import { AdminDashboardPage } from "../pages/admin-dashboard-page";
import { AdminAppointmentsPage } from "../pages/admin-appointments-page";
import { AdminDoctorsPage } from "../pages/admin-doctors-page";
import { SetPasswordPage } from "../pages/set-password-page";
import { PatientDashboardPage } from "../pages/patient-dashboard-page";
import { PatientProfilePage } from "../pages/patient-profile-page";
import { AccountProfilePage } from "../pages/account-profile-page";
import { RoleMismatchPage } from "../pages/role-mismatch-page";

function portal(role: UserRole, path: string, index: ReactNode, children: Array<{ path: string; element: ReactNode }>) {
  return { element: <ProtectedRoute role={role} />, children: [{ path, element: <PortalLayout role={role} />, children: [{ index: true, element: index }, ...children] }] };
}

export const appRoutes = [
  { element: <PublicLandingRoute />, children: [{ element: <PublicLayout />, children: [{ path: "/", element: <HomePage /> }] }] },
  { element: <PublicOnlyRoute />, children: [{ element: <AuthLayout />, children: [{ path: "/login", element: <LoginPage /> }, { path: "/signup", element: <SignupPage /> }] }] },
  { element: <AuthLayout />, children: [{ path: "/auth/set-password", element: <SetPasswordPage /> }] },
  { element: <AuthenticatedRoute />, children: [{ element: <AuthLayout />, children: [{ path: "/auth/portal-mismatch", element: <RoleMismatchPage /> }] }] },
  portal("PATIENT", "/patient", <PatientDashboardPage/>, [{ path: "doctors", element: <DoctorDirectoryPage /> }, { path: "doctors/:id", element: <DoctorDetailsPage /> }, { path:"appointments", element:<PatientAppointmentsPage/> }, { path:"history", element:<PatientAppointmentsPage historyOnly/> }, {path:"profile",element:<PatientProfilePage/>}]),
  portal("DOCTOR", "/doctor", <DoctorDashboardPage/>, [{path:"appointments",element:<DoctorAppointmentsPage/>},{path:"schedule",element:<DoctorSchedulePage/>},{path:"leave",element:<DoctorLeavePage/>},{path:"patients",element:<DoctorPatientsPage/>},{path:"profile",element:<AccountProfilePage/>}]),
  portal("ADMIN", "/admin", <AdminDashboardPage/>, [{path:"doctors",element:<AdminDoctorsPage/>},{path:"appointments",element:<AdminAppointmentsPage/>},{path:"profile",element:<AccountProfilePage/>}]),
  { path: "*", element: <Navigate to="/" replace /> },
];

export const router = createBrowserRouter(appRoutes);
