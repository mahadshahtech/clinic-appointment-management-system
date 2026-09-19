import type { AdminAppointmentPage,AdminAppointmentQuery,AdminDashboard,AdminDoctor,CreateDoctorInput,ApiErrorCode, ApiResponse, AppointmentSlotInput, AuthMe, Availability, DoctorAppointment, DoctorLeave, DoctorPatient, DoctorPublic, LeaveInput, PatientAppointment, PatientProfileUpdateInput, RescheduleAppointmentInput, SafeProfile, VisitNote, VisitNoteInput, WorkingHour, WorkingHourInput } from "@nfc/contracts";

import { loadWebEnvironment } from "../config/env";

export class ApiClientError extends Error {
  constructor(public readonly status: number, message: string, public readonly code?: ApiErrorCode) { super(message); this.name = "ApiClientError"; }
}

export function buildApiUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export async function fetchCurrentProfile(accessToken: string): Promise<AuthMe> {
  const { VITE_API_BASE_URL } = loadWebEnvironment();
  const response = await fetch(buildApiUrl(VITE_API_BASE_URL, "auth/me"), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = (await response.json()) as ApiResponse<AuthMe>;
  if (!payload.success) throw new ApiClientError(response.status, payload.error.message, payload.error.code);
  return payload.data;
}

export const profileApi = {
  update: (token: string, input: PatientProfileUpdateInput) => apiRequest<SafeProfile>("auth/profile", token, { method: "PATCH", body: JSON.stringify(input) }),
};

async function apiRequest<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const { VITE_API_BASE_URL } = loadWebEnvironment();
  const response = await fetch(buildApiUrl(VITE_API_BASE_URL, path), {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...init?.headers },
  });
  if (response.status === 204) return undefined as T;
  const payload = (await response.json()) as ApiResponse<T>;
  if (!payload.success) throw new ApiClientError(response.status, payload.error.message, payload.error.code);
  return payload.data;
}

export const schedulingApi = {
  doctors: (token: string, q = "", specialty = "") => {
    const params = new URLSearchParams(); if (q) params.set("q", q); if (specialty) params.set("specialty", specialty);
    return apiRequest<DoctorPublic[]>(`doctors${params.size ? `?${params.toString()}` : ""}`, token);
  },
  doctor: (token: string, id: string) => apiRequest<DoctorPublic>(`doctors/${id}`, token),
  availability: (token: string, id: string, date: string) => apiRequest<Availability>(`doctors/${id}/availability?date=${encodeURIComponent(date)}`, token),
  schedule: (token: string) => apiRequest<WorkingHour[]>("doctor/schedule", token),
  createSchedule: (token: string, input: WorkingHourInput) => apiRequest<WorkingHour>("doctor/schedule", token, { method: "POST", body: JSON.stringify(input) }),
  updateSchedule: (token: string, id: string, input: WorkingHourInput) => apiRequest<WorkingHour>(`doctor/schedule/${id}`, token, { method: "PATCH", body: JSON.stringify(input) }),
  deleteSchedule: (token: string, id: string) => apiRequest<void>(`doctor/schedule/${id}`, token, { method: "DELETE" }),
  leave: (token: string) => apiRequest<DoctorLeave[]>("doctor/leave", token),
  createLeave: (token: string, input: LeaveInput) => apiRequest<DoctorLeave>("doctor/leave", token, { method: "POST", body: JSON.stringify(input) }),
  deleteLeave: (token: string, id: string) => apiRequest<void>(`doctor/leave/${id}`, token, { method: "DELETE" }),
};

export const appointmentApi = {
  list: (token: string) => apiRequest<PatientAppointment[]>("patient/appointments", token),
  get: (token: string, id: string) => apiRequest<PatientAppointment>(`patient/appointments/${id}`, token),
  book: (token: string, input: AppointmentSlotInput) => apiRequest<PatientAppointment>("patient/appointments", token, { method: "POST", body: JSON.stringify(input) }),
  cancel: (token: string, id: string) => apiRequest<PatientAppointment>(`patient/appointments/${id}/cancel`, token, { method: "POST" }),
  reschedule: (token: string, id: string, input: RescheduleAppointmentInput) => apiRequest<PatientAppointment>(`patient/appointments/${id}/reschedule`, token, { method: "POST", body: JSON.stringify(input) }),
  note:(token:string,id:string)=>apiRequest<VisitNote|null>(`patient/appointments/${id}/note`,token),
};
export const doctorAppointmentApi={
  list:(token:string)=>apiRequest<DoctorAppointment[]>("doctor/appointments",token),
  get:(token:string,id:string)=>apiRequest<DoctorAppointment>(`doctor/appointments/${id}`,token),
  confirm:(token:string,id:string)=>apiRequest<DoctorAppointment>(`doctor/appointments/${id}/confirm`,token,{method:"POST"}),
  reject:(token:string,id:string)=>apiRequest<DoctorAppointment>(`doctor/appointments/${id}/reject`,token,{method:"POST"}),
  complete:(token:string,id:string)=>apiRequest<DoctorAppointment>(`doctor/appointments/${id}/complete`,token,{method:"POST"}),
  noShow:(token:string,id:string)=>apiRequest<DoctorAppointment>(`doctor/appointments/${id}/no-show`,token,{method:"POST"}),
  patients:(token:string)=>apiRequest<DoctorPatient[]>("doctor/patients",token),
  patientHistory:(token:string,id:string)=>apiRequest<DoctorAppointment[]>(`doctor/patients/${id}/history`,token),
  note:(token:string,id:string)=>apiRequest<VisitNote|null>(`doctor/appointments/${id}/note`,token),
  createNote:(token:string,id:string,input:VisitNoteInput)=>apiRequest<VisitNote>(`doctor/appointments/${id}/note`,token,{method:"POST",body:JSON.stringify(input)}),
};
export const adminApi={dashboard:(token:string)=>apiRequest<AdminDashboard>("admin/dashboard",token),appointments:(token:string,filters:Partial<AdminAppointmentQuery>)=>{const params=new URLSearchParams();Object.entries(filters).forEach(([key,value])=>{if(value!==undefined&&value!=="")params.set(key,String(value));});return apiRequest<AdminAppointmentPage>(`admin/appointments?${params}`,token);},doctors:(token:string,q?:string)=>apiRequest<AdminDoctor[]>(`admin/doctors${q?`?q=${encodeURIComponent(q)}`:""}`,token),createDoctor:(token:string,input:CreateDoctorInput)=>apiRequest<AdminDoctor>("admin/doctors",token,{method:"POST",body:JSON.stringify(input)}),setDoctorActive:(token:string,id:string,isActive:boolean)=>apiRequest<AdminDoctor>(`admin/doctors/${id}/status`,token,{method:"PATCH",body:JSON.stringify({isActive})})};
